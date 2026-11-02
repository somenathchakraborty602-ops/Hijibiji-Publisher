import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, order_amount, customer_name, customer_phone, customer_email } = body;

    if (!order_id || !order_amount) {
      return NextResponse.json(
        { error: 'অর্ডার আইডি এবং টাকার পরিমাণ আবশ্যক।' },
        { status: 400 }
      );
    }

    // Call Supabase Edge Function from server-side (Bypasses any browser CORS or file:// restriction)
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/create-cashfree-order`;

    let edgeResponse: Response | null = null;
    let edgeData: any = null;
    let edgeSuccess = false;

    try {
      edgeResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          order_id,
          order_amount: Math.round(order_amount),
          customer_name: customer_name || 'Customer',
          customer_phone: customer_phone || '9999999999',
          customer_email: customer_email || 'customer@hijibijipublishers.com',
        }),
      });

      if (edgeResponse.ok) {
        edgeData = await edgeResponse.json();
        if (edgeData && (edgeData.payment_session_id || edgeData.paymentSessionId)) {
          edgeSuccess = true;
        }
      } else {
        const errText = await edgeResponse.text();
        console.warn('Supabase Edge function responded with status:', edgeResponse.status, errText);
      }
    } catch (edgeErr: any) {
      console.warn('Could not reach Supabase Edge Function directly:', edgeErr?.message);
    }

    if (edgeSuccess && edgeData) {
      return NextResponse.json({
        success: true,
        payment_session_id: edgeData.payment_session_id || edgeData.paymentSessionId,
        order_id: edgeData.order_id || order_id,
        source: 'supabase_edge',
      });
    }

    // Direct Cashfree API call if Cashfree credentials are set in environment
    const cashfreeAppId = process.env.CASHFREE_APP_ID;
    const cashfreeSecret = process.env.CASHFREE_SECRET_KEY;
    const cashfreeEnv = process.env.CASHFREE_ENV || 'production'; // or 'sandbox'

    if (cashfreeAppId && cashfreeSecret) {
      const cfBaseUrl =
        cashfreeEnv === 'sandbox'
          ? 'https://sandbox.cashfree.com/pg'
          : 'https://api.cashfree.com/pg';

      const cfRes = await fetch(`${cfBaseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': cashfreeAppId,
          'x-client-secret': cashfreeSecret,
        },
        body: JSON.stringify({
          order_id: `HB_${order_id}_${Date.now()}`,
          order_amount: Math.round(order_amount),
          order_currency: 'INR',
          customer_details: {
            customer_id: `CUST_${(customer_phone || 'guest').replace(/\D/g, '') || '01'}`,
            customer_name: customer_name || 'Customer',
            customer_phone: customer_phone || '9999999999',
            customer_email: customer_email || 'contact@hijibijipublishers.com',
          },
          order_meta: {
            return_url: `${process.env.APP_URL || 'https://hijibijipublishers.com'}/?order_id=${order_id}`,
          },
        }),
      });

      if (cfRes.ok) {
        const cfData = await cfRes.json();
        return NextResponse.json({
          success: true,
          payment_session_id: cfData.payment_session_id,
          order_id: cfData.order_id,
          source: 'direct_cashfree',
        });
      }
    }

    // If edge function returned data but no session, or failed, give clear diagnostic response
    return NextResponse.json(
      {
        success: false,
        payment_session_id: null,
        error:
          'Supabase Edge Function (create-cashfree-order) সংযোগ পাওয়া যায়নি অথবা ক্যাশফ্রি লাইভ ক্রেডেনশিয়াল পেন্ডিং রয়েছে।',
        details: edgeData || 'Edge function call failed',
        simulated_allowed: true, // Allows smooth testing in preview environment
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error creating cashfree order:', error);
    return NextResponse.json(
      { error: error?.message || 'পেমেন্ট সেশন তৈরিতে সমস্যা দেখা দিয়েছে।' },
      { status: 500 }
    );
  }
}
