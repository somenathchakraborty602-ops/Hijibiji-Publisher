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
  Image as ImageIcon,
  Link2,
} from 'lucide-react';
import {
  supabase,
  Book,
  Coupon,
  Order,
  INITIAL_BOOKS,
  BannerSlide,
  BOOK_STATUS_OPTIONS,
  BookStatusValue,
  normalizeBookStatus,
  getBookFormats,
  fetchBannerSlides,
  extractStoragePathFromUrl,
} from '@/lib/supabase';
import { BookStatusBadge } from '@/components/BookStatusBadge';

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

  // Active tab: 'orders' | 'books' | 'coupons' | 'banners'
  const [activeTab, setActiveTab] = useState<'orders' | 'books' | 'coupons' | 'banners'>('orders');

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
  const [bookStatus, setBookStatus] = useState<BookStatusValue>('প্রকাশিত');
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

  // Banners State (Supabase 'banners' table, up to 3 banners)
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  // Banner Upload Form State
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string>('');
  const [bannerLinkUrl, setBannerLinkUrl] = useState<string>('');
  const [bannerSortOrder, setBannerSortOrder] = useState<1 | 2 | 3>(1);

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

  // --- Banners Logic (Supabase 'banners' table) ---
  const loadBanners = React.useCallback(async () => {
    setBannersLoading(true);
    try {
      const loaded = await fetchBannerSlides(3);
      setBanners(loaded);
    } catch (err) {
      console.warn('Could not load banners from Supabase:', err);
    } finally {
      setBannersLoading(false);
    }
  }, []);

  // Fetch data on login
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      loadOrders();
      loadBooks();
      loadCoupons();
      loadBanners();
    }, 0);
    return () => clearTimeout(timer);
  }, [isAuthenticated, loadOrders, loadBooks, loadCoupons, loadBanners]);

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
    const hasExplicitFormats =
      book.price_ebook != null || book.price_paperback != null || book.price_hardcover != null;

    setEditBookId(book.id);
    setExistingCoverUrl(book.cover_image_url || '');
    setExistingPdfUrl(book.pdf_url || '');
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setBookIsbn(book.isbn || '');
    setPriceEbook(book.price_ebook ? String(book.price_ebook) : '');
    setDiscountEbook(book.discount_ebook ? String(book.discount_ebook) : '');
    setPricePaperback(
      hasExplicitFormats
        ? book.price_paperback
          ? String(book.price_paperback)
          : ''
        : book.price
        ? String(book.price)
        : ''
    );
    setDiscountPaperback(
      hasExplicitFormats
        ? book.discount_paperback
          ? String(book.discount_paperback)
          : ''
        : book.discount_price
        ? String(book.discount_price)
        : ''
    );
    setPriceHardcover(book.price_hardcover ? String(book.price_hardcover) : '');
    setDiscountHardcover(book.discount_hardcover ? String(book.discount_hardcover) : '');
    setBookDesc(book.description || '');
    setBookStatus(normalizeBookStatus(book.book_status));
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
    setBookStatus('প্রকাশিত');
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
        book_status: bookStatus,
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

  // --- Banner Photo Upload Helpers ---
  const fileToCompressedDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement('img');
        img.onload = () => {
          const maxWidth = 1600;
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(String(reader.result));
        img.src = String(reader.result);
      };
      reader.onerror = () => reject(new Error('ছবি পড়া যায়নি।'));
      reader.readAsDataURL(file);
    });

  const handleBannerFileChange = async (file: File | null) => {
    setBannerImageFile(file);
    if (!file) {
      setBannerPreviewUrl('');
      return;
    }
    try {
      const preview = await fileToCompressedDataUrl(file);
      setBannerPreviewUrl(preview);
    } catch {
      setBannerPreviewUrl('');
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImageFile) {
      alert('দয়া করে একটি ব্যানার ফটো নির্বাচন করুন।');
      return;
    }
    setSavingBanner(true);

    try {
      const fileExt = (bannerImageFile.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `banner-${bannerSortOrder}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${fileExt}`;

      let publicUrl = '';

      // 1. Primary upload to Supabase Storage bucket named 'banners'
      const { error: bannersBucketErr } = await supabase.storage
        .from('banners')
        .upload(fileName, bannerImageFile, {
          contentType: bannerImageFile.type || 'image/jpeg',
          upsert: true,
        });

      if (!bannersBucketErr) {
        const { data: pubData } = supabase.storage
          .from('banners')
          .getPublicUrl(fileName);
        publicUrl = pubData.publicUrl;
      } else {
        // Automatic fallback to existing 'book-covers' bucket if 'banners' bucket is not created yet
        console.warn('Supabase banners bucket upload note:', bannersBucketErr.message);
        const { error: fallbackErr } = await supabase.storage
          .from('book-covers')
          .upload(fileName, bannerImageFile, {
            contentType: bannerImageFile.type || 'image/jpeg',
            upsert: true,
          });

        if (fallbackErr) {
          throw new Error(
            `Supabase Storage-এ ব্যানার আপলোড করা যায়নি (${bannersBucketErr.message}).`
          );
        }

        const { data: pubData } = supabase.storage
          .from('book-covers')
          .getPublicUrl(fileName);
        publicUrl = pubData.publicUrl;
      }

      if (!publicUrl) {
        throw new Error('ব্যানার ছবির পাবলিক URL তৈরি করা যায়নি।');
      }

      // 2. Replace any existing banner in the same display order slot (1, 2, or 3)
      const existingInSlot = banners.filter((b) => Number(b.sort_order) === bannerSortOrder);
      for (const oldBanner of existingInSlot) {
        await supabase.from('banners').delete().eq('id', oldBanner.id);
        const oldStorage = extractStoragePathFromUrl(oldBanner.image_url);
        if (oldStorage) {
          await supabase.storage
            .from(oldStorage.bucket)
            .remove([oldStorage.path])
            .catch(() => {});
        }
      }

      // 3. Insert new banner record into Supabase 'banners' table
      const { error: insertErr } = await supabase.from('banners').insert({
        image_url: publicUrl,
        link_url: bannerLinkUrl.trim() || null,
        sort_order: bannerSortOrder,
        is_active: true,
      });

      if (insertErr) {
        throw insertErr;
      }

      // 4. Reload active banners and notify Homepage
      const refreshed = await fetchBannerSlides(3);
      setBanners(refreshed);
      try {
        window.dispatchEvent(new Event('hijibiji_banners_updated'));
      } catch {}

      setBannerImageFile(null);
      setBannerPreviewUrl('');
      setBannerLinkUrl('');
      const nextSlot = ([1, 2, 3] as const).find(
        (slot) => !refreshed.some((b) => Number(b.sort_order) === slot)
      );
      if (nextSlot) setBannerSortOrder(nextSlot);

      alert(`ব্যানার #${bannerSortOrder} সফলভাবে সংরক্ষিত হয়েছে!`);
    } catch (err: any) {
      alert('ব্যানার আপলোড করতে ত্রুটি: ' + err?.message);
    } finally {
      setSavingBanner(false);
    }
  };

  const handleDeleteBanner = async (banner: BannerSlide) => {
    if (!confirm(`আপনি কি নিশ্চিত ব্যানার #${banner.sort_order} মুছে ফেলতে চান?`)) return;
    try {
      const { error: delErr } = await supabase
        .from('banners')
        .delete()
        .eq('id', banner.id);

      if (delErr) throw delErr;

      const storageInfo = extractStoragePathFromUrl(banner.image_url);
      if (storageInfo) {
        await supabase.storage
          .from(storageInfo.bucket)
          .remove([storageInfo.path])
          .catch(() => {});
      }

      const refreshed = await fetchBannerSlides(3);
      setBanners(refreshed);
      try {
        window.dispatchEvent(new Event('hijibiji_banners_updated'));
      } catch {}
    } catch (e: any) {
      alert('ব্যানার মুছতে ত্রুটি: ' + e?.message);
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

          <button
            onClick={() => setActiveTab('banners')}
            type="button"
            className={`px-4 py-2 font-semibold text-xs sm:text-sm rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'banners'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>হোম পেজ ব্যানার (Banners) ({banners.length}/3)</span>
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

                  <div>
                    <label className="block font-semibold mb-1 text-stone-700">
                      Book Status / Badge (বইয়ের স্ট্যাটাস / ব্যাজ)
                    </label>
                    <select
                      value={bookStatus}
                      onChange={(e) => setBookStatus(e.target.value as BookStatusValue)}
                      className="w-full border border-stone-300 rounded-xl p-2.5 outline-none focus:border-emerald-700 bg-white font-medium text-stone-800 cursor-pointer"
                    >
                      {BOOK_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
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
                      const formats = getBookFormats(b);
                      const ebookFmt = formats.find((f) => f.key === 'ebook');
                      const paperFmt = formats.find((f) => f.key === 'paperback');
                      const hardFmt = formats.find((f) => f.key === 'hardcover');

                      const ebookStr = ebookFmt?.isAvailable
                        ? `E-Book: ₹${ebookFmt.activePrice}`
                        : 'E-Book: NA';
                      const paperStr = paperFmt?.isAvailable
                        ? `Paperback: ₹${paperFmt.activePrice}`
                        : 'Paperback: NA';
                      const hardStr = hardFmt?.isAvailable
                        ? `Hardcover: ₹${hardFmt.activePrice}`
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
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="font-bold font-serif-bn text-sm text-stone-900 truncate">
                                  {b.title}
                                </h5>
                                <BookStatusBadge status={b.book_status} size="sm" />
                              </div>
                              <p className="text-xs text-stone-500 mt-0.5">{b.author}</p>
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

        {/* 4. BANNERS SECTION — হোম পেজ ব্যানার (Banners) */}
        {activeTab === 'banners' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
              <div>
                <h3 className="text-lg font-bold font-serif-bn text-stone-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-emerald-800" />
                  <span>হোম পেজ ব্যানার (Banners)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  হোমপেজের হিরো স্লাইডারের জন্য সর্বোচ্চ ৩টি ব্যানার ছবি (ক্রম ১, ২, ৩) আপলোড ও নিয়ন্ত্রণ করুন
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-semibold">
                  সক্রিয় ব্যানার: {banners.length} / 3
                </span>
                <button
                  onClick={loadBanners}
                  type="button"
                  className="text-xs bg-white border border-stone-300 hover:bg-stone-50 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${bannersLoading ? 'animate-spin' : ''}`} />
                  <span>রিফ্রেশ</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Banner Form */}
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs h-fit space-y-4">
                <div className="border-b border-stone-100 pb-2">
                  <h4 className="font-bold font-serif-bn text-base text-stone-900 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-emerald-800" />
                    <span>নতুন ব্যানার আপলোড / পরিবর্তন</span>
                  </h4>
                </div>

                <form onSubmit={handleSaveBanner} className="space-y-4 text-xs">
                  {/* Display Order (1, 2, or 3) */}
                  <div>
                    <label className="block font-semibold mb-1.5 text-stone-700">
                      প্রদর্শনের ক্রম (Display Order: 1, 2, 3) *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([1, 2, 3] as const).map((slot) => {
                        const occupied = banners.some((b) => Number(b.sort_order) === slot);
                        const selected = bannerSortOrder === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setBannerSortOrder(slot)}
                            className={`py-2 px-2 rounded-xl border text-center transition cursor-pointer ${
                              selected
                                ? 'border-emerald-800 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-800'
                                : 'border-stone-200 bg-white text-stone-700 hover:border-emerald-500'
                            }`}
                          >
                            <div className="text-xs font-bold">ব্যানার #{slot}</div>
                            <div className="text-[10px] text-stone-500 mt-0.5">
                              {occupied ? 'প্রতিস্থাপন হবে' : 'খালি স্লট'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Image File Upload */}
                  <div>
                    <label className="block font-semibold mb-1.5 text-stone-700">
                      ব্যানার ছবি আপলোড করুন *
                    </label>
                    <div className="border-2 border-dashed border-stone-300 rounded-2xl p-5 text-center bg-stone-50 hover:bg-stone-100 transition cursor-pointer relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleBannerFileChange(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center justify-center gap-1.5 text-stone-600">
                        <UploadCloud className="w-7 h-7 text-emerald-800" />
                        <span className="text-xs font-semibold text-stone-800 break-all">
                          {bannerImageFile
                            ? bannerImageFile.name
                            : 'কম্পিউটার বা মোবাইল থেকে ব্যানার ছবি বাছুন'}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          JPG, PNG বা WebP (প্রশস্ত ব্যানার ছবি উত্তম)
                        </span>
                      </div>
                    </div>

                    {bannerPreviewUrl && (
                      <div className="mt-3 rounded-2xl overflow-hidden border border-stone-300 bg-stone-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={bannerPreviewUrl}
                          alt="ব্যানার প্রিভিউ"
                          className="w-full h-auto max-h-44 object-contain block mx-auto"
                        />
                      </div>
                    )}
                  </div>

                  {/* Optional Click Link */}
                  <div>
                    <label className="block font-semibold mb-1.5 text-stone-700">
                      ক্লিক লিঙ্ক (Optional Link URL)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={bannerLinkUrl}
                        onChange={(e) => setBannerLinkUrl(e.target.value)}
                        placeholder="যেমন: /shimlay-sonkot বা /chad (ঐচ্ছিক)"
                        className="w-full border border-stone-300 rounded-xl p-2.5 pl-8 outline-none focus:border-emerald-700 bg-white"
                      />
                      <Link2 className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      ফাঁকা রাখলে ব্যানারটি শুধু ছবি হিসেবে দেখাবে; লিঙ্ক দিলে ক্লিক করলে সেই পেজে যাবে।
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingBanner || !bannerImageFile}
                    className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {savingBanner ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>আপলোড হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>ব্যানার #{bannerSortOrder} সংরক্ষণ করুন</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Active Banners List */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="font-bold font-serif-bn text-base text-stone-900">
                  সক্রিয় হোম পেজ ব্যানারসমূহ ({banners.length}/3)
                </h4>

                {bannersLoading ? (
                  <p className="text-xs text-stone-400">ব্যানার লোড হচ্ছে...</p>
                ) : banners.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl border border-stone-200 text-center space-y-1.5">
                    <p className="text-sm font-semibold text-stone-700">
                      এখনও কোনো ব্যানার আপলোড করা হয়নি
                    </p>
                    <p className="text-xs text-stone-500">
                      বামের ফর্ম থেকে ব্যানার #১, #২ বা #৩ আপলোড করুন। আপলোড না করা পর্যন্ত হোমপেজে ডিফল্ট ফলব্যাক ব্যানার দেখাবে।
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {banners.map((slide) => (
                      <div
                        key={slide.id}
                        className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 hover:border-emerald-300 transition"
                      >
                        {/* Thumbnail Preview */}
                        <div className="relative w-full sm:w-56 h-32 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={slide.image_url}
                            alt={`ব্যানার #${slide.sort_order}`}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute top-2 left-2 bg-emerald-800 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                            ক্রম #{slide.sort_order}
                          </span>
                        </div>

                        {/* Metadata */}
                        <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 font-serif-bn text-sm">
                              হোম পেজ ব্যানার #{slide.sort_order}
                            </span>
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              সক্রিয়
                            </span>
                          </div>
                          <div className="text-stone-500 flex items-center gap-1.5 truncate">
                            <Link2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate">
                              {slide.link_url ? (
                                <strong className="text-emerald-900 font-medium">
                                  {slide.link_url}
                                </strong>
                              ) : (
                                'কোনো ক্লিক লিঙ্ক নেই'
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <div className="flex items-center justify-end shrink-0">
                          <button
                            onClick={() => handleDeleteBanner(slide)}
                            type="button"
                            className="text-xs text-red-600 hover:bg-red-50 border border-red-200 px-3.5 py-2 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>মুছে ফেলুন</span>
                          </button>
                        </div>
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
