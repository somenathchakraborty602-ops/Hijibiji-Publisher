'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Phone,
  X,
  Truck,
  Copy,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  itemsSummary: string;
  amount: number;
  customerName?: string;
  paymentStatus?: string;
  loading?: boolean;
  errorMessage?: string | null;
}

export function PaymentSuccessModal({
  isOpen,
  onClose,
  orderId,
  itemsSummary,
  amount,
  customerName,
  paymentStatus = 'SUCCESS',
  loading = false,
  errorMessage = null,
}: PaymentSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyOrderId = async () => {
    if (!orderId) return;
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const whatsappText = encodeURIComponent(
    `হ্যালো হিজিবিজি পাবলিশার্স, আমার অর্ডার নিশ্চিত হয়েছে। অর্ডার আইডি: ${orderId}`
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div
        onClick={loading ? undefined : onClose}
        className="fixed inset-0 bg-stone-900/70 backdrop-blur-xs transition-opacity"
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-center border border-emerald-100 z-10 animate-fade-in">
          {!loading && (
            <button
              onClick={onClose}
              type="button"
              aria-label="বন্ধ করুন"
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1.5 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {loading ? (
            <div className="py-10 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-9 h-9 animate-spin" />
              </div>
              <h3 className="text-xl font-bold font-serif-bn text-stone-900">
                পেমেন্ট ও অর্ডার যাচাই হচ্ছে...
              </h3>
              <p className="text-xs sm:text-sm text-stone-500">
                অনুগ্রহ করে অপেক্ষা করুন, আপনার অর্ডার নম্বর{' '}
                <span className="font-mono font-semibold text-stone-700">{orderId}</span>{' '}
                নিশ্চিত করা হচ্ছে।
              </p>
            </div>
          ) : (
            <>
              {/* Success Icon */}
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <span className="inline-block bg-emerald-100 text-emerald-900 text-xs font-bold px-3.5 py-1 rounded-full mb-2">
                Thank You • Booking Confirmed ({paymentStatus})
              </span>

              <h3 className="text-2xl sm:text-3xl font-bold font-serif-bn text-stone-900 mb-2">
                ধন্যবাদ! আপনার অর্ডার নিশ্চিত হয়েছে
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-5">
                {customerName ? (
                  <>
                    প্রিয় <strong className="text-stone-900">{customerName}</strong>, আপনার পেমেন্ট ও বুকিং সফলভাবে সম্পন্ন হয়েছে।{' '}
                  </>
                ) : (
                  'আপনার পেমেন্ট ও বুকিং সফলভাবে সম্পন্ন হয়েছে। '
                )}
                আগামী ৩-৫ কার্যদিবসের মধ্যে কোলকাতা থেকে আপনার ঠিকানায় বইটি পৌঁছে যাবে।
              </p>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Order Details Card */}
              <div className="bg-amber-50/70 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-stone-700 border border-amber-200/70 text-left space-y-3 mb-5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 pb-2.5 border-b border-amber-200/50">
                  <span className="text-stone-500 font-medium shrink-0">অর্ডার আইডি (Order ID):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-stone-900 bg-white px-2.5 py-1 rounded-lg border border-amber-200 break-all">
                      {orderId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOrderId}
                      title="অর্ডার আইডি কপি করুন"
                      className="p-1.5 rounded-lg bg-white border border-amber-200 text-stone-600 hover:text-emerald-800 transition cursor-pointer shrink-0"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1.5">
                  <span className="text-stone-500 font-medium shrink-0">
                    বইয়ের নাম ও সংস্করণ (Book & Format):
                  </span>
                  <span className="font-semibold text-emerald-950 sm:text-right break-words">
                    {itemsSummary || 'হিজিবিজি বই সম্ভার'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-amber-200/50 pt-2.5">
                  <span className="text-stone-700 font-semibold">
                    পরিশোধিত মোট অঙ্ক (Paid Amount):
                  </span>
                  <span className="font-bold font-serif-bn text-emerald-900 text-xl">
                    ₹{Math.round(amount || 0)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/60">
                  <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>ফ্রি এক্সপ্রেস কুরিয়ারে ডেলিভারি ও ট্র্যাকিং আপডেট শীঘ্রই জানানো হবে</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-xl transition shadow-md cursor-pointer"
                >
                  ঠিক আছে (অন্যান্য বই দেখুন)
                </button>
                <div className="pt-1">
                  <a
                    href={`https://wa.me/917003255857?text=${whatsappText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-900 hover:underline font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-700" />
                    <span>যেকোনো প্রয়োজনে কল বা WhatsApp করুন: +91 7003255857</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
