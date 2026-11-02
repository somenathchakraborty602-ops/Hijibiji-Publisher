'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldAlert,
  ExternalLink,
  PackageCheck,
  BookOpen,
  TicketPercent,
  RotateCw,
  BookMarked,
  Layers,
  PlusCircle,
  Edit,
  Trash2,
  Check,
  Tag,
  Phone,
  FileText,
  UploadCloud,
  LogOut,
  Search,
  MessageCircle,
} from 'lucide-react';
import { supabase, Book, Coupon, Order, INITIAL_BOOKS } from '@/lib/supabase';

const ADMIN_PIN = 'some@1051';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('hijibiji_admin_auth') === 'true';
      } catch {}
    }
    return false;
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Active tab: 'orders' | 'books' | 'coupons'
  const [activeTab, setActiveTab] = useState<'orders' | 'books' | 'coupons'>('orders');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');

  // Books State
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [savingBook, setSavingBook] = useState(false);

  // Book Form State
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookIsbn, setBookIsbn] = useState('');
  const [priceEbook, setPriceEbook] = useState('');
  const [discountEbook, setDiscountEbook] = useState('');
  const [pricePaperback, setPricePaperback] = useState('');
  const [discountPaperback, setDiscountPaperback] = useState('');
  const [priceHardcover, setPriceHardcover] = useState('');
  const [discountHardcover, setDiscountHardcover] = useState('');
  const [bookDesc, setBookDesc] = useState('');
  const [existingCoverUrl, setExistingCoverUrl] = useState('');
  const [existingPdfUrl, setExistingPdfUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponPct, setCouponPct] = useState('');
  const [couponMin, setCouponMin] = useState('0');

  // --- Orders Logic ---
  const loadOrders = React.useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.warn('Orders fetch note:', err);
      if (orders.length === 0) {
        setOrders([
          {
            id: 'HB_SAMPLE_01',
            created_at: new Date().toISOString(),
            customer_name: 'অনির্বাণ সেন',
            customer_phone: '9830123456',
            shipping_address: '১২/বি, কলেজ স্ট্রিট, কলকাতা, পিন: 700073',
            total_amount: 210,
            order_items: 'শিমলায় সংকট (Paperback) x1',
            payment_status: 'SUCCESS',
          },
        ]);
      }
    } finally {
      setOrdersLoading(false);
    }
  }, [orders.length]);

  // --- Books Logic ---
  const loadBooks = React.useCallback(async () => {
    setBooksLoading(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setBooks(data);
      } else {
        setBooks(INITIAL_BOOKS);
      }
    } catch {
      setBooks(INITIAL_BOOKS);
    } finally {
      setBooksLoading(false);
    }
  }, []);

  // --- Coupons Logic ---
  const loadCoupons = React.useCallback(async () => {
    setCouponsLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setCoupons(data);
      } else {
        setCoupons([
          {
            code: 'HIJIBIJIPRE',
            discount_type: 'percentage',
            discount_value: 40,
            min_order_value: 0,
            is_active: true,
          },
          {
            code: 'BOIPROKASH10',
            discount_type: 'percentage',
            discount_value: 10,
            min_order_value: 0,
            is_active: true,
          },
        ]);
      }
    } catch {
      setCoupons([]);
    } finally {
      setCouponsLoading(false);
    }
  }, []);

  // Fetch data on login
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      loadOrders();
      loadBooks();
      loadCoupons();
    }, 0);
    return () => clearTimeout(timer);
  }, [isAuthenticated, loadOrders, loadBooks, loadCoupons]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
      try {
        sessionStorage.setItem('hijibiji_admin_auth', 'true');
      } catch {}
    } else {
      setPinError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPinInput('');
    try {
      sessionStorage.removeItem('hijibiji_admin_auth');
    } catch {}
  };

  const handleOrderStatusChange = async (orderId: string, actionValue: string) => {
    if (actionValue === 'DELETE') {
      if (!confirm('আপনি কি নিশ্চিত এই অর্ডারটি স্থায়ীভাবে মুছে ফেলতে চান?')) return;
      try {
        await supabase.from('orders').delete().eq('id', orderId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } catch (e: any) {
        alert('অর্ডার ডিলিট করতে সমস্যা হয়েছে: ' + e?.message);
      }
    } else {
      try {
        await supabase
          .from('orders')
          .update({ payment_status: actionValue })
          .eq('id', orderId);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, payment_status: actionValue } : o))
        );
      } catch (e: any) {
        alert('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে: ' + e?.message);
      }
    }
  };

  const startEditBook = (book: Book) => {
    setEditBookId(book.id);
    setExistingCoverUrl(book.cover_image_url || '');
    setExistingPdfUrl(book.pdf_url || '');
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setBookIsbn(book.isbn || '');
    setPriceEbook(book.price_ebook ? String(book.price_ebook) : '');
    setDiscountEbook(book.discount_ebook ? String(book.discount_ebook) : '');
    setPricePaperback(
      book.price_paperback ? String(book.price_paperback) : book.price ? String(book.price) : ''
    );
    setDiscountPaperback(
      book.discount_paperback
        ? String(book.discount_paperback)
        : book.discount_price
        ? String(book.discount_price)
        : ''
    );
    setPriceHardcover(book.price_hardcover ? String(book.price_hardcover) : '');
    setDiscountHardcover(book.discount_hardcover ? String(book.discount_hardcover) : '');
    setBookDesc(book.description || '');
    setCoverFile(null);
    setPdfFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetBookForm = () => {
    setEditBookId(null);
    setExistingCoverUrl('');
    setExistingPdfUrl('');
    setBookTitle('');
    setBookAuthor('');
    setBookIsbn('');
    setPriceEbook('');
    setDiscountEbook('');
    setPricePaperback('');
    setDiscountPaperback('');
    setPriceHardcover('');
    setDiscountHardcover('');
    setBookDesc('');
    setCoverFile(null);
    setPdfFile(null);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBook(true);

    try {
      let coverUrl = existingCoverUrl;
      let pdfUrl = existingPdfUrl;

      // Upload Cover File if provided
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: upErr } = await supabase.storage
          .from('book-covers')
          .upload(fileName, coverFile);

        if (!upErr) {
          const { data: pubData } = supabase.storage
            .from('book-covers')
            .getPublicUrl(fileName);
          coverUrl = pubData.publicUrl;
        } else {
          console.warn('Storage upload note:', upErr.message);
        }
      }

      // Upload PDF File if provided
      if (pdfFile) {
        const pExt = pdfFile.name.split('.').pop();
        const pName = `pdf-${Date.now()}-${Math.random().toString(36).substring(2)}.${pExt}`;
        const { error: pErr } = await supabase.storage
          .from('book-pdfs')
          .upload(pName, pdfFile);

        if (!pErr) {
          const { data: pPubData } = supabase.storage
            .from('book-pdfs')
            .getPublicUrl(pName);
          pdfUrl = pPubData.publicUrl;
        } else {
          console.warn('PDF storage upload note:', pErr.message);
        }
      }

      const pEbook = priceEbook ? Number(priceEbook) : null;
      const dEbook = discountEbook ? Number(discountEbook) : null;
      const pPaper = pricePaperback ? Number(pricePaperback) : null;
      const dPaper = discountPaperback ? Number(discountPaperback) : null;
      const pHard = priceHardcover ? Number(priceHardcover) : null;
      const dHard = discountHardcover ? Number(discountHardcover) : null;

      const basePrice = pPaper || pEbook || pHard || 300;
      const baseDiscount = dPaper || dEbook || dHard || null;

      const bookPayload = {
        title: bookTitle.trim(),
        author: bookAuthor.trim(),
        isbn: bookIsbn.trim() || null,
        price: basePrice,
        discount_price: baseDiscount,
        price_ebook: pEbook,
        discount_ebook: dEbook,
        price_paperback: pPaper,
        discount_paperback: dPaper,
        price_hardcover: pHard,
        discount_hardcover: dHard,
        description: bookDesc.trim(),
        cover_image_url: coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
        pdf_url: pdfUrl || null,
      };

      if (editBookId) {
        const { error } = await supabase
          .from('books')
          .update(bookPayload)
          .eq('id', editBookId);

        if (error) throw error;
        alert('বইটির তথ্য ও ফরম্যাট মূল্য সফলভাবে আপডেট হয়েছে!');
      } else {
        const { error } = await supabase.from('books').insert(bookPayload);
        if (error) throw error;
        alert('নতুন বইটি সফলভাবে ক্যাটালগে যুক্ত হয়েছে!');
      }

      resetBookForm();
      loadBooks();
    } catch (err: any) {
      alert('বই সংরক্ষণে সমস্যা হয়েছে: ' + err?.message);
    } finally {
      setSavingBook(false);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত বইটি ক্যাটালগ থেকে মুছে ফেলতে চান?')) return;
    try {
      await supabase.from('books').delete().eq('id', id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (e: any) {
      alert('বই মুছতে সমস্যা হয়েছে: ' + e?.message);
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    const pct = Number(couponPct);
    const min = Number(couponMin || 0);

    try {
      const { error } = await supabase.from('coupons').insert({
        code,
        discount_type: 'percentage',
        discount_value: pct,
        min_order_value: min,
        is_active: true,
      });

      if (error) throw error;
      setCouponCode('');
      setCouponPct('');
      setCouponMin('0');
      loadCoupons();
      alert('কুপন সফলভাবে তৈরি হয়েছে!');
    } catch (e: any) {
      alert('কুপন তৈরি করতে ত্রুটি: ' + e?.message);
    }
  };

  const handleDeleteCoupon = async (id?: string, code?: string) => {
    if (!confirm('কুপনটি বন্ধ করতে চান?')) return;
    try {
      if (id) {
        await supabase.from('coupons').delete().eq('id', id);
      } else if (code) {
        await supabase.from('coupons').delete().eq('code', code);
      }
      setCoupons((prev) => prev.filter((c) => (id ? c.id !== id : c.code !== code)));
    } catch (e: any) {
      alert('ত্রুটি: ' + e?.message);
    }
  };

  // --- Filtered Orders ---
  const filteredOrders = orders.filter((o) => {
    const q = orderSearch.toLowerCase();
    return (
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.toLowerCase().includes(q) ||
      o.order_items?.toLowerCase().includes(q) ||
      o.id?.toLowerCase().includes(q) ||
      o.shipping_address?.toLowerCase().includes(q)
    );
  });

  // Login Gate
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-stone-900/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center border border-amber-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-serif-bn text-stone-900">অ্যাডমিন প্রবেশ</h2>
          <p className="text-xs text-stone-500 mt-1 mb-6">হিজিবিজি পাবলিশার্স ব্যাকঅফিস</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                required
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="গোপন পাসওয়ার্ড দিন"
                className="w-full text-center border border-stone-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-700 outline-none"
              />
              {pinError && (
                <p className="text-xs text-red-600 mt-1">ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-3 rounded-xl transition shadow-md cursor-pointer"
            >
              প্রবেশ করুন
            </button>
            <div className="pt-2">
              <Link href="/" className="text-xs text-stone-500 hover:text-stone-800 underline">
                ওয়েবসাইটে ফিরে যান
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col">
      {/* Topbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 p-0.5 overflow-hidden flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="হিজিবিজি"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold font-serif-bn text-emerald-950">
                হিজিবিজি পাবলিশার্স
              </h1>
              <p className="text-[11px] text-stone-500">কন্ট্রোল ড্যাশবোর্ড</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              target="_blank"
              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>ওয়েবসাইট দেখুন</span>
            </Link>
            <button
              onClick={handleLogout}
              type="button"
              className="text-xs text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl font-medium transition flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>লগআউট</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 flex-1 w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
          <button
            onClick={() => setActiveTab('orders')}
            type="button"
            className={`px-4 py-2 font-semibold text-xs sm:text-sm rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>গ্রাহকদের অর্ডারসমূহ ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('books')}
            type="button"
            className={`px-4 py-2 font-semibold text-xs sm:text-sm rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'books'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>বই ক্যাটালগ ও এডিট ({books.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            type="button"
            className={`px-4 py-2 font-semibold text-xs sm:text-sm rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100'
            }`}
          >
            <TicketPercent className="w-4 h-4" />
            <span>কুপন কোড ({coupons.length})</span>
          </button>
        </div>

        {/* 1. ORDERS SECTION */}
        {activeTab === 'orders' && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold font-serif-bn text-stone-900">
                  সাম্প্রতিক অর্ডার ও কুরিয়ার তথ্য
                </h3>
                <p className="text-xs text-stone-500">
                  কোন বই ও ফরম্যাট অর্ডার হয়েছে, ঠিকানা ও পেমেন্ট হিস্ট্রি
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="অর্ডার খুঁজুন..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="text-xs border border-stone-300 rounded-xl px-3 py-2 pl-8 focus:border-emerald-700 outline-none bg-white"
                  />
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                </div>

                <button
                  onClick={loadOrders}
                  type="button"
                  className="text-xs bg-white border border-stone-300 hover:bg-stone-50 px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                  <span>রিফ্রেশ</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 uppercase font-semibold">
                    <tr>
                      <th className="p-3.5">তারিখ</th>
                      <th className="p-3.5">অর্ডারকৃত বই ও সংস্করণ</th>
                      <th className="p-3.5">গ্রাহকের নাম ও ফোন</th>
                      <th className="p-3.5">ডেলিভারি ঠিকানা ও পিন</th>
                      <th className="p-3.5">অ্যামাউন্ট</th>
                      <th className="p-3.5">স্ট্যাটাস / অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {ordersLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-400">
                          অর্ডার রিফ্রেশ হচ্ছে...
                        </td>
                      </tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-400">
                          এখনও কোনো অর্ডার পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const dateStr = new Date(order.created_at).toLocaleDateString('bn-BD', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                        const currentStatus = (order.payment_status || 'PENDING').toUpperCase();

                        return (
                          <tr key={order.id} className="hover:bg-amber-50/30 transition">
                            <td className="p-3.5 text-stone-500 whitespace-nowrap">{dateStr}</td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-950 font-bold px-3 py-1.5 rounded-lg text-xs border border-emerald-200 shadow-2xs">
                                <BookMarked className="w-3.5 h-3.5 text-emerald-800" />
                                <span>{order.order_items || 'হিজিবিজি বই সম্ভার'}</span>
                              </span>
                            </td>
                            <td className="p-3.5 font-medium text-stone-900">
                              <div className="font-bold">{order.customer_name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <a
                                  href={`tel:${order.customer_phone}`}
                                  className="text-emerald-700 underline text-xs font-semibold flex items-center gap-1"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{order.customer_phone}</span>
                                </a>
                                <a
                                  href={`https://wa.me/91${order.customer_phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700"
                                  title="WhatsApp এ বার্তা দিন"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </a>
                              </div>
                            </td>
                            <td className="p-3.5 max-w-xs text-stone-600 leading-snug">
                              {order.shipping_address}
                            </td>
                            <td className="p-3.5 font-bold font-serif-bn text-stone-900 whitespace-nowrap text-sm">
                              ₹{order.total_amount}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <select
                                value={currentStatus}
                                onChange={(e) =>
                                  handleOrderStatusChange(order.id, e.target.value)
                                }
                                className={`text-xs font-semibold rounded-xl px-2.5 py-1.5 border outline-none cursor-pointer transition shadow-2xs ${
                                  currentStatus === 'DELIVERED' || currentStatus === 'SUCCESS'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                <option value="PENDING">⏳ Pending (পেন্ডিং)</option>
                                <option value="SUCCESS">💳 Paid / Success (পরিশোধিত)</option>
                                <option value="DELIVERED">✓ Delivered (ডেলিভারড)</option>
                                <option value="DELETE" className="text-red-600 font-bold">
                                  🗑 Delete (মুছে ফেলুন)
                                </option>
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 2. BOOKS SECTION */}
        {activeTab === 'books' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form */}
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs h-fit space-y-4">
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <h4 className="font-bold font-serif-bn text-base text-stone-900 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-emerald-800" />
                    <span>{editBookId ? 'বইয়ের তথ্য এডিট করুন' : 'নতুন বই যোগ করুন'}</span>
                  </h4>
                  {editBookId && (
                    <button
                      onClick={resetBookForm}
                      type="button"
                      className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
                    >
                      বাতিল
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveBook} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold mb-1 text-stone-700">বইয়ের নাম *</label>
                    <input
                      required
                      type="text"
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      placeholder="যেমন: চাঁদের পাহাড়"
                      className="w-full border border-stone-300 rounded-xl p-2.5 outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-stone-700">লেখকের নাম *</label>
                    <input
                      required
                      type="text"
                      value={bookAuthor}
                      onChange={(e) => setBookAuthor(e.target.value)}
                      placeholder="যেমন: বিভূতিভূষণ বন্দ্যোপাধ্যায়"
                      className="w-full border border-stone-300 rounded-xl p-2.5 outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-stone-700">ISBN নম্বর</label>
                    <input
                      type="text"
                      value={bookIsbn}
                      onChange={(e) => setBookIsbn(e.target.value)}
                      placeholder="যেমন: 978-81-912345-6-7"
                      className="w-full border border-stone-300 rounded-xl p-2.5 outline-none focus:border-emerald-700"
                    />
                  </div>

                  {/* Format Based Pricing */}
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                    <p className="font-bold text-stone-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-800" />
                      <span>ফরম্যাট ভিত্তিক মূল্য (না থাকলে ফাঁকা রাখুন = NA)</span>
                    </p>

                    {/* E-Book */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-medium text-[11px] text-stone-600">
                          E-Book MRP (₹)
                        </label>
                        <input
                          type="number"
                          value={priceEbook}
                          onChange={(e) => setPriceEbook(e.target.value)}
                          placeholder="NA (ফাঁকা)"
                          className="w-full border border-stone-300 rounded-xl p-2 outline-none focus:border-emerald-700 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-[11px] text-stone-600">
                          E-Book অফার (₹)
                        </label>
                        <input
                          type="number"
                          value={discountEbook}
                          onChange={(e) => setDiscountEbook(e.target.value)}
                          placeholder="ছাড়ের দাম"
                          className="w-full border border-stone-300 rounded-xl p-2 outline-none focus:border-emerald-700 bg-white"
                        />
                      </div>
                    </div>

                    {/* Paperback */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-medium text-[11px] text-stone-600">
                          Paperback MRP (₹)
                        </label>
                        <input
                          type="number"
                          value={pricePaperback}
                          onChange={(e) => setPricePaperback(e.target.value)}
                          placeholder="যেমন: ৩৫০"
                          className="w-full border border-stone-300 rounded-xl p-2 outline-none focus:border-emerald-700 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-[11px] text-stone-600">
                          Paperback অফার (₹)
                        </label>
                        <input
                          type="number"
                          value={discountPaperback}
                          onChange={(e) => setDiscountPaperback(e.target.value)}
                          placeholder="যেমন: ২১০"
                          className="w-full border border-stone-300 rounded-xl p-2 outline-none focus:border-emerald-700 bg-white"
                        />
                      </div>
                    </div>

                    {/* Hardcover */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-medium text-[11px] text-stone-600">
                          Hardcover MRP (₹)
                        </label>
                        <input
                          type="number"
                          value={priceHardcover}
                          onChange={(e) => setPriceHardcover(e.target.value)}
                          placeholder="NA (ফাঁকা)"
                          className="w-full border border-stone-300 rounded-xl p-2 outline-none focus:border-emerald-700 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-[11px] text-stone-600">
                          Hardcover অফার (₹)
                        </label>
                        <input
                          type="number"
                          value={discountHardcover}
                          onChange={(e) => setDiscountHardcover(e.target.value)}
                          placeholder="ছাড়ের দাম"
                          className="w-full border border-stone-300 rounded-xl p-2 outline-none focus:border-emerald-700 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cover image upload */}
                  <div>
                    <label className="block font-semibold mb-1 text-stone-700">
                      কভার ছবি আপলোড করুন
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                      className="w-full border border-stone-300 rounded-xl p-2 text-stone-600 bg-stone-50"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      {existingCoverUrl
                        ? 'নতুন ছবি দিলে আপলোড হবে, ফাঁকা রাখলে পূর্বের ছবিটি বহাল থাকবে।'
                        : 'সরাসরি ডিভাইস থেকে ছবি বাছুন।'}
                    </p>
                  </div>

                  {/* Sample PDF upload */}
                  <div>
                    <label className="block font-semibold mb-1 text-stone-700">
                      স্যাম্পল/প্রিভিউ PDF আপলোড করুন
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="w-full border border-stone-300 rounded-xl p-2 text-stone-600 bg-stone-50"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      {existingPdfUrl
                        ? 'ইতিমধ্যে PDF যুক্ত আছে। পরিবর্তন করতে চাইলে নতুন ফাইল নির্বাচন করুন।'
                        : 'পাঠকদের পড়ার জন্য বইটির স্যাম্পল PDF ফাইল নির্বাচন করুন।'}
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-stone-700">
                      বইয়ের বর্ণনা / ব্লার্ব
                    </label>
                    <textarea
                      rows={3}
                      value={bookDesc}
                      onChange={(e) => setBookDesc(e.target.value)}
                      placeholder="বইয়ের বিষয়বস্তু সম্পর্কে দু-চার লাইন..."
                      className="w-full border border-stone-300 rounded-xl p-2.5 outline-none focus:border-emerald-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingBook}
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {savingBook
                        ? 'সংরক্ষণ হচ্ছে...'
                        : editBookId
                        ? 'আপডেট সংরক্ষণ করুন'
                        : 'বইটি প্রকাশ করুন'}
                    </span>
                  </button>
                </form>
              </div>

              {/* Books List */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold font-serif-bn text-base text-stone-900">
                    বর্তমান লাইভ বইসমূহ ({books.length})
                  </h4>
                  <button
                    onClick={loadBooks}
                    type="button"
                    className="text-xs text-stone-500 hover:text-stone-800 underline flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" /> রিফ্রেশ
                  </button>
                </div>

                {booksLoading ? (
                  <p className="text-xs text-stone-400">বই লোড হচ্ছে...</p>
                ) : books.length === 0 ? (
                  <p className="text-xs text-stone-400">ক্যাটালগে কোনো বই নেই।</p>
                ) : (
                  <div className="space-y-3">
                    {books.map((b) => {
                      const ebookStr =
                        b.price_ebook && Number(b.price_ebook) > 0
                          ? `E-Book: ₹${b.discount_ebook || b.price_ebook}`
                          : 'E-Book: NA';
                      const paperPrice = b.price_paperback || b.price;
                      const paperStr =
                        paperPrice && Number(paperPrice) > 0
                          ? `Paperback: ₹${b.discount_paperback || b.discount_price || paperPrice}`
                          : 'Paperback: NA';
                      const hardStr =
                        b.price_hardcover && Number(b.price_hardcover) > 0
                          ? `Hardcover: ₹${b.discount_hardcover || b.price_hardcover}`
                          : 'Hardcover: NA';

                      return (
                        <div
                          key={b.id}
                          className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between gap-4 hover:border-amber-200 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-16 relative rounded-lg bg-stone-100 overflow-hidden shrink-0">
                              <Image
                                src={
                                  b.cover_image_url ||
                                  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=150&q=80'
                                }
                                alt={b.title}
                                fill
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold font-serif-bn text-sm text-stone-900 truncate">
                                {b.title}
                              </h5>
                              <p className="text-xs text-stone-500">{b.author}</p>
                              <div className="flex flex-wrap gap-1.5 mt-1 text-[10px]">
                                <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-medium border border-blue-100">
                                  {ebookStr}
                                </span>
                                <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-medium border border-emerald-100">
                                  {paperStr}
                                </span>
                                <span className="bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded font-medium border border-purple-100">
                                  {hardStr}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => startEditBook(b)}
                              type="button"
                              className="text-xs bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-stone-700 px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>এডিট</span>
                            </button>
                            <button
                              onClick={() => handleDeleteBook(b.id)}
                              type="button"
                              className="text-xs text-red-600 hover:bg-red-50 p-2 rounded-xl font-medium transition cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 3. COUPONS SECTION */}
        {activeTab === 'coupons' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Coupon Form */}
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs h-fit space-y-4">
                <h4 className="font-bold font-serif-bn text-base text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-800" />
                  <span>নতুন কুপন তৈরি করুন</span>
                </h4>

                <form onSubmit={handleAddCoupon} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold mb-1 text-stone-700">কুপন কোড *</label>
                    <input
                      required
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="যেমন: HIJIBIJIPRE"
                      className="w-full uppercase border border-stone-300 rounded-xl p-2.5 outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold mb-1 text-stone-700">
                        ছাড়ের শতাংশ (%) *
                      </label>
                      <input
                        required
                        type="number"
                        value={couponPct}
                        onChange={(e) => setCouponPct(e.target.value)}
                        placeholder="40"
                        className="w-full border border-stone-300 rounded-xl p-2.5 outline-none focus:border-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-stone-700">
                        ন্যূনতম অর্ডার (₹)
                      </label>
                      <input
                        type="number"
                        value={couponMin}
                        onChange={(e) => setCouponMin(e.target.value)}
                        placeholder="0"
                        className="w-full border border-stone-300 rounded-xl p-2.5 outline-none focus:border-emerald-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-3 rounded-xl transition shadow-md cursor-pointer"
                  >
                    কুপন চালু করুন
                  </button>
                </form>
              </div>

              {/* Coupons List */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="font-bold font-serif-bn text-base text-stone-900">
                  সক্রিয় কুপন কোড ({coupons.length})
                </h4>

                {couponsLoading ? (
                  <p className="text-xs text-stone-400">কুপন তালিকা লোড হচ্ছে...</p>
                ) : coupons.length === 0 ? (
                  <p className="text-xs text-stone-400">কোনো কুপন তৈরি করা নেই।</p>
                ) : (
                  <div className="space-y-3">
                    {coupons.map((c) => (
                      <div
                        key={c.id || c.code}
                        className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-sm tracking-wider bg-stone-100 text-stone-900 px-3 py-1 rounded-md border border-stone-200">
                            {c.code}
                          </span>
                          <p className="text-xs text-stone-600 mt-1.5">
                            {c.discount_value}% ছাড় (ন্যূনতম অর্ডার ₹{c.min_order_value})
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteCoupon(c.id, c.code)}
                          type="button"
                          className="text-xs text-red-600 hover:bg-red-50 p-2 rounded-xl font-medium transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>বাতিল</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
