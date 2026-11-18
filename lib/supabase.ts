import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ypvuxujhtvckryvzvdaw.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_2PqVctfevcK4ooUMMM0KYA_2NUcHszh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type BookStatusValue =
  | 'প্রকাশিত'
  | 'বেস্ট সেলার'
  | 'রিডার্স চয়েস'
  | 'প্রি-বুকিং';

export const BOOK_STATUS_OPTIONS: Array<{
  value: BookStatusValue;
  label: string;
}> = [
  { value: 'প্রকাশিত', label: 'প্রকাশিত (Published)' },
  { value: 'বেস্ট সেলার', label: 'বেস্ট সেলার (Bestseller)' },
  { value: 'রিডার্স চয়েস', label: "রিডার্স চয়েস (Reader's Choice)" },
  { value: 'প্রি-বুকিং', label: 'প্রি-বুকিং (Pre-Booking)' },
];

export function normalizeBookStatus(status?: string | null): BookStatusValue {
  const s = (status || '').trim().normalize('NFC');
  if (s === 'বেস্ট সেলার') return 'বেস্ট সেলার';
  if (s === 'রিডার্স চয়েস' || s === 'রিডার্স চয়েস') return 'রিডার্স চয়েস';
  if (s === 'প্রি-বুকিং') return 'প্রি-বুকিং';
  return 'প্রকাশিত';
}

export function isPreBookingStatus(status?: string | null): boolean {
  return normalizeBookStatus(status) === 'প্রি-বুকিং';
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  price: number;
  discount_price?: number | null;
  price_ebook?: number | null;
  discount_ebook?: number | null;
  price_paperback?: number | null;
  discount_paperback?: number | null;
  price_hardcover?: number | null;
  discount_hardcover?: number | null;
  description?: string | null;
  cover_image_url?: string | null;
  pdf_url?: string | null;
  book_status?: string | null;
  created_at?: string;
  slug?: string;
  genre?: string;
}

export type BookFormatKey = 'ebook' | 'paperback' | 'hardcover';

export interface BookFormatOption {
  key: BookFormatKey;
  label: string;
  bengaliName: 'E-Book' | 'Paperback' | 'Hardcover';
  price: number | null;
  discount: number | null;
  activePrice: number | null;
  hasDiscount: boolean;
  isAvailable: boolean;
}

export function getBookFormats(book: Book): BookFormatOption[] {
  const hasExplicitFormats =
    book.price_ebook != null || book.price_paperback != null || book.price_hardcover != null;

  const rawPaperbackPrice = hasExplicitFormats
    ? book.price_paperback ?? null
    : book.price ?? null;
  const rawPaperbackDiscount = hasExplicitFormats
    ? book.discount_paperback ?? null
    : book.discount_price ?? null;

  const entries: Array<{
    key: BookFormatKey;
    label: string;
    bengaliName: 'E-Book' | 'Paperback' | 'Hardcover';
    price: number | null | undefined;
    discount: number | null | undefined;
  }> = [
    {
      key: 'ebook',
      label: 'E-Book',
      bengaliName: 'E-Book',
      price: book.price_ebook,
      discount: book.discount_ebook,
    },
    {
      key: 'paperback',
      label: 'Paperback',
      bengaliName: 'Paperback',
      price: rawPaperbackPrice,
      discount: rawPaperbackDiscount,
    },
    {
      key: 'hardcover',
      label: 'Hardcover',
      bengaliName: 'Hardcover',
      price: book.price_hardcover,
      discount: book.discount_hardcover,
    },
  ];

  return entries.map((f) => {
    const numPrice =
      f.price !== null && f.price !== undefined && Number(f.price) > 0
        ? Number(f.price)
        : null;
    const numDiscount =
      f.discount !== null && f.discount !== undefined && Number(f.discount) > 0
        ? Number(f.discount)
        : null;
    const hasDiscount = Boolean(numPrice && numDiscount && numDiscount < numPrice);
    const activePrice = numPrice ? (hasDiscount ? numDiscount! : numPrice) : null;

    return {
      key: f.key,
      label: f.label,
      bengaliName: f.bengaliName,
      price: numPrice,
      discount: numDiscount,
      activePrice,
      hasDiscount,
      isAvailable: numPrice !== null,
    };
  });
}

export function getDefaultAvailableFormat(book: Book): BookFormatKey {
  const formats = getBookFormats(book);
  const paperback = formats.find((f) => f.key === 'paperback' && f.isAvailable);
  if (paperback) return 'paperback';
  const firstAvailable = formats.find((f) => f.isAvailable);
  return firstAvailable ? firstAvailable.key : 'paperback';
}

export interface Coupon {
  id?: string;
  code: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  is_active: boolean;
  created_at?: string;
}

export interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  total_amount: number;
  order_items: string;
  payment_status: 'PENDING' | 'SUCCESS' | 'DELIVERED' | string;
}

export interface BannerSlide {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  badge?: string;
  button_text?: string;
  is_active: boolean;
  order_index?: number;
  created_at?: string;
}

export const INITIAL_SLIDES: BannerSlide[] = [
  {
    id: 'slide-shimlay',
    title: 'শিমলায় সংকট',
    subtitle: 'লেখক: দীপক চন্দ • বরফঢাকা পাইনবনের রহস্য ও রোমাঞ্চ! বিশেষ ৪০% ছাড়ে এখন মাত্র ₹২১০',
    badge: '★ বেস্টসেলার রহস্য উপন্যাস',
    image_url:
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=80',
    link_url: '/shimlay-sonkot',
    button_text: 'এখনই সরাসরি অর্ডার করুন',
    is_active: true,
    order_index: 1,
  },
  {
    id: 'slide-chad',
    title: 'ছাদ — ছবি ব্যানার্জী',
    subtitle: 'মধ্যবিত্ত নারীর আত্মমর্যাদা ও পরম আশ্রয়ের অনন্য লড়াই। বিশেষ অফার মূল্যে সরাসরি ডেলিভারি',
    badge: '★ বহুল প্রতীক্ষিত সামাজিক উপন্যাস',
    image_url:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80',
    link_url: '/chad',
    button_text: 'বিস্তারিত দেখুন ও অর্ডার করুন',
    is_active: true,
    order_index: 2,
  },
  {
    id: 'slide-offer',
    title: 'কুপন ছাড় ও ফ্রি হোম ডেলিভারি',
    subtitle: 'কুপন কোড HIJIBIJIPRE প্রয়োগ করলেই পান অতিরিক্ত ৪০% পর্যন্ত ছাড়! সরাসরি কোলকাতা থেকে সারা ভারতে দ্রুততম হোম ডেলিভারি।',
    badge: '★ সীমিত সময়ের বিশেষ সুযোগ',
    image_url:
      'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=1200&q=80',
    link_url: '/',
    button_text: 'বইয়ের সম্ভার দেখুন',
    is_active: true,
    order_index: 3,
  },
];

// Default initial books for immediate high-fidelity rendering if DB is loading
export const INITIAL_BOOKS: Book[] = [
  {
    id: 'shimlay-sonkot-default',
    title: 'শিমলায় সংকট',
    author: 'দীপক চন্দ',
    isbn: '978-81-996564-0-6',
    price: 350,
    discount_price: 210,
    price_ebook: 99,
    discount_ebook: 79,
    price_paperback: 350,
    discount_paperback: 210,
    price_hardcover: 499,
    discount_hardcover: 380,
    description:
      'বরফঢাকা পাইনবনের ছায়ায় ঢাকা শিমলার প্রাচীন এক কটেজ। পাহাড়ি কুয়াশার চাদরে ঘেরা সেই নিস্তব্ধ রাতে হঠাৎ ঘটে যায় এক চাঞ্চল্যকর অন্তর্ধানের ঘটনা। একে একে উন্মোচিত হতে থাকে বহু বছরের পুরনো গোপন পারিবারিক সত্য। প্রতি পাতায় টানটান উত্তেজনা আর বুদ্ধির লড়াইয়ে ভরপুর এই নতুন উপন্যাসটি পাঠকদের শেষ পাতা পর্যন্ত রুদ্ধশ্বাসে বেঁধে রাখবে।',
    cover_image_url:
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
    slug: 'shimlay-sonkot',
    genre: 'রহস্য ও থ্রিলার',
  },
  {
    id: 'chad-default',
    title: 'ছাদ',
    author: 'ছবি ব্যানার্জী',
    isbn: '৯৭৮-৮১-৯৯৬৫৬৪-১-৩',
    price: 450,
    discount_price: 360,
    price_ebook: 120,
    discount_ebook: 99,
    price_paperback: 450,
    discount_paperback: 360,
    price_hardcover: 550,
    discount_hardcover: 450,
    description:
      "'ছাদ' নিছক কোনো ইট-কাঠ-পাথরের আচ্ছাদন নয়; নারীর নিরাপত্তা, ভরসা আর আত্মমর্যাদার পরম আশ্রয়। কন্যাদায়গ্রস্ত মধ্যবিত্তের দেনাপাওনা, পণের নির্মম বলিদান আর পারিবারিক কূটচালে বিক্রি হয়ে যাওয়া সুমিতার লড়াই এক অনন্য দলিল। অসম দাম্পত্যের রূঢ় বাস্তবের মুখে দাঁড়িয়ে নিজের শিক্ষাবঞ্চিত অপূর্ণ স্বপ্নকে শক্তিতে বদলে মেয়ে পারমিতাকে স্বাবলম্বী করে তোলার মাধ্যমে প্রজন্মের পর প্রজন্ম নারীর মুক্তির দিশা দেখায় এই উপন্যাস।",
    cover_image_url:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    slug: 'chad',
    genre: 'সামাজিক উপন্যাস',
  },
  {
    id: 'kalpurush-default',
    title: 'কালপুরুষের ছায়া',
    author: 'অরিন্দম মুখোপাধ্যায়',
    isbn: '978-81-996564-2-0',
    price: 320,
    discount_price: 240,
    price_paperback: 320,
    discount_paperback: 240,
    price_ebook: 89,
    discount_ebook: 69,
    price_hardcover: null,
    discount_hardcover: null,
    description:
      'উত্তর কলকাতার বনেদি রাজবাড়ির প্রাচীন লাইব্রেরিতে পাওয়া একটি সংকেতলিপি। সেই লিপি পাঠের সাথে সাথেই খুন হতে শুরু করে শহরের তিন স্বনামধন্য গবেষক। গোয়েন্দা অনির্বাণ সেনের মুখোমুখি এবার এক অলৌকিক ষড়যন্ত্রকারী।',
    cover_image_url:
      'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=600&q=80',
    slug: 'kalpurusher-chhaya',
    genre: 'রহস্য ও থ্রিলার',
  },
  {
    id: 'neel-nirjonota-default',
    title: 'নীল নির্জনতার গান',
    author: 'সুমনা সেনগুপ্ত',
    isbn: '978-81-996564-3-7',
    price: 200,
    discount_price: 150,
    price_paperback: 200,
    discount_paperback: 150,
    price_ebook: 50,
    discount_ebook: 39,
    price_hardcover: null,
    discount_hardcover: null,
    description:
      'প্রেম, বিরহ আর নাগরিক ক্লান্তি পেরিয়ে একাকীত্বের গভীর শান্ত অনুভূতি নিয়ে রচিত পঁচাত্তরটি আধুনিক কবিতার অনন্য সংকলন। প্রতিটি কবিতাই মনের গভীরে এক স্নিগ্ধ আলো ফেলে।',
    cover_image_url:
      'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80',
    slug: 'neel-nirjonota',
    genre: 'কবিতা',
  },
];
