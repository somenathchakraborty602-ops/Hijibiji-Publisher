'use client';

import React from 'react';
import { CheckCircle, Phone, X, PackageCheck, Truck } from 'lucide-react';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  itemsSummary: string;
  amount: number;
}

export function PaymentSuccessModal({
  isOpen,
  onClose,
  orderId,
  itemsSummary,
  amount,
}: PaymentSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-xs transition-opacity" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-center border border-emerald-100 z-10 animate-fade-in">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Success Icon */}
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>

          <span className="inline-block bg-emerald-100 text-emerald-900 text-xs font-bold px-3 py-1 rounded-full mb-2">
            পেমেন্ট ও বুকিং সফল হয়েছে
          </span>

          <h3 className="text-2xl font-bold font-serif-bn text-stone-900 mb-2">
            আপনার অর্ডার নিশ্চিত হয়েছে!
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-5">
            আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। আগামী ৩-৫ কার্যদিবসের মধ্যে কোলকাতা থেকে আপনার ঠিকানায় বইটি পৌঁছে যাবে।
          </p>

          {/* Order Details Card */}
          <div className="bg-amber-50/70 rounded-2xl p-4 text-xs text-stone-700 border border-amber-200/60 text-left space-y-2.5 mb-5">
            <div className="flex justify-between items-center">
              <span className="text-stone-500">অর্ডার নম্বর:</span>
              <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                {orderId.slice(0, 12).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500">বই / সংস্করণ:</span>
              <span className="font-semibold text-emerald-950 text-right truncate max-w-[200px]">
                {itemsSummary || 'হিজিবিজি বই সম্ভার'}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-amber-200/50 pt-2">
              <span className="text-stone-600 font-medium">পরিশোধিত মোট অঙ্ক:</span>
              <span className="font-bold font-serif-bn text-emerald-900 text-base">
                ₹{amount}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-lg mt-1 border border-emerald-200/40">
              <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>ফ্রি এক্সপ্রেস কুরিয়ারে ট্র্যাকিং আপডেট শীঘ্রই জানানো হবে</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-3 rounded-xl transition shadow-md cursor-pointer"
            >
              ঠিক আছে (হোমপেজে ফিরুন)
            </button>
            <div className="pt-1">
              <a
                href="https://wa.me/917003255857?text=হ্যালো%20হিজিবিজি%20পাবলিশার্স,%20আমার%20অর্ডার%20নম্বর%20"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-emerald-900 hover:underline font-semibold"
              >
                <Phone className="w-3 h-3 text-emerald-700" />
                <span>যেকোনো প্রয়োজনে কল বা WhatsApp করুন: +91 7003255857</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
