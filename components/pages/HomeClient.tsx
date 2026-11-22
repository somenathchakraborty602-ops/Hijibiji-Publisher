'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Truck,
  ShieldCheck,
  Tag,
  BookOpen,
  Plus,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Phone,
  CheckCircle2,
  Search,
  Zap,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { CartDrawer, CartItem } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { PaymentSuccessModal } from '@/components/PaymentSuccessModal';
import { PolicyModal, PolicyType } from '@/components/PolicyModal';
import { Footer } from '@/components/Footer';
import { HeroSlider } from '@/components/HeroSlider';
import { BookStatusBadge } from '@/components/BookStatusBadge';
import {
  supabase,
  Book,
  Coupon,
  INITIAL_BOOKS,
  BannerSlide,
  BookFormatKey,
  getBookFormats,
  getDefaultAvailableFormat,
  isPreBookingStatus,
  fetchBannerSlides,
} from '@/lib/supabase';

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem('hijibiji_cart');
        if (savedCart) return JSON.parse(savedCart);
      } catch (e) {
        console.warn('Could not read saved cart:', e);
      }
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<Record<string, BookFormatKey>>({});
  const [directBuyItem, setDirectBuyItem] = useState<{
    summary: string;
    amount: number;
  } | null>(null);

  // Success modal state
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

  // Policy modal
  const [activePolicy, setActivePolicy] = useState<PolicyType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hijibiji_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Could not save cart:', e);
    }
  }, [cart]);

  // Fetch books from Supabase
  useEffect(() => {
    async function fetchBooks() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setBooks(data);
        } else {
          // fallback to INITIAL_BOOKS if table is empty or error
          setBooks(INITIAL_BOOKS);
        }
      } catch (err) {
        console.warn('Error fetching books, using default catalogue:', err);
        setBooks(INITIAL_BOOKS);
      } finally {
        setLoading(false);
      }
    }

    fetchBooks();
  }, []);

  // Fetch active banners from Supabase 'banners' table (ordered by sort_order, up to 3)
  useEffect(() => {
    async function loadBanners() {
      try {
        setBannersLoading(true);
        const loaded = await fetchBannerSlides(3);
        setSlides(loaded);
      } catch (err) {
        console.warn('Could not fetch banners from Supabase:', err);
        setSlides([]);
      } finally {
        setBannersLoading(false);
      }
    }

    loadBanners();

    const handleBannersSync = () => {
      loadBanners();
    };

    window.addEventListener('hijibiji_banners_updated', handleBannersSync);
    window.addEventListener('storage', handleBannersSync);
    return () => {
      window.removeEventListener('hijibiji_banners_updated', handleBannersSync);
      window.removeEventListener('storage', handleBannersSync);
    };
  }, []);

  // Sync cart clearing when OrderReturnHandler confirms payment return
  useEffect(() => {
    const handleCartCleared = () => {
      setCart([]);
      setAppliedCoupon(null);
    };
    window.addEventListener('hijibiji_cart_cleared', handleCartCleared);
    return () => {
      window.removeEventListener('hijibiji_cart_cleared', handleCartCleared);
    };
  }, []);

  // Cart operations
  const handleAddToCart = (book: Book, formatKey?: BookFormatKey) => {
    const formats = getBookFormats(book);
    const targetKey = formatKey || selectedFormats[book.id] || getDefaultAvailableFormat(book);
    const chosen = formats.find((f) => f.key === targetKey && f.isAvailable) || formats.find((f) => f.isAvailable);
    if (!chosen || chosen.activePrice === null) return;

    const cartItemId = `${book.id}-${chosen.bengaliName}`;
    const isPreBooking = isPreBookingStatus(book.book_status);

    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.id === cartItemId
            ? { ...item, qty: item.qty + 1, isPreBooking }
            : item
        );
      } else {
        return [
          ...prev,
          {
            id: cartItemId,
            bookId: book.id,
            title: book.title,
            author: book.author,
            format: chosen.bengaliName,
            price: chosen.activePrice!,
            image: book.cover_image_url,
            qty: 1,
            isPreBooking,
          },
        ];
      }
    });

    setIsCartOpen(true);
  };

  const handleDirectBuy = (book: Book, formatKey?: BookFormatKey) => {
    const formats = getBookFormats(book);
    const targetKey = formatKey || selectedFormats[book.id] || getDefaultAvailableFormat(book);
    const chosen = formats.find((f) => f.key === targetKey && f.isAvailable) || formats.find((f) => f.isAvailable);
    if (!chosen || chosen.activePrice === null) return;

    const isPreBooking = isPreBookingStatus(book.book_status);

    setDirectBuyItem({
      summary: `${book.title} (${chosen.bengaliName}) (x1)${isPreBooking ? ' [Pre-Booking]' : ''}`,
      amount: chosen.activePrice,
    });
    setIsCheckoutOpen(true);
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

  // Coupon validation
  const handleApplyCoupon = async (
    code: string
  ): Promise<{ success: boolean; message: string }> => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        // Fallback demo coupon logic if table hasn't added coupon yet
        if (code === 'HIJIBIJIPRE' || code === 'BOIPROKASH10') {
          const fallbackCoupon: Coupon = {
            code,
            discount_type: 'percentage',
            discount_value: code === 'HIJIBIJIPRE' ? 40 : 10,
            min_order_value: 0,
            is_active: true,
          };
          setAppliedCoupon(fallbackCoupon);
          return {
            success: true,
            message: `কুপন সফলভাবে যুক্ত হয়েছে! ${fallbackCoupon.discount_value}% ছাড় প্রযোজ্য।`,
          };
        }
        return { success: false, message: 'অবৈধ বা মেয়াদোত্তীর্ণ কুপন কোড।' };
      }

      if (subtotal < (data.min_order_value || 0)) {
        return {
          success: false,
          message: `ন্যূনতম ₹${data.min_order_value} টাকার অর্ডারে কুপন প্রযোজ্য।`,
        };
      }

      setAppliedCoupon(data);
      return {
        success: true,
        message: `কুপন সফলভাবে যুক্ত হয়েছে! ${data.discount_value}% ছাড় প্রযোজ্য।`,
      };
    } catch {
      return { success: false, message: 'কুপন যাচাই করতে সমস্যা হয়েছে।' };
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
  };

  // Get total payable
  const getSubtotal = () => cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const getDiscount = () => {
    const sub = getSubtotal();
    if (!appliedCoupon || sub < (appliedCoupon.min_order_value || 0)) return 0;
    if (appliedCoupon.discount_type === 'percentage' || !appliedCoupon.discount_type) {
      return Math.round((sub * appliedCoupon.discount_value) / 100);
    }
    return Math.min(sub, appliedCoupon.discount_value);
  };
  const getTotalAmount = () => Math.max(0, getSubtotal() - getDiscount());

  // Filter books
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedGenre === 'all') return true;
    if (selectedGenre === 'thriller')
      return b.title.includes('শিমলা') || (b.genre && b.genre.includes('থ্রিলার'));
    if (selectedGenre === 'novel')
      return b.title.includes('ছাদ') || (b.genre && b.genre.includes('উপন্যাস'));
    if (selectedGenre === 'poetry')
      return (b.genre && b.genre.includes('কবিতা')) || b.title.includes('গান');
    return true;
  });

  return (
    <>
      <Navbar
        cartCount={cart.reduce((sum, item) => sum + item.qty, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        activePath="/"
      />

      {/* Dynamic 3-Banner Hero Carousel Slider (with clean fallback if empty) */}
      <section className="max-w-6xl mx-auto px-4 pt-5 sm:pt-6 pb-2 w-full">
        <HeroSlider slides={slides} loading={bannersLoading} />
      </section>

      {/* Main Catalog */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {/* Controls: Search & Category */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-stone-200">
          <div>
            <h3 className="text-xl md:text-2xl font-bold font-serif-bn text-stone-900">
              প্রকাশিত বইসমূহ
            </h3>
            <p className="text-xs text-stone-500">
              আপনার পছন্দের বইটি বেছে নিন ও থলিতে রাখুন অথবা বিস্তারিত দেখুন
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <input
                type="text"
                placeholder="বই বা লেখক খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border border-stone-300 rounded-xl px-3 py-2 pl-8 focus:border-emerald-700 outline-none bg-white"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setSelectedGenre('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedGenre === 'all'
                    ? 'bg-white text-emerald-950 font-bold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                সব
              </button>
              <button
                type="button"
                onClick={() => setSelectedGenre('thriller')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedGenre === 'thriller'
                    ? 'bg-white text-emerald-950 font-bold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                থ্রিলার
              </button>
              <button
                type="button"
                onClick={() => setSelectedGenre('novel')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedGenre === 'novel'
                    ? 'bg-white text-emerald-950 font-bold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                উপন্যাস
              </button>
            </div>
          </div>
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="text-center py-20 text-stone-500 space-y-3">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-800 border-t-transparent rounded-full" />
            <p className="text-sm">বইয়ের তালিকা লোড হচ্ছে...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-16 text-stone-500 bg-white rounded-2xl border border-stone-200 p-8 space-y-3">
            <p className="text-base font-semibold">কোনো বই পাওয়া যায়নি।</p>
            <p className="text-xs text-stone-400">অন্য শব্দ দিয়ে অনুসন্ধান করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => {
              const formats = getBookFormats(book);
              const activeKey = selectedFormats[book.id] || getDefaultAvailableFormat(book);
              const currentFormat =
                formats.find((f) => f.key === activeKey && f.isAvailable) ||
                formats.find((f) => f.isAvailable) ||
                formats[1];

              const displayPrice = currentFormat?.activePrice ?? book.discount_price ?? book.price;
              const originalPrice = currentFormat?.price ?? book.price;
              const hasDiscount = Boolean(
                currentFormat?.hasDiscount ||
                  (originalPrice && displayPrice && displayPrice < originalPrice)
              );

              // Dedicated sales landing page check
              const cleanTitle = (book.title || '').trim();
              let salesHref: string | null = null;
              if (cleanTitle.includes('শিমলা')) {
                salesHref = '/shimlay-sonkot';
              } else if (cleanTitle.includes('ছাদ')) {
                salesHref = '/chad';
              } else {
                salesHref = `/book/${book.id}`;
              }

              return (
                <div
                  key={book.id}
                  className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col hover:shadow-xl hover:border-amber-200 transition duration-300 group"
                >
                  {/* Cover Image Container */}
                  <div className="h-64 sm:h-72 bg-stone-100 overflow-hidden relative">
                    <Link href={salesHref} className="block w-full h-full">
                      <Image
                        src={
                          book.cover_image_url ||
                          'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80'
                        }
                        alt={book.title}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </Link>

                    {/* Top-left Book Status Badge */}
                    <BookStatusBadge
                      status={book.book_status}
                      size="sm"
                      className="absolute top-3 left-3 z-10"
                    />

                    {hasDiscount && (
                      <span className="absolute top-3 right-3 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-md">
                        ছাড়
                      </span>
                    )}

                    {/* Quick Badge */}
                    <span className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-xs text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded">
                      {book.genre || 'মৌলিক প্রকাশনা'}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-amber-900 font-bold tracking-wide">
                          {book.author}
                        </p>
                        {book.isbn && (
                          <span className="text-[10px] font-mono bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                            ISBN: {book.isbn}
                          </span>
                        )}
                      </div>

                      <Link href={salesHref}>
                        <h4 className="text-lg font-bold font-serif-bn text-stone-900 hover:text-emerald-800 transition line-clamp-1">
                          {book.title}
                        </h4>
                      </Link>

                      <p className="text-xs text-stone-600 line-clamp-2 mt-1.5 leading-relaxed">
                        {book.description ||
                          'হিজিবিজি পাবলিশার্স-এর মৌলিক সাহিত্য সম্ভার। উৎকৃষ্ট কাগজ ও দৃষ্টিনন্দন বাঁধাই।'}
                      </p>
                    </div>

                    {/* 3 Formats Selector (E-Book, Paperback, Hardcover) */}
                    <div className="space-y-2.5 pt-2 border-t border-stone-100">
                      <div className="grid grid-cols-3 gap-1.5">
                        {formats.map((f) => {
                          const isSelected = currentFormat?.key === f.key && f.isAvailable;
                          if (!f.isAvailable) {
                            return (
                              <div
                                key={f.key}
                                className="py-1.5 px-1 rounded-xl border border-stone-200 bg-stone-100 text-stone-400 text-center cursor-not-allowed opacity-75"
                              >
                                <div className="text-[10px] font-bold text-stone-500 truncate">
                                  {f.label}
                                </div>
                                <div className="text-xs font-bold text-stone-400">NA</div>
                              </div>
                            );
                          }
                          return (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() =>
                                setSelectedFormats((prev) => ({
                                  ...prev,
                                  [book.id]: f.key,
                                }))
                              }
                              className={`py-1.5 px-1 rounded-xl text-center transition cursor-pointer ${
                                isSelected
                                  ? 'border-2 border-emerald-800 bg-emerald-50 text-emerald-950 shadow-2xs'
                                  : 'border border-stone-200 bg-white text-stone-700 hover:border-emerald-500'
                              }`}
                            >
                              <div className="text-[10px] font-bold truncate">{f.label}</div>
                              <div className="text-xs font-bold text-emerald-900 font-serif-bn">
                                ₹{f.activePrice}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold font-serif-bn text-emerald-950">
                            {displayPrice ? `₹${displayPrice}` : 'NA'}
                          </span>
                          {hasDiscount && originalPrice && (
                            <span className="text-xs text-stone-400 line-through">
                              ₹{originalPrice}
                            </span>
                          )}
                        </div>
                        <Link
                          href={salesHref}
                          className="text-[11px] text-emerald-800 hover:underline font-semibold flex items-center gap-1"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>বিস্তারিত</span>
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleDirectBuy(book, currentFormat?.key)}
                          disabled={!currentFormat?.isAvailable}
                          className={`${
                            isPreBookingStatus(book.book_status)
                              ? 'bg-indigo-700 hover:bg-indigo-800'
                              : 'bg-emerald-800 hover:bg-emerald-900'
                          } disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-2 rounded-xl transition shadow-xs flex items-center justify-center gap-1 cursor-pointer active:scale-98`}
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">
                            {isPreBookingStatus(book.book_status)
                              ? 'এখনই প্রি-বুকিং করুন'
                              : 'সরাসরি কিনুন'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddToCart(book, currentFormat?.key)}
                          disabled={!currentFormat?.isAvailable}
                          className="bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-800 font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-800" />
                          <span>থলিতে রাখুন</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Assurance Features banner */}
        <section className="mt-16 bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-xs">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-lg font-bold font-serif-bn text-stone-900">
              হিজিবিজি পাবলিশার্স থেকে কেনার সুবিধা
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              সরাসরি কোলকাতা প্রকাশনা ভবন থেকে গ্রাহকদের হাতে পৌঁছে দেওয়া হয়
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/60 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 mx-auto flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-stone-900">দ্রুততম ফ্রি কুরিয়ার</h4>
              <p className="text-stone-600">
                ৩-৫ কার্যদিবসের মধ্যে সুরক্ষিত প্যাকেজিং-এ সারা ভারতে ফ্রি ডেলিভারি।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/60 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 mx-auto flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-stone-900">ক্যাশফ্রি সুরক্ষিত পেমেন্ট</h4>
              <p className="text-stone-600">
                UPI (GPay, PhonePe, Paytm), ডেবিট/ক্রেডিট কার্ড ও নেটব্যাঙ্কিং সুবিধাযুক্ত।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100/60 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-stone-900">সহজ সহায়তা ও রিপ্লেসমেন্ট</h4>
              <p className="text-stone-600">
                যেকোনো বইয়ে বাঁধাই বা প্রিন্টিং ত্রুটি থাকলে সরাসরি সম্পূর্ণ ফ্রি রিপ্লেসমেন্ট।
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onOpenCheckout={() => {
          setDirectBuyItem(null);
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setDirectBuyItem(null);
        }}
        orderItemsSummary={
          directBuyItem
            ? directBuyItem.summary
            : cart
                .map(
                  (item) =>
                    `${item.title} (${item.format}) x${item.qty}${
                      item.isPreBooking ? ' [Pre-Booking]' : ''
                    }`
                )
                .join(', ')
        }
        totalAmount={directBuyItem ? directBuyItem.amount : getTotalAmount()}
        onOrderSuccess={(orderId, itemsSummary, amount) => {
          if (!directBuyItem) {
            setCart([]);
            setAppliedCoupon(null);
          }
          setDirectBuyItem(null);
          setSuccessModalData({
            isOpen: true,
            orderId,
            itemsSummary,
            amount,
          });
        }}
      />

      {/* Payment Success Confirmation Modal */}
      <PaymentSuccessModal
        isOpen={successModalData.isOpen}
        onClose={() => setSuccessModalData((prev) => ({ ...prev, isOpen: false }))}
        orderId={successModalData.orderId}
        itemsSummary={successModalData.itemsSummary}
        amount={successModalData.amount}
      />

      {/* Policy Modal */}
      <PolicyModal type={activePolicy} onClose={() => setActivePolicy(null)} />

      {/* Footer */}
      <Footer onOpenPolicy={(type) => setActivePolicy(type)} />
    </>
  );
}
