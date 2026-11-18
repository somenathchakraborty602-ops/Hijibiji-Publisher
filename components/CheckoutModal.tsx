'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  Phone,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItemsSummary: string;
  totalAmount: number;
  onOrderSuccess: (orderId: string, itemsSummary: string, amount: number) => void;
}

declare global {
  interface Window {
    Cashfree?: (config: { mode: 'production' | 'sandbox' }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget: '_blank' | '_self' | '_top' | '_modal';
      }) => Promise<any>;
    };
  }
}

async function ensureCashfreeSdkLoaded(): Promise<NonNullable<Window['Cashfree']>> {
  if (typeof window === 'undefined') {
    throw new Error('Browser environment required');
  }
  if (window.Cashfree) {
    return window.Cashfree;
  }
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]'
    );
    if (existing) {
      const check = () => {
        if (window.Cashfree) resolve();
        else setTimeout(check, 100);
      };
      setTimeout(check, 100);
      setTimeout(() => reject(new Error('Cashfree SDK load timeout')), 8000);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) resolve();
      else reject(new Error('Cashfree SDK did not initialize'));
    };
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });
  if (!window.Cashfree) {
    throw new Error('Cashfree SDK unavailable');
  }
  return window.Cashfree;
}

export function CheckoutModal({
  isOpen,
  onClose,
  orderItemsSummary,
  totalAmount,
  onOrderSuccess,
}: CheckoutModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openedSession, setOpenedSession] = useState<{
    orderId: string;
    paymentSessionId: string;
  } | null>(null);

  if (!isOpen) return null;

  const openCashfreeTab = async (paymentSessionId: string) => {
    const CashfreeFactory = await ensureCashfreeSdkLoaded();
    const cashfree = CashfreeFactory({ mode: 'production' });
    cashfree.checkout({
      paymentSessionId,
      redirectTarget: '_blank',
    });
  };

  const handleCloseModal = () => {
    setOpenedSession(null);
    setErrorMsg(null);
    setStatusMessage(null);
    setLoading(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    setStatusMessage('অর্ডার সুপাবেস ডেটাবেসে সংরক্ষণ হচ্ছে...');

    const cleanPhone = phone.replace(/\D/g, '').slice(-10) || phone.trim();
    const fullAddress = `${address.trim()}, পিন: ${pin.trim()}`;
    const payableAmount = Math.max(1, Math.round(totalAmount));

    try {
      // 1. Save the order in the Supabase 'orders' table (with status 'PENDING')
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_name: name.trim(),
          customer_phone: cleanPhone,
          shipping_address: fullAddress,
          total_amount: payableAmount,
          order_items: orderItemsSummary,
          payment_status: 'PENDING',
        })
        .select()
        .single();

      if (orderErr || !orderData?.id) {
        throw new Error(
          orderErr?.message || 'সুপাবেস orders টেবিলে অর্ডার সংরক্ষণ করা যায়নি।'
        );
      }

      const createdOrderId = orderData.id;
      setStatusMessage('ক্যাশফ্রি পেমেন্ট সেশন তৈরি হচ্ছে...');

      // 2. Call Next.js server-side proxy -> `${SUPABASE_URL}/functions/v1/create-cashfree-order`
      const payload = {
        order_id: createdOrderId,
        order_amount: payableAmount,
        customer_name: name.trim(),
        customer_phone: cleanPhone,
      };

      let resData: any = null;
      try {
        const res = await fetch('/api/create-cashfree-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        resData = await res.json();
      } catch (proxyErr) {
        console.warn('Proxy call failed, trying Supabase Edge Function directly:', proxyErr);
      }

      // Direct Edge Function fallback if proxy did not return payment_session_id
      if (!resData?.payment_session_id) {
        const edgeRes = await fetch(`${SUPABASE_URL}/functions/v1/create-cashfree-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(payload),
        });
        const edgeJson = await edgeRes.json().catch(() => null);
        if (edgeJson?.payment_session_id) {
          resData = edgeJson;
        } else if (!resData?.error && edgeJson?.error) {
          resData = edgeJson;
        }
      }

      if (!resData || !resData.payment_session_id) {
        throw new Error(
          resData?.error ||
            resData?.details?.message ||
            'ক্যাশফ্রি পেমেন্ট সেশন (payment_session_id) পাওয়া যায়নি।'
        );
      }

      if (resData.order_id && resData.order_id !== createdOrderId) {
        await supabase
          .from('orders')
          .update({ cashfree_order_id: String(resData.order_id) })
          .eq('id', createdOrderId);
      }

      // 3. Open Cashfree checkout in a new tab
      setStatusMessage('নতুন ট্যাবে ক্যাশফ্রি পেমেন্ট খোলা হচ্ছে...');
      await openCashfreeTab(resData.payment_session_id);

      setOpenedSession({
        orderId: createdOrderId,
        paymentSessionId: resData.payment_session_id,
      });
      setLoading(false);
      setStatusMessage(null);
    } catch (err: any) {
      console.error('Order error:', err);
      setErrorMsg(
        err?.message || 'অর্ডার প্রক্রিয়া করতে ত্রুটি দেখা দিয়েছে। দয়া করে পুনরায় চেষ্টা করুন।'
      );
      setLoading(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={loading ? undefined : handleCloseModal}
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-7 border border-stone-100 z-10">
          {/* Header */}
          <div className="flex justify-between items-start pb-3 border-b border-stone-100 mb-4">
            <div>
              <h3 className="text-lg font-bold font-serif-bn text-stone-900">
                {openedSession ? 'পেমেন্ট ট্যাব খোলা হয়েছে' : 'ডেলিভারি ও যোগাযোগের ঠিকানা'}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {openedSession
                  ? 'নতুন ট্যাবে ক্যাশফ্রি পেমেন্ট সম্পন্ন করুন'
                  : 'বই দ্রুততম সময়ে পৌঁছানোর জন্য সঠিক নাম, মোবাইল ও ঠিকানা দিন'}
              </p>
            </div>
            {!loading && (
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition cursor-pointer"
                aria-label="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {openedSession ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-stone-900">
                  অর্ডার নম্বর #{openedSession.orderId.slice(0, 8).toUpperCase()} সংরক্ষিত হয়েছে (PENDING)
                </p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  ক্যাশফ্রি পেমেন্ট গেটওয়ে একটি নতুন ব্রাউজার ট্যাবে খোলা হয়েছে। পেমেন্ট সম্পন্ন না হলে নিচের বাটনে ক্লিক করে পুনরায় খুলুন।
                </p>
              </div>

              <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/60 text-xs flex justify-between items-center">
                <span className="text-stone-600">প্রদেয় মোট অঙ্ক:</span>
                <span className="font-bold font-serif-bn text-emerald-950 text-base">
                  ₹{Math.round(totalAmount)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => openCashfreeTab(openedSession.paymentSessionId)}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                >
                  <ExternalLink className="w-4 h-4 text-amber-300" />
                  <span>পেমেন্ট পেজ খুলুন</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold py-3 rounded-xl transition cursor-pointer text-xs sm:text-sm"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  আপনার পুরো নাম *
                </label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: সৌমেন রায়"
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 pl-9 text-sm focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none transition"
                    disabled={loading}
                  />
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    ফোন / হোয়াটসঅ্যাপ নম্বর *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="১০ সংখ্যার মোবাইল নম্বর"
                      className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 pl-9 text-sm focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none transition"
                      disabled={loading}
                    />
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    পিনকোড (PIN Code) *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="যেমন: 700057"
                      className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 pl-9 text-sm focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none transition"
                      disabled={loading}
                    />
                    <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  সম্পূর্ণ ঠিকানা ও ল্যান্ডমার্ক *
                </label>
                <textarea
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="বাড়ি নং, রাস্তা, এলাকা, নিকটবর্তী ল্যান্ডমার্ক ও শহর"
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none transition"
                  disabled={loading}
                />
              </div>

              {/* Order Items Review & Total Amount */}
              <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/60 space-y-2">
                <div className="flex justify-between items-start text-xs text-stone-600">
                  <span className="font-semibold text-stone-700">বই / সংস্করণ:</span>
                  <span className="text-right text-emerald-950 font-medium max-w-[240px] truncate">
                    {orderItemsSummary}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-amber-200/50 pt-2">
                  <span className="text-stone-700 font-medium">প্রদেয় সর্বমোট অঙ্ক:</span>
                  <span className="text-xl font-bold font-serif-bn text-emerald-950">
                    ₹{Math.round(totalAmount)}
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>{statusMessage || 'অর্ডার প্রক্রিয়া করা হচ্ছে...'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>নিরাপদ পেমেন্ট সম্পন্ন করুন (UPI / Cards / NetBanking)</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-3 text-[11px] text-stone-500 pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  ক্যাশফ্রি ও সুপাবেস এনক্রিপ্টেড
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  ১০০% রিফান্ড ও রিপ্লেসমেন্ট গ্যারান্টি
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
