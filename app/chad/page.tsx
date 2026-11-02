'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Truck,
  BookmarkCheck,
  ShieldCheck,
  Zap,
  FileText,
  ShoppingBag,
  Tag,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { CartDrawer, CartItem } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { PaymentSuccessModal } from '@/components/PaymentSuccessModal';
import { PolicyModal, PolicyType } from '@/components/PolicyModal';
import { Footer } from '@/components/Footer';
import { supabase, Book, Coupon, INITIAL_BOOKS } from '@/lib/supabase';

const DEFAULT_CHAD = INITIAL_BOOKS.find((b) => b.id.includes('chad'))!;

export default function ChadPage() {
  const [book, setBook] = useState<Book>(DEFAULT_CHAD);
  const [selectedFormat, setSelectedFormat] = useState<'paperback' | 'ebook' | 'hardcover'>('paperback');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cart & Modals
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('hijibiji_cart');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activePolicy, setActivePolicy] = useState<PolicyType>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // Success Modal
  const [successModalData, setSuccessModalData] = useState<{
    isOpen: boolean;
    orderId: string;
    itemsSummary: string;
    amount: number;
  }>({
    isOpen: false,
    orderId: '',
    itemsSummary: '',
    amount: 0,
  });

  useEffect(() => {
    try {
      localStorage.setItem('hijibiji_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Fetch book from Supabase
  useEffect(() => {
    async function loadBook() {
      try {
        const { data } = await supabase
          .from('books')
          .select('*')
          .ilike('title', '%ছাদ%')
          .single();

        if (data) {
          setBook({
            ...DEFAULT_CHAD,
            ...data,
          });
        }
      } catch (e) {
        console.warn('Supabase book fetch fallback:', e);
      }
    }
    loadBook();
  }, []);

  // Format pricing
  const formats = [
    {
      key: 'ebook',
      label: 'E-Book (ডিজিটাল)',
      price: book.price_ebook,
      discount: book.discount_ebook,
    },
    {
      key: 'paperback',
      label: 'Paperback (কাগজের বই)',
      price: book.price_paperback || book.price,
      discount: book.discount_paperback || book.discount_price,
    },
    {
      key: 'hardcover',
      label: 'Hardcover (অভিজাত বাঁধাই)',
      price: book.price_hardcover,
      discount: book.discount_hardcover,
    },
  ];

  const currentFormatObj = formats.find((f) => f.key === selectedFormat) || formats[1];
  const mrp = currentFormatObj.price || 450;
  const activePrice =
    currentFormatObj.discount && currentFormatObj.discount < mrp
      ? Number(currentFormatObj.discount)
      : Number(mrp);
  const hasDiscount = currentFormatObj.discount && currentFormatObj.discount < mrp;

  // Coupon calculations
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage' || !appliedCoupon.discount_type) {
      couponDiscount = Math.round((activePrice * appliedCoupon.discount_value) / 100);
    } else {
      couponDiscount = Math.min(activePrice, appliedCoupon.discount_value);
    }
  }

  const finalPayable = Math.max(0, activePrice - couponDiscount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponMsg(null);
    const code = couponCode.trim().toUpperCase();

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        if (code === 'HIJIBIJIPRE' || code === 'BOIPROKASH10') {
          const fb: Coupon = {
            code,
            discount_type: 'percentage',
            discount_value: code === 'HIJIBIJIPRE' ? 40 : 10,
            min_order_value: 0,
            is_active: true,
          };
          setAppliedCoupon(fb);
          setCouponMsg({
            type: 'success',
            text: `কুপন কোড ${code} সফলভাবে প্রয়োগ করা হয়েছে! (${fb.discount_value}% ছাড়)`,
          });
          return;
        }
        setCouponMsg({ type: 'error', text: 'অবৈধ বা মেয়াদোত্তীর্ণ কুপন কোড।' });
        return;
      }

      setAppliedCoupon(data);
      setCouponMsg({
        type: 'success',
        text: `কুপন সফলভাবে যুক্ত হয়েছে! ${data.discount_value}% ছাড় প্রযোজ্য।`,
      });
    } catch {
      setCouponMsg({ type: 'error', text: 'কুপন যাচাই করতে সমস্যা হয়েছে।' });
    }
  };

  const formatBengaliName =
    selectedFormat === 'ebook'
      ? 'E-Book'
      : selectedFormat === 'hardcover'
      ? 'Hardcover'
      : 'Paperback';

  const orderSummaryString = `${book.title} (${formatBengaliName}) (x1)`;

  const handleAddToCart = () => {
    const cartItemId = `${book.id}-${formatBengaliName}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.id === cartItemId ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: cartItemId,
          bookId: book.id,
          title: book.title,
          author: book.author,
          format: formatBengaliName,
          price: finalPayable,
          image: book.cover_image_url,
          qty: 1,
        },
      ];
    });
    setIsCartOpen(true);
  };

  return (
    <>
      <Navbar
        cartCount={cart.reduce((sum, item) => sum + item.qty, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        activePath="/chad"
      />

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12 flex-1 w-full space-y-12">
        {/* Back Link */}
        <div className="flex items-center justify-between pb-2 border-b border-amber-100">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-600 hover:text-emerald-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>মূল ক্যাটালগে ফিরুন</span>
          </Link>
          <span className="text-xs text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold">
            মধ্যবিত্ত সমাজের একটি মেয়ের গল্প
          </span>
        </div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          {/* Left: Book Cover & Badges */}
          <div className="space-y-4">
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/80 overflow-hidden group">
              <div className="absolute top-4 left-4 bg-emerald-800 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full shadow-md z-10">
                ★ বহুল প্রতীক্ষিত সামাজিক উপন্যাস
              </div>
              <div className="relative h-[420px] w-full">
                <Image
                  src={
                    book.cover_image_url ||
                    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80'
                  }
                  alt={book.title}
                  fill
                  className="object-contain rounded-2xl mx-auto group-hover:scale-105 transition duration-500"
                  priority
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
                <Truck className="w-5 h-5 mx-auto text-emerald-800 mb-1" />
                <span className="font-semibold text-stone-700">ফ্রি ডেলিভারি</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
                <BookmarkCheck className="w-5 h-5 mx-auto text-emerald-800 mb-1" />
                <span className="font-semibold text-stone-700">অভিজাত মুদ্রণ</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
                <ShieldCheck className="w-5 h-5 mx-auto text-emerald-800 mb-1" />
                <span className="font-semibold text-stone-700">অরিজিনাল কপি</span>
              </div>
            </div>
          </div>

          {/* Right: Book Details & Actions */}
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100/90 px-3 py-1 rounded-md mb-2">
                <span>সমকালীন উপন্যাস • প্রকাশনা সংখ্যা: ০২</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-serif-bn text-stone-900 leading-tight">
                {book.title}
              </h1>
              <p className="text-base text-amber-900 font-bold mt-1">
                লেখিকা: {book.author}
              </p>
              {book.isbn && (
                <p className="text-xs font-mono text-stone-500 mt-0.5">
                  ISBN: {book.isbn}
                </p>
              )}
            </div>

            {/* Format Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                ফরম্যাট নির্বাচন করুন:
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {formats.map((f) => {
                  const isAvailable = f.price !== null && f.price !== undefined && Number(f.price) > 0;
                  const isSelected = selectedFormat === f.key;
                  const currentDisplay =
                    f.discount && f.price && f.discount < f.price ? f.discount : (f.price ?? 0);

                  if (!isAvailable) {
                    return (
                      <div
                        key={f.key}
                        className="p-3 rounded-xl border border-stone-200 bg-stone-100 text-stone-400 opacity-60 text-center cursor-not-allowed"
                      >
                        <div className="text-[11px] font-bold text-stone-500">{f.label.split(' ')[0]}</div>
                        <div className="text-xs font-bold mt-0.5 text-stone-400">NA</div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setSelectedFormat(f.key as any)}
                      className={`p-3 rounded-2xl text-center transition cursor-pointer ${
                        isSelected
                          ? 'border-2 border-emerald-800 bg-emerald-50 text-emerald-950 shadow-xs'
                          : 'border border-stone-300 bg-white text-stone-700 hover:border-emerald-600'
                      }`}
                    >
                      <div className="text-[11px] font-bold truncate">{f.label.split(' ')[0]}</div>
                      <div className="text-sm font-bold text-emerald-950 mt-0.5 font-serif-bn">
                        ₹{currentDisplay}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Box */}
            <div className="bg-white p-5 rounded-3xl border border-amber-200/80 shadow-xs space-y-1.5">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold font-serif-bn text-emerald-950">
                  ₹{activePrice}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-stone-400 line-through">₹{mrp}</span>
                )}
                {hasDiscount && (
                  <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-md shadow-2xs">
                    ছাড়
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> সারা ভারতে ডেলিভারি চার্জ সম্পূর্ণ বিনামূল্যে
              </p>
            </div>

            {/* Synopsis */}
            <div className="space-y-2">
              <h3 className="text-base font-bold font-serif-bn text-stone-900">কাহিনী সংক্ষেপ:</h3>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                {book.description ||
                  "'ছাদ' নিছক কোনো ইট-কাঠ-পাথরের আচ্ছাদন নয়; নারীর নিরাপত্তা, ভরসা আর আত্মমর্যাদার পরম আশ্রয়। কন্যাদায়গ্রস্ত মধ্যবিত্তের দেনাপাওনা, পণের নির্মম বলিদান আর পারিবারিক কূটচালে বিক্রি হয়ে যাওয়া সুমিতার লড়াই এক অনন্য দলিল। অসম দাম্পত্যের রূঢ় বাস্তবের মুখে দাঁড়িয়ে নিজের শিক্ষাবঞ্চিত অপূর্ণ স্বপ্নকে শক্তিতে বদলে মেয়ে পারমিতাকে স্বাবলম্বী করে তোলার মাধ্যমে প্রজন্মের পর প্রজন্ম নারীর মুক্তির দিশা দেখায় এই উপন্যাস।"}
              </p>
            </div>

            {/* Action Box: Coupon, PDF & Quick Checkout */}
            <div className="bg-emerald-50/70 p-5 rounded-3xl border border-emerald-200/70 space-y-4">
              {/* Coupon input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-emerald-950 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-800" />
                  <span>কুপন কোড প্রয়োগ করুন</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="যেমন: HIJIBIJIPRE"
                    className="flex-1 uppercase text-xs border border-emerald-300 rounded-xl px-3 py-2 outline-none bg-white focus:border-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    প্রয়োগ
                  </button>
                </div>
                {couponMsg && (
                  <p
                    className={`text-xs mt-1 ${
                      couponMsg.type === 'success' ? 'text-emerald-800 font-semibold' : 'text-red-600'
                    }`}
                  >
                    {couponMsg.text}
                  </p>
                )}
              </div>

              {/* Total Summary */}
              <div className="border-t border-emerald-200/60 pt-3 flex justify-between items-center">
                <span className="text-xs sm:text-sm font-semibold text-stone-700">
                  নির্বাচিত সংস্করণ ({formatBengaliName}) এ প্রদেয়:
                </span>
                <span className="text-2xl font-bold font-serif-bn text-emerald-950">
                  ₹{finalPayable}
                </span>
              </div>

              {/* Sample PDF Button */}
              <button
                type="button"
                onClick={() => {
                  if (book.pdf_url) {
                    window.open(book.pdf_url, '_blank');
                  } else {
                    setPdfModalOpen(true);
                  }
                }}
                className="w-full bg-white hover:bg-amber-50 text-emerald-950 border-2 border-emerald-800 font-bold py-3 rounded-2xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-800" />
                <span>বইটির প্রথম কয়েক পাতা পড়ুন (Sample PDF)</span>
              </button>

              {/* Quick Checkout CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>এখনই সরাসরি কিনুন</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>থলিতে রাখুন</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sample PDF Preview Dialog */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 border border-stone-200">
            <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="font-bold font-serif-bn text-lg text-stone-900">
              স্যাম্পল প্রিভিউ রিডার
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              &lsquo;ছাদ&rsquo; উপন্যাসের সূচনা অধ্যায় ও চরিত্র পরিচিতি শীঘ্রই আপলোড করা হচ্ছে। সম্পূর্ণ বইটি উপভোগ করতে এখনই অর্ডার সম্পন্ন করতে পারেন অথবা অ্যাডমিন প্যানেল থেকে PDF লিঙ্ক যুক্ত করতে পারেন।
            </p>
            <button
              type="button"
              onClick={() => setPdfModalOpen(false)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQty={(id, delta) => {
          setCart((prev) =>
            prev
              .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
              .filter((i) => i.qty > 0)
          );
        }}
        onRemoveItem={(id) => setCart((prev) => prev.filter((i) => i.id !== id))}
        onOpenCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={async (code) => {
          setCouponCode(code);
          await handleApplyCoupon();
          return { success: true, message: 'কুপন যাচাই সম্পন্ন।' };
        }}
        onRemoveCoupon={() => setAppliedCoupon(null)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        orderItemsSummary={orderSummaryString}
        totalAmount={finalPayable}
        onOrderSuccess={(orderId, itemsSummary, amount) => {
          setSuccessModalData({
            isOpen: true,
            orderId,
            itemsSummary,
            amount,
          });
        }}
      />

      {/* Success Modal */}
      <PaymentSuccessModal
        isOpen={successModalData.isOpen}
        onClose={() => setSuccessModalData((p) => ({ ...p, isOpen: false }))}
        orderId={successModalData.orderId}
        itemsSummary={successModalData.itemsSummary}
        amount={successModalData.amount}
      />

      <PolicyModal type={activePolicy} onClose={() => setActivePolicy(null)} />
      <Footer onOpenPolicy={(t) => setActivePolicy(t)} />
    </>
  );
}
