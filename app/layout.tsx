import type { Metadata } from 'next';
import Script from 'next/script';
import { Hind_Siliguri, Noto_Serif_Bengali } from 'next/font/google';
import './globals.css';

const hindSiliguri = Hind_Siliguri({
  weight: ['400', '500', '600', '700'],
  subsets: ['bengali', 'latin'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

const notoSerifBengali = Noto_Serif_Bengali({
  weight: ['600', '700', '800'],
  subsets: ['bengali', 'latin'],
  variable: '--font-noto-serif-bengali',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'হিজিবিজি পাবলিশার্স | HIJIBIJI PUBLISHERS - Kolkata',
  description:
    'হিজিবিজি প্রকাশনার মৌলিক থ্রিলার, সমকালীন উপন্যাস ও কবিতার নতুন সম্ভার। সরাসরি কোলকাতা থেকে দ্রুততম হোম ডেলিভারি ও ক্যাশফ্রি সুরক্ষিত পেমেন্ট।',
  keywords: [
    'হিজিবিজি পাবলিশার্স',
    'Hijibiji Publishers',
    'শিমলায় সংকট',
    'ছাদ',
    'বাংলা বই',
    'কলকাতা পাবলিশার্স',
    'Kolkata Book Store',
  ],
  authors: [{ name: 'হিজিবিজি পাবলিশার্স' }],
  openGraph: {
    title: 'হিজিবিজি পাবলিশার্স | HIJIBIJI PUBLISHERS',
    description:
      'গল্প থেকে বই, বই থেকে পাঠক • Kolkata to World। মৌলিক থ্রিলার ও সাহিত্যের সেরা বই সম্ভার।',
    type: 'website',
    locale: 'bn_BD',
    images: [
      {
        url: '/logo.png',
        width: 400,
        height: 400,
        alt: 'হিজিবিজি পাবলিশার্স লোগো',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'হিজিবিজি পাবলিশার্স | HIJIBIJI PUBLISHERS',
    description: 'মৌলিক থ্রিলার, সমকালীন উপন্যাস ও কবিতার নতুন সম্ভার।',
    images: ['/logo.png'],
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" className={`${hindSiliguri.variable} ${notoSerifBengali.variable}`}>
      <body
        className="bg-amber-50/30 text-stone-900 min-h-screen flex flex-col antialiased selection:bg-amber-200 selection:text-emerald-950 font-sans"
        suppressHydrationWarning
      >
        <Script
          src="https://sdk.cashfree.com/js/v3/cashfree.js"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
