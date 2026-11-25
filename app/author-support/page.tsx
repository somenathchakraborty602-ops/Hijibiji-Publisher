import type { Metadata } from 'next';
import AuthorSupportClient from '@/components/pages/AuthorSupportClient';

export const metadata: Metadata = {
  title: 'Author Support Program | হিজিবিজি পাবলিশার্স',
  description:
    'হিজিবিজি পাবলিশার্স Author Support Program — বিনা খরচে প্রকাশনা, ৩০ দিনের প্রমোশন ও আলাদা ওয়েব পেজ, এবং ৯০ দিনের রিফান্ড গ্যারান্টিসহ পাণ্ডুলিপি জমা দিন।',
};

export default function AuthorSupportPage() {
  return <AuthorSupportClient />;
}
