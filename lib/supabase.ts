import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ypvuxujhtvckryvzvdaw.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_2PqVctfevcK4ooUMMM0KYA_2NUcHszh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  created_at?: string;
  slug?: string;
  genre?: string;
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
