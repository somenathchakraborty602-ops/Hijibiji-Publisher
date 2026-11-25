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
  CheckCircle2,
  BookOpen,
  Building2,
  Languages,
  FileSpreadsheet,
  Hash,
  Calendar,
  Layers,
  ExternalLink,
  X,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { CartDrawer, CartItem } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { PaymentSuccessModal } from '@/components/PaymentSuccessModal';
import { PolicyModal, PolicyType } from '@/components/PolicyModal';
import { Footer } from '@/components/Footer';
import { BookStatusBadge } from '@/components/BookStatusBadge';
import {
  supabase,
  Book,
  Coupon,
  BookFormatKey,
  getBookFormats,
  getDefaultAvailableFormat,
  isPreBookingStatus,
} from '@/lib/supabase';

interface BookSalesViewProps {
  book: Book | null;
  loading?: boolean;
}

export function BookSalesView({ book, loading = false }: BookSalesViewProps) {
  const [selectedFormatByBook, setSelectedFormatByBook] = useState<{
    bookId: string;
    format: BookFormatKey;
  } | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [failedBannerUrl, setFailedBannerUrl] = useState<string | null>(null);

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
  const [checkoutSource, setCheckoutSource] = useState<'direct' | 'cart'>('direct');
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

  useEffect(() => {
    const handleCartCleared = () => {
      setCart([]);
      setAppliedCoupon(null);
    };
    window.addEventListener('hijibiji_cart_cleared', handleCartCleared);
    return () => window.removeEventListener('hijibiji_cart_cleared', handleCartCleared);
  }, []);

  if (loading || !book) {
    return (
      <div className="min-h-screen flex flex-col bg-amber-50/30">
        <Navbar cartCount={cart.reduce((sum, i) => sum + i.qty, 0)} onOpenCart={() => setIsCartOpen(true)} />
        <main className="flex-1 flex flex-col items-center justify-center py-24 gap-3 text-stone-500">
          <div className="animate-spin w-9 h-9 border-4 border-emerald-800 border-t-transparent rounded-full" />
          <p className="text-sm font-medium">বইয়ের তথ্য লোড হচ্ছে...</p>
        </main>
        <Footer onOpenPolicy={setActivePolicy} />
      </div>
    );
  }

  // Format pricing (E-Book, Paperback, Hardcover — NA when missing/null)
  const formats = getBookFormats(book);
  const selectedFormat: BookFormatKey =
    selectedFormatByBook && selectedFormatByBook.bookId === book.id
      ? selectedFormatByBook.format
      : getDefaultAvailableFormat(book);
  const currentFormatObj =
    formats.find((f) => f.key === selectedFormat && f.isAvailable) ||
    formats.find((f) => f.isAvailable) ||
    formats[1];

  const hasAnyAvailableFormat = formats.some((f) => f.isAvailable);
  const mrp = currentFormatObj.price || book.price || 300;
  const activePrice = currentFormatObj.activePrice ?? Number(mrp);
  const hasDiscount = currentFormatObj.hasDiscount;
  const savingsAmount = hasDiscount && mrp > activePrice ? mrp - activePrice : 0;

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
            text: `কুপন সফলভাবে প্রয়োগ হয়েছে! (${fb.discount_value}% ছাড়)`,
          });
          return;
        }
        setCouponMsg({ type: 'error', text: 'অবৈধ বা মেয়াদোত্তীর্ণ কুপন কোড।' });
        return;
      }

      if (data.min_order_value && activePrice < data.min_order_value) {
        setCouponMsg({
          type: 'error',
          text: `এই কুপনের জন্য ন্যূনতম অর্ডার মূল্য ₹${data.min_order_value} হতে হবে।`,
        });
        return;
      }

      setAppliedCoupon(data);
      setCouponMsg({
        type: 'success',
        text: `কুপন সফলভাবে যুক্ত হয়েছে! ${data.discount_value}${
          data.discount_type === 'fixed' ? ' টাকা' : '%'
        } ছাড় প্রযোজ্য।`,
      });
    } catch {
      setCouponMsg({ type: 'error', text: 'কুপন যাচাই করতে সমস্যা হয়েছে।' });
    }
  };

  const handleCartCouponApply = async (
    code: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanCode = code.trim().toUpperCase();
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        if (cleanCode === 'HIJIBIJIPRE' || cleanCode === 'BOIPROKASH10') {
          const fb: Coupon = {
            code: cleanCode,
            discount_type: 'percentage',
            discount_value: cleanCode === 'HIJIBIJIPRE' ? 40 : 10,
            min_order_value: 0,
            is_active: true,
          };
          setAppliedCoupon(fb);
          return {
            success: true,
            message: `কুপন সফলভাবে প্রয়োগ হয়েছে! (${fb.discount_value}% ছাড়)`,
          };
        }
        return { success: false, message: 'অবৈধ বা মেয়াদোত্তীর্ণ কুপন কোড।' };
      }

      if (data.min_order_value && subtotal < data.min_order_value) {
        return {
          success: false,
          message: `ন্যূনতম অর্ডার ₹${data.min_order_value} হতে হবে।`,
        };
      }

      setAppliedCoupon(data);
      return {
        success: true,
        message: `কুপন যুক্ত হয়েছে! ${data.discount_value}${
          data.discount_type === 'fixed' ? ' টাকা' : '%'
        } ছাড় প্রযোজ্য।`,
      };
    } catch {
      return { success: false, message: 'কুপন যাচাই করতে ত্রুটি হয়েছে।' };
    }
  };

  const formatBengaliName = currentFormatObj.bengaliName;
  const isPreBooking = isPreBookingStatus(book.book_status);

  const orderSummaryString = `${book.title} (${formatBengaliName}) (x1)${
    isPreBooking ? ' [Pre-Booking]' : ''
  }`;

  const handleAddToCart = () => {
    if (!hasAnyAvailableFormat) return;
    const cartItemId = `${book.id}-${formatBengaliName}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.id === cartItemId ? { ...item, qty: item.qty + 1, isPreBooking } : item
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
          isPreBooking,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartDiscount =
    appliedCoupon && cartSubtotal >= (appliedCoupon.min_order_value || 0)
      ? appliedCoupon.discount_type === 'percentage' || !appliedCoupon.discount_type
        ? Math.round((cartSubtotal * appliedCoupon.discount_value) / 100)
        : Math.min(cartSubtotal, appliedCoupon.discount_value)
      : 0;
  const cartTotalPayable = Math.max(0, cartSubtotal - cartDiscount);

  const bannerImgError = Boolean(book.sales_banner_url && failedBannerUrl === book.sales_banner_url);
  const hasSalesBanner = Boolean(book.sales_banner_url && !bannerImgError);
  const resolvedGenre = (book.genre || '').trim() || 'মৌলিক সাহিত্য';
  const resolvedPublishYear = (book.publish_year || '').trim() || '২০২৬ (কলকাতা)';
  const resolvedPageCount =
    book.page_count !== null && book.page_count !== undefined && String(book.page_count).trim() !== ''
      ? String(book.page_count).trim()
      : 'শীঘ্রই আপডেট হবে';
  const resolvedIsbn = (book.isbn || '').trim() || 'প্রযোজ্য নয়';

  const bookDetailCards = [
    {
      label: 'প্রকাশক',
      value: 'হিজিবিজি পাবলিশার্স',
      icon: Building2,
    },
    {
      label: 'ভাষা',
      value: 'বাংলা',
      icon: Languages,
    },
    {
      label: 'পৃষ্ঠা সংখ্যা',
      value: resolvedPageCount,
      icon: FileSpreadsheet,
    },
    {
      label: 'ISBN',
      value: resolvedIsbn,
      icon: Hash,
    },
    {
      label: 'প্রথম প্রকাশ',
      value: resolvedPublishYear,
      icon: Calendar,
    },
    {
      label: 'বিভাগ',
      value: resolvedGenre,
      icon: Layers,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-amber-50/30">
      <Navbar
        cartCount={cart.reduce((sum, i) => sum + i.qty, 0)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8 flex-1 w-full space-y-6 sm:space-y-8">
        {/* Back Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-600 hover:text-emerald-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>সকল বইয়ের ক্যাটালগে ফিরুন</span>
          </Link>
          <span className="text-xs text-stone-500 hidden sm:inline">
            হিজিবিজি পাবলিশার্স · {resolvedGenre}
          </span>
        </div>

        {/* 1. TOP DEDICATED HERO BANNER (aspect-[16/5]) */}
        <section className="relative w-full aspect-[16/8] sm:aspect-[16/5] rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-emerald-950/15 bg-emerald-950">
          {hasSalesBanner ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={book.sales_banner_url!}
                alt={`${book.title} — সেলস পেজ ব্যানার`}
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setFailedBannerUrl(book.sales_banner_url || null)}
              />
              {/* Dark Emerald Gradient Overlay for High-Contrast Legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/92 via-emerald-950/75 to-emerald-900/35" />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-emerald-950/20" />
            </>
          ) : (
            /* Sleek Emerald & Gold Gradient Fallback Banner */
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-amber-900/90">
              <div
                className="absolute inset-0 opacity-35"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 82% 28%, rgba(251, 191, 36, 0.45), transparent 52%), radial-gradient(circle at 14% 85%, rgba(16, 185, 129, 0.35), transparent 48%)',
                }}
              />
            </div>
          )}

          {/* Banner Content Overlay */}
          <div className="relative z-10 h-full flex flex-col justify-end sm:justify-center px-5 py-5 sm:px-10 sm:py-8 max-w-3xl">
            <div className="mb-2.5 sm:mb-3">
              <BookStatusBadge status={book.book_status} size="md" />
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-bold font-serif-bn text-white leading-tight drop-shadow-sm [text-wrap:balance]">
              {book.title}
            </h1>

            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm md:text-base text-amber-100/95 font-medium flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span>লেখক: {book.author}</span>
              <span aria-hidden="true" className="text-amber-400/70">
                ·
              </span>
              <span>{resolvedGenre}</span>
              <span aria-hidden="true" className="text-amber-400/70 hidden sm:inline">
                ·
              </span>
              <span className="hidden sm:inline text-emerald-100/90">হিজিবিজি পাবলিশার্স</span>
            </p>
          </div>
        </section>

        {/* 2. MAIN TWO-COLUMN PREMIUM LAYOUT */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-start">
          {/* LEFT COLUMN (STICKY): Book Cover Card + Sample PDF Button + 3 Trust Badges */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-md p-4 sm:p-5 space-y-4">
              {/* Book Cover */}
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-stone-100 border border-stone-100 shadow-inner">
                <Image
                  src={
                    book.cover_image_url ||
                    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80'
                  }
                  alt={book.title}
                  fill
                  className="object-cover"
                  priority
                  referrerPolicy="no-referrer"
                />

                {/* Top-Left Status Badge */}
                <BookStatusBadge
                  status={book.book_status}
                  size="md"
                  className="absolute top-3.5 left-3.5 z-10"
                />

                {hasDiscount && (
                  <span className="absolute top-3.5 right-3.5 z-10 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-md tabular-nums">
                    ₹{savingsAmount} ছাড়
                  </span>
                )}
              </div>

              {/* Full-Width Sample PDF Button */}
              <button
                type="button"
                onClick={() => setPdfModalOpen(true)}
                className="w-full py-3 px-4 rounded-2xl border-2 border-emerald-800/20 bg-emerald-50/70 hover:bg-emerald-800 text-emerald-950 hover:text-white font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>প্রথম কয়েক পাতা পড়ুন (Sample PDF)</span>
              </button>

              {/* 3 Trust Badges */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="flex flex-col items-center text-center p-2.5 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                  <Truck className="w-4 h-4 text-emerald-800 mb-1" />
                  <span className="text-[11px] font-semibold text-stone-800 leading-tight">
                    ফ্রি ডেলিভারি
                  </span>
                </div>
                <div className="flex flex-col items-center text-center p-2.5 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                  <BookmarkCheck className="w-4 h-4 text-emerald-800 mb-1" />
                  <span className="text-[11px] font-semibold text-stone-800 leading-tight">
                    অরিজিনাল মুদ্রণ
                  </span>
                </div>
                <div className="flex flex-col items-center text-center p-2.5 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                  <ShieldCheck className="w-4 h-4 text-emerald-800 mb-1" />
                  <span className="text-[11px] font-semibold text-stone-800 leading-tight">
                    নিরাপদ পেমেন্ট
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Metadata, Title, Author, 3-Format Selector, Price & Coupon, Synopsis, 6-Card Details Grid */}
          <div className="lg:col-span-7 space-y-6">
            {/* Primary Purchase & Identity Card */}
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-md p-5 sm:p-7 space-y-6">
              {/* Genre & ISBN Meta Row */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold">
                  <span className="text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                    {resolvedGenre}
                  </span>
                  {book.isbn && (
                    <span className="font-mono text-stone-600 bg-stone-100 border border-stone-200/80 px-2.5 py-1 rounded-lg tabular-nums">
                      ISBN: {book.isbn}
                    </span>
                  )}
                </div>

                {/* Serif Bengali Title */}
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif-bn text-stone-900 leading-tight [text-wrap:balance]">
                  {book.title}
                </h2>

                {/* Author */}
                <p className="text-sm sm:text-base font-semibold text-amber-900">
                  লেখক: <span className="text-stone-900">{book.author}</span>
                </p>
              </div>

              {/* Interactive 3-Format Selector Cards */}
              <div className="space-y-2.5 pt-4 border-t border-stone-100">
                <p className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
                  <span>সংস্করণ নির্বাচন করুন (Format Selection)</span>
                </p>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {formats.map((f) => {
                    const isSelected = currentFormatObj.key === f.key && f.isAvailable;

                    if (!f.isAvailable) {
                      return (
                        <button
                          key={f.key}
                          type="button"
                          disabled
                          className="p-3 rounded-2xl border border-stone-200 bg-stone-100/90 text-stone-400 text-center cursor-not-allowed opacity-75"
                        >
                          <div className="text-xs font-bold text-stone-500">{f.label}</div>
                          <div className="text-base font-bold text-stone-400 mt-1 tabular-nums">
                            NA
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">উপলব্ধ নয়</div>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() =>
                          setSelectedFormatByBook({ bookId: book.id, format: f.key })
                        }
                        className={`p-3 rounded-2xl text-center transition cursor-pointer ${
                          isSelected
                            ? 'border-2 border-emerald-800 bg-emerald-50/90 text-emerald-950 shadow-sm'
                            : 'border border-stone-200 bg-white text-stone-700 hover:border-emerald-500 hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className="text-xs font-bold">{f.label}</div>
                        <div className="text-lg sm:text-xl font-bold font-serif-bn text-emerald-950 mt-0.5 tabular-nums">
                          ₹{f.activePrice}
                        </div>
                        {f.hasDiscount && f.price ? (
                          <div className="text-[11px] text-stone-400 line-through tabular-nums">
                            ₹{f.price}
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-700 font-medium">উপলব্ধ</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Highlighted Price & Coupon Box + Prominent Direct Order CTA */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50/80 via-amber-50/50 to-white border border-emerald-200/80 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-stone-600">
                      নির্বাচিত সংস্করণ: <span className="text-emerald-900 font-bold">{formatBengaliName}</span>
                    </p>
                    <div className="flex items-baseline gap-2.5 mt-1">
                      <span className="text-3xl sm:text-4xl font-bold font-serif-bn text-emerald-950 tabular-nums">
                        {hasAnyAvailableFormat ? `₹${finalPayable}` : 'NA'}
                      </span>
                      {(hasDiscount || couponDiscount > 0) && hasAnyAvailableFormat && (
                        <span className="text-base text-stone-400 line-through tabular-nums">
                          ₹{mrp}
                        </span>
                      )}
                      {couponDiscount > 0 && (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md tabular-nums">
                          কুপনে -₹{couponDiscount}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    সারা ভারতে ফ্রি ডেলিভারি
                  </span>
                </div>

                {/* Coupon Input */}
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="কুপন কোড থাকলে লিখুন (যেমন: HIJIBIJIPRE)"
                        className="w-full bg-white border border-stone-300 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm uppercase outline-none focus:border-emerald-700"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer"
                    >
                      প্রয়োগ করুন
                    </button>
                  </div>

                  {couponMsg && (
                    <p
                      className={`text-xs font-medium flex items-center gap-1.5 ${
                        couponMsg.type === 'success' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {couponMsg.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      <span>{couponMsg.text}</span>
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={!hasAnyAvailableFormat}
                    onClick={() => {
                      setCheckoutSource('direct');
                      setIsCheckoutOpen(true);
                    }}
                    className={`sm:col-span-8 py-3.5 px-5 rounded-2xl text-white font-bold text-sm sm:text-base transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isPreBooking
                        ? 'bg-indigo-700 hover:bg-indigo-800'
                        : 'bg-emerald-800 hover:bg-emerald-900'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      {isPreBooking ? 'এখনই প্রি-বুকিং করুন' : 'এখনই সরাসরি অর্ডার করুন'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!hasAnyAvailableFormat}
                    onClick={handleAddToCart}
                    className="sm:col-span-4 py-3.5 px-4 rounded-2xl bg-white hover:bg-amber-50 text-emerald-950 border border-emerald-800/30 font-semibold text-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingBag className="w-4 h-4 text-emerald-800 shrink-0" />
                    <span>কার্টে যোগ করুন</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Synopsis (কাহিনী সংক্ষেপ) */}
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-5 sm:p-7 space-y-3">
              <h3 className="text-lg sm:text-xl font-bold font-serif-bn text-stone-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-800" />
                <span>কাহিনী সংক্ষেপ</span>
              </h3>
              <p className="text-sm sm:text-base text-stone-700 leading-relaxed whitespace-pre-line">
                {book.description ||
                  'হিজিবিজি পাবলিশার্স-এর মৌলিক সাহিত্য সম্ভার। উৎকৃষ্ট কাগজ ও দৃষ্টিনন্দন বাঁধাইয়ে প্রকাশিত এই বইটি পাঠকদের মন জয় করবে।'}
              </p>
            </div>

            {/* 6-Card Book Details Grid (বইটির বিস্তারিত তথ্য) */}
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-5 sm:p-7 space-y-4">
              <h3 className="text-lg sm:text-xl font-bold font-serif-bn text-stone-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-800" />
                <span>বইটির বিস্তারিত তথ্য (Book Details)</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {bookDetailCards.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl bg-stone-50/90 border border-stone-200/80 p-3.5 space-y-1.5 hover:border-emerald-300 transition"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                        <IconComponent className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <p className="text-sm font-bold text-stone-900 break-words leading-snug tabular-nums">
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer onOpenPolicy={setActivePolicy} />

      {/* Sample PDF Modal */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50">
              <div className="min-w-0">
                <h4 className="font-bold font-serif-bn text-base sm:text-lg text-stone-900 truncate">
                  {book.title} — স্যাম্পল প্রিভিউ
                </h4>
                <p className="text-xs text-stone-500">{book.author}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {book.pdf_url && (
                  <a
                    href={book.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-2 rounded-xl inline-flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>নতুন ট্যাবে খুলুন</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPdfModalOpen(false)}
                  aria-label="প্রিভিউ বন্ধ করুন"
                  className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-stone-100 overflow-hidden min-h-[380px] sm:min-h-[540px] flex items-center justify-center">
              {book.pdf_url ? (
                <iframe
                  src={book.pdf_url}
                  title={`${book.title} Sample PDF`}
                  className="w-full h-[70vh] border-0"
                />
              ) : (
                <div className="text-center p-8 max-w-md space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h5 className="font-bold font-serif-bn text-lg text-stone-900">
                    স্যাম্পল PDF শীঘ্রই যুক্ত হচ্ছে
                  </h5>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    এই বইটির প্রথম কয়েক পাতার প্রিভিউ PDF এখনো আপলোড করা হয়নি। আপনি সরাসরি অর্ডার করতে পারেন অথবা হোয়াটসঅ্যাপে আমাদের সাথে যোগাযোগ করতে পারেন।
                  </p>
                  <button
                    type="button"
                    onClick={() => setPdfModalOpen(false)}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    ঠিক আছে
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleCartCouponApply}
        onRemoveCoupon={() => setAppliedCoupon(null)}
        onOpenCheckout={() => {
          setIsCartOpen(false);
          setCheckoutSource('cart');
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal (Cashfree v3 SDK Flow) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        orderItemsSummary={
          checkoutSource === 'direct'
            ? orderSummaryString
            : cart
                .map(
                  (i) =>
                    `${i.title} (${i.format}) (x${i.qty})${i.isPreBooking ? ' [Pre-Booking]' : ''}`
                )
                .join(', ')
        }
        totalAmount={checkoutSource === 'direct' ? finalPayable : cartTotalPayable}
        onOrderSuccess={(orderId, summary, amount) => {
          setIsCheckoutOpen(false);
          if (checkoutSource === 'cart') {
            setCart([]);
            setAppliedCoupon(null);
          }
          setSuccessModalData({
            isOpen: true,
            orderId,
            itemsSummary: summary,
            amount,
          });
        }}
      />

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={successModalData.isOpen}
        onClose={() => setSuccessModalData((prev) => ({ ...prev, isOpen: false }))}
        orderId={successModalData.orderId}
        itemsSummary={successModalData.itemsSummary}
        amount={successModalData.amount}
      />

      {/* Policy Modal */}
      <PolicyModal type={activePolicy} onClose={() => setActivePolicy(null)} />
    </div>
  );
}
