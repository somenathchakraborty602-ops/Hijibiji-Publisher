'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { supabase, Order } from '@/lib/supabase';
import { PaymentSuccessModal } from '@/components/PaymentSuccessModal';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractCandidateUuid(rawOrderId: string): string | null {
  if (UUID_REGEX.test(rawOrderId)) return rawOrderId;
  const hbMatch = rawOrderId.match(
    /^HB_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_\d+$/i
  );
  if (hbMatch) return hbMatch[1];
  return null;
}

function OrderReturnWatcher() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const returnOrderId = searchParams.get('order_id');

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    loading: boolean;
    orderId: string;
    itemsSummary: string;
    amount: number;
    customerName?: string;
    paymentStatus: string;
    errorMessage: string | null;
  }>({
    isOpen: false,
    loading: false,
    orderId: '',
    itemsSummary: '',
    amount: 0,
    customerName: undefined,
    paymentStatus: 'SUCCESS',
    errorMessage: null,
  });

  useEffect(() => {
    if (!returnOrderId) return;
    let cancelled = false;

    async function processReturnedOrder(rawId: string) {
      setModalState({
        isOpen: true,
        loading: true,
        orderId: rawId,
        itemsSummary: '',
        amount: 0,
        customerName: undefined,
        paymentStatus: 'SUCCESS',
        errorMessage: null,
      });

      try {
        let order: (Order & { cashfree_order_id?: string | null }) | null = null;
        const candidateUuid = extractCandidateUuid(rawId);

        if (candidateUuid) {
          const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('id', candidateUuid)
            .maybeSingle();
          order = data;
        }

        if (!order) {
          const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('cashfree_order_id', rawId)
            .maybeSingle();
          order = data;
        }

        if (cancelled) return;

        if (order) {
          let resolvedOrder = order;
          let finalStatus = resolvedOrder.payment_status;

          // Update payment_status to 'SUCCESS' unless already delivered
          if (
            resolvedOrder.payment_status !== 'DELIVERED' &&
            resolvedOrder.payment_status !== 'SUCCESS'
          ) {
            const { data: updated, error: updateErr } = await supabase
              .from('orders')
              .update({ payment_status: 'SUCCESS' })
              .eq('id', resolvedOrder.id)
              .select('*')
              .maybeSingle();

            if (!updateErr && updated) {
              resolvedOrder = updated;
              finalStatus = updated.payment_status;
            } else {
              finalStatus = 'SUCCESS';
            }
          }

          // Clear saved shopping cart after confirmed payment return
          try {
            localStorage.removeItem('hijibiji_cart');
            window.dispatchEvent(new Event('hijibiji_cart_cleared'));
          } catch {}

          if (cancelled) return;
          setModalState({
            isOpen: true,
            loading: false,
            orderId: resolvedOrder.id,
            itemsSummary: resolvedOrder.order_items || 'হিজিবিজি বই সম্ভার',
            amount: Number(resolvedOrder.total_amount) || 0,
            customerName: resolvedOrder.customer_name || undefined,
            paymentStatus: finalStatus || 'SUCCESS',
            errorMessage: null,
          });
        } else {
          setModalState({
            isOpen: true,
            loading: false,
            orderId: rawId,
            itemsSummary: 'হিজিবিজি বই সম্ভার',
            amount: 0,
            customerName: undefined,
            paymentStatus: 'SUCCESS',
            errorMessage:
              'অর্ডার আইডিটি ডেটাবেসে খুঁজে পাওয়া যায়নি, তবে পেমেন্ট সম্পন্ন হয়ে থাকলে আমাদের হোয়াটসঅ্যাপে অর্ডার আইডিটি জানান।',
          });
        }
      } catch (err) {
        console.warn('Error verifying returned Cashfree order:', err);
        if (cancelled) return;
        setModalState({
          isOpen: true,
          loading: false,
          orderId: rawId,
          itemsSummary: 'হিজিবিজি বই সম্ভার',
          amount: 0,
          customerName: undefined,
          paymentStatus: 'SUCCESS',
          errorMessage: 'অর্ডারের বিস্তারিত লোড করতে সাময়িক ত্রুটি হয়েছে।',
        });
      }
    }

    processReturnedOrder(returnOrderId.trim());

    return () => {
      cancelled = true;
    };
  }, [returnOrderId]);

  const handleClose = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (typeof window !== 'undefined' && window.location.search.includes('order_id=')) {
      const params = new URLSearchParams(window.location.search);
      params.delete('order_id');
      const remaining = params.toString();
      const nextUrl = remaining ? `${pathname}?${remaining}` : pathname;
      window.history.replaceState({}, '', nextUrl || '/');
    }
  };

  return (
    <PaymentSuccessModal
      isOpen={modalState.isOpen}
      onClose={handleClose}
      orderId={modalState.orderId}
      itemsSummary={modalState.itemsSummary}
      amount={modalState.amount}
      customerName={modalState.customerName}
      paymentStatus={modalState.paymentStatus}
      loading={modalState.loading}
      errorMessage={modalState.errorMessage}
    />
  );
}

export function OrderReturnHandler() {
  return (
    <Suspense fallback={null}>
      <OrderReturnWatcher />
    </Suspense>
  );
}
