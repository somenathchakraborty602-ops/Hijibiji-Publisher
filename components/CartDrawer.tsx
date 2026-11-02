'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag, X, ArrowRight, Tag, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Coupon } from '@/lib/supabase';

export interface CartItem {
  id: string; // can be `${bookId}-${format}`
  bookId: string;
  title: string;
  author?: string;
  format: string; // 'Paperback' | 'Hardcover' | 'E-Book'
  price: number;
  image?: string | null;
  qty: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onOpenCheckout: () => void;
  appliedCoupon: Coupon | null;
  onApplyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  onRemoveCoupon: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  onOpenCheckout,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
}: CartDrawerProps) {
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  let discount = 0;
  if (appliedCoupon && subtotal >= (appliedCoupon.min_order_value || 0)) {
    if (appliedCoupon.discount_type === 'percentage' || !appliedCoupon.discount_type) {
      discount = Math.round((subtotal * appliedCoupon.discount_value) / 100);
    } else {
      discount = Math.min(subtotal, appliedCoupon.discount_value);
    }
  }

  const finalTotal = Math.max(0, subtotal - discount);

  const handleApply = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponFeedback(null);
    try {
      const res = await onApplyCoupon(couponCode.trim().toUpperCase());
      if (res.success) {
        setCouponFeedback({ type: 'success', message: res.message });
      } else {
        setCouponFeedback({ type: 'error', message: res.message });
      }
    } catch {
      setCouponFeedback({ type: 'error', message: 'কুপন যাচাই করতে সমস্যা হয়েছে।' });
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col z-10">
          {/* Header */}
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-800" />
              <h3 className="text-lg font-bold font-serif-bn text-stone-900">
                আপনার বইয়ের থলি
              </h3>
              <span className="text-xs bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                {cart.reduce((sum, i) => sum + i.qty, 0)} টি
              </span>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-200/50 transition cursor-pointer"
              aria-label="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-stone-400 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
                  <ShoppingBag className="w-8 h-8 opacity-60" />
                </div>
                <p className="text-sm font-medium text-stone-600">
                  আপনার থলিতে এখনও কোনো বই নেই।
                </p>
                <p className="text-xs text-stone-400 max-w-xs mx-auto">
                  ক্যাটালগ থেকে আপনার পছন্দের বইটি বেছে নিয়ে &lsquo;থলিতে রাখুন&rsquo; বাটনে ক্লিক করুন।
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 items-center border border-stone-200/70 p-2.5 rounded-xl bg-white shadow-2xs hover:border-amber-200 transition"
                >
                  <div className="w-14 h-18 relative rounded-lg bg-stone-100 overflow-hidden shrink-0">
                    <Image
                      src={item.image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=150&q=80'}
                      alt={item.title}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-bold font-serif-bn text-stone-900 truncate">
                      {item.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded">
                        {item.format}
                      </span>
                      <span className="text-xs font-semibold text-emerald-950">
                        ₹{item.price}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5 border border-stone-200 rounded-lg p-0.5 bg-stone-50">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, -1)}
                          className="w-6 h-6 rounded bg-white hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center transition cursor-pointer shadow-2xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold px-1.5 min-w-[18px] text-center">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, 1)}
                          className="w-6 h-6 rounded bg-white hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center transition cursor-pointer shadow-2xs"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-serif-bn text-stone-800">
                          ₹{item.price * item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="text-stone-400 hover:text-red-600 p-1 rounded transition cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Coupon & Checkout */}
          {cart.length > 0 && (
            <div className="border-t border-stone-200 bg-stone-50/80 p-4 space-y-3">
              {/* Coupon Section */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-700" />
                    <span>কুপন কোড (যদি থাকে)</span>
                  </label>
                  {appliedCoupon && (
                    <button
                      type="button"
                      onClick={onRemoveCoupon}
                      className="text-[11px] text-red-600 hover:underline cursor-pointer"
                    >
                      কুপন সরান
                    </button>
                  )}
                </div>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 font-medium">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                      কুপন <strong>{appliedCoupon.code}</strong> কার্যকর (-₹{discount})
                    </span>
                    <span className="text-emerald-800 font-bold">
                      {appliedCoupon.discount_value}% ছাড়
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="যেমন: HIJIBIJIPRE"
                      className="flex-1 uppercase text-xs border border-stone-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-700 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={couponLoading}
                      className="bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer disabled:opacity-50"
                    >
                      {couponLoading ? '...' : 'প্রয়োগ'}
                    </button>
                  </div>
                )}

                {couponFeedback && (
                  <p
                    className={`text-xs flex items-center gap-1 mt-1 ${
                      couponFeedback.type === 'success'
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }`}
                  >
                    {couponFeedback.type === 'success' ? (
                      <CheckCircle className="w-3 h-3 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 shrink-0" />
                    )}
                    <span>{couponFeedback.message}</span>
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 pt-2 text-xs sm:text-sm text-stone-600 border-t border-stone-200">
                <div className="flex justify-between">
                  <span>বইয়ের মোট মূল্য:</span>
                  <span className="font-semibold text-stone-800">₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>কুপন ছাড়:</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-stone-500">
                  <span>ডেলিভারি চার্জ:</span>
                  <span className="text-emerald-700 font-bold">বিনামূল্যে (Free)</span>
                </div>
                <div className="flex justify-between text-base font-bold text-stone-900 pt-1 border-t border-stone-200">
                  <span>সর্বমোট প্রদেয়:</span>
                  <span className="text-emerald-950 font-serif-bn text-lg">
                    ₹{finalTotal}
                  </span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                type="button"
                onClick={onOpenCheckout}
                className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>ডেলিভারি তথ্য ও পেমেন্ট</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
