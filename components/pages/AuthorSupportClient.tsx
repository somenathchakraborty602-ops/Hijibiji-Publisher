'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpenCheck,
  Megaphone,
  Award,
  ShieldCheck,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Lock,
  ExternalLink,
  ArrowLeft,
  User,
  Phone,
  Mail,
  BookMarked,
  Layers,
  Hash,
  Printer,
  CalendarClock,
  X,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PolicyModal, PolicyType } from '@/components/PolicyModal';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

const EVALUATION_FEE = 500;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const GENRE_OPTIONS = [
  'উপন্যাস',
  'গল্প সংকলন',
  'কবিতা',
  'প্রবন্ধ',
] as const;

interface SubmissionRecord {
  id: string;
  submission_code: string;
  author_name: string;
  whatsapp: string;
  email: string;
  manuscript_title: string;
  genre: string;
  page_or_word_count?: string | null;
  file_url?: string | null;
  payment_status: string;
  transaction_id?: string | null;
  review_status?: string;
  created_at?: string;
  refund_deadline?: string;
  declaration_accepted?: boolean | null;
  declaration_timestamp?: string | null;
}

async function ensureCashfreeSdkLoaded(): Promise<NonNullable<Window['Cashfree']>> {
  if (typeof window === 'undefined') {
    throw new Error('Browser environment required');
  }
  if (window.Cashfree) {
    return window.Cashfree;
  }
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]'
    );
    if (existing) {
      const check = () => {
        if (window.Cashfree) resolve();
        else setTimeout(check, 100);
      };
      setTimeout(check, 100);
      setTimeout(() => reject(new Error('Cashfree SDK load timeout')), 8000);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) resolve();
      else reject(new Error('Cashfree SDK did not initialize'));
    };
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });
  if (!window.Cashfree) {
    throw new Error('Cashfree SDK unavailable');
  }
  return window.Cashfree;
}

function generateSubmissionCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `HJB-ASP-${digits}`;
}

function formatDateBn(isoDate?: string): string {
  if (!isoDate) {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toLocaleDateString('bn-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('bn-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AuthorSupportClient() {
  // Form fields
  const [authorName, setAuthorName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [manuscriptTitle, setManuscriptTitle] = useState('');
  const [genre, setGenre] = useState<string>(GENRE_OPTIONS[0]);
  const [pageOrWordCount, setPageOrWordCount] = useState('');
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  // Submission / Payment / Receipt state
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<{
    record: SubmissionRecord;
    paymentSessionId: string;
    cashfreeOrderId: string;
  } | null>(null);
  // Step 2: Post-payment manuscript upload state
  const [uploadingManuscript, setUploadingManuscript] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [confirmingPaid, setConfirmingPaid] = useState(false);
  const [receipt, setReceipt] = useState<SubmissionRecord | null>(null);

  // UI Helpers
  const [activePolicy, setActivePolicy] = useState<PolicyType>(null);
  const [cartCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('hijibiji_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.reduce((sum, item) => sum + (Number(item?.qty) || 1), 0);
          }
        }
      } catch {}
    }
    return 0;
  });

  // Handle return from Cashfree checkout (?submission_code=HJB-ASP-XXXX or ?order_id=HJB-ASP-XXXX)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const returnedCode =
      params.get('submission_code') ||
      (params.get('order_id')?.startsWith('HJB-ASP-') ? params.get('order_id') : null);

    if (!returnedCode) return;

    let cancelled = false;

    async function verifyReturnedSubmission(code: string) {
      try {
        const { data } = await supabase
          .from('author_submissions')
          .select('*')
          .eq('submission_code', code)
          .maybeSingle();

        if (cancelled || !data) return;

        const txId =
          params.get('transaction_id') ||
          params.get('cf_payment_id') ||
          data.transaction_id ||
          `CF-${code}-${Date.now().toString().slice(-6)}`;

        let updatedRecord = data as SubmissionRecord;
        if (data.payment_status !== 'Paid') {
          const { data: updated } = await supabase
            .from('author_submissions')
            .update({
              payment_status: 'Paid',
              transaction_id: txId,
            })
            .eq('id', data.id)
            .select('*')
            .maybeSingle();
          if (updated) {
            updatedRecord = updated as SubmissionRecord;
          } else {
            updatedRecord = { ...updatedRecord, payment_status: 'Paid', transaction_id: txId };
          }
        }

        if (!cancelled) {
          setReceipt(updatedRecord);
          window.history.replaceState({}, '', '/author-support');
        }
      } catch (err) {
        console.warn('Error verifying returned author submission:', err);
      }
    }

    verifyReturnedSubmission(returnedCode.trim());
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setUploadError(null);
    const file = e.target.files?.[0] || null;
    if (!file) {
      setManuscriptFile(null);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isValidExt = lowerName.endsWith('.doc') || lowerName.endsWith('.docx');
    if (!isValidExt) {
      setFileError('শুধুমাত্র .doc বা .docx ফরম্যাটের ফাইল গ্রহণ করা হয়।');
      setManuscriptFile(null);
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError('ফাইলের সাইজ সর্বোচ্চ 10MB হতে হবে। অনুগ্রহ করে ছোট ফাইল দিন।');
      setManuscriptFile(null);
      e.target.value = '';
      return;
    }

    setManuscriptFile(file);
  };

  const handleManuscriptUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt) return;
    setUploadError(null);
    setFileError(null);

    if (!manuscriptFile) {
      setFileError('অনুগ্রহ করে আপনার পাণ্ডুলিপির .doc বা .docx ফাইল নির্বাচন করুন।');
      return;
    }

    setUploadingManuscript(true);
    try {
      const fileExt = (manuscriptFile.name.split('.').pop() || 'docx').toLowerCase();
      const safeFileName = `${receipt.submission_code}-${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('manuscripts')
        .upload(safeFileName, manuscriptFile, {
          contentType:
            manuscriptFile.type ||
            (fileExt === 'doc'
              ? 'application/msword'
              : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
          upsert: true,
        });

      if (uploadErr) {
        throw new Error(`পাণ্ডুলিপি আপলোড করা যায়নি: ${uploadErr.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('manuscripts')
        .getPublicUrl(safeFileName);
      const fileUrl = publicUrlData.publicUrl;

      const { data: updatedRow, error: updateErr } = await supabase
        .from('author_submissions')
        .update({ file_url: fileUrl })
        .eq('id', receipt.id)
        .select('*')
        .maybeSingle();

      if (updateErr) {
        throw new Error(`ডেটাবেসে ফাইলের তথ্য সংরক্ষণ করা যায়নি: ${updateErr.message}`);
      }

      setUploadedFileName(manuscriptFile.name);
      setReceipt(
        (updatedRow as SubmissionRecord) || {
          ...receipt,
          file_url: fileUrl,
        }
      );
      setManuscriptFile(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Manuscript upload error:', err);
      setUploadError(
        err?.message || 'পাণ্ডুলিপি আপলোড করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
    } finally {
      setUploadingManuscript(false);
    }
  };

  const openCashfreeCheckout = async (paymentSessionId: string) => {
    const CashfreeFactory = await ensureCashfreeSdkLoaded();
    const cashfree = CashfreeFactory({ mode: 'production' });
    cashfree.checkout({
      paymentSessionId,
      redirectTarget: '_blank',
    });
  };

  const handleConfirmPaymentComplete = async () => {
    if (!pendingSession) return;
    setConfirmingPaid(true);
    setFormError(null);

    try {
      const txId =
        pendingSession.cashfreeOrderId ||
        `CF-${pendingSession.record.submission_code}-${Date.now().toString().slice(-6)}`;

      const { data: updated, error } = await supabase
        .from('author_submissions')
        .update({
          payment_status: 'Paid',
          transaction_id: txId,
        })
        .eq('id', pendingSession.record.id)
        .select('*')
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      const finalRecord: SubmissionRecord = (updated as SubmissionRecord) || {
        ...pendingSession.record,
        payment_status: 'Paid',
        transaction_id: txId,
      };

      setReceipt(finalRecord);
      setPendingSession(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setFormError(
        err?.message || 'পেমেন্ট স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
      );
    } finally {
      setConfirmingPaid(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanWhatsapp.length !== 10) {
      setFormError('অনুগ্রহ করে সঠিক ১০ সংখ্যার হোয়াটসঅ্যাপ নম্বর দিন।');
      return;
    }

    if (!consentChecked) {
      setFormError('জমা দেওয়ার আগে শর্তাবলীর সম্মতি বক্সে টিক দিন।');
      return;
    }

    setSubmitting(true);
    setStatusMessage('আপনার আবেদন ডেটাবেসে নিবন্ধন হচ্ছে...');

    try {
      // 1. Generate unique Submission Code: HJB-ASP-XXXX
      const submissionCode = generateSubmissionCode();

      // 2. Insert record into Supabase 'author_submissions' table with payment_status: 'Pending'
      //    (Manuscript file will be uploaded in Step 2 after successful ₹500 payment)
      const baseInsertPayload = {
        submission_code: submissionCode,
        author_name: authorName.trim(),
        whatsapp: cleanWhatsapp,
        email: email.trim(),
        manuscript_title: manuscriptTitle.trim(),
        genre,
        page_or_word_count: pageOrWordCount.trim() || null,
        payment_status: 'Pending',
        declaration_accepted: true,
        declaration_timestamp: new Date().toISOString(),
      };

      let { data: insertedRow, error: insertErr } = await supabase
        .from('author_submissions')
        .insert({ ...baseInsertPayload, file_url: null })
        .select('*')
        .single();

      // Graceful fallback if 'file_url' has a NOT NULL constraint in Supabase
      if (insertErr && insertErr.message?.toLowerCase().includes('file_url')) {
        const retryRes = await supabase
          .from('author_submissions')
          .insert({ ...baseInsertPayload, file_url: '' })
          .select('*')
          .single();
        insertedRow = retryRes.data;
        insertErr = retryRes.error;
      }

      if (insertErr || !insertedRow) {
        throw new Error(
          insertErr?.message || 'আবেদন ডেটাবেসে সংরক্ষণ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।'
        );
      }

      const submissionRecord = insertedRow as SubmissionRecord;

      // 3. Create Cashfree v3 payment session for ₹500 via /api/create-cashfree-order
      setStatusMessage('₹৫০০ মূল্যায়ন ফি-এর জন্য ক্যাশফ্রি পেমেন্ট সেশন তৈরি হচ্ছে...');
      const cfPayload = {
        order_id: submissionCode,
        order_amount: EVALUATION_FEE,
        customer_name: authorName.trim(),
        customer_phone: cleanWhatsapp,
        customer_email: email.trim(),
      };

      let resData: any = null;
      try {
        const res = await fetch('/api/create-cashfree-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfPayload),
        });
        resData = await res.json();
      } catch (proxyErr) {
        console.warn('Proxy call failed, trying Supabase Edge Function directly:', proxyErr);
      }

      if (!resData?.payment_session_id) {
        try {
          const edgeRes = await fetch(`${SUPABASE_URL}/functions/v1/create-cashfree-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(cfPayload),
          });
          const edgeJson = await edgeRes.json().catch(() => null);
          if (edgeJson?.payment_session_id) {
            resData = edgeJson;
          }
        } catch (edgeErr) {
          console.warn('Direct edge call failed:', edgeErr);
        }
      }

      if (!resData?.payment_session_id) {
        throw new Error(
          resData?.error ||
            'ক্যাশফ্রি পেমেন্ট সেশন তৈরি করা যায়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।'
        );
      }

      const cfOrderId = String(resData.order_id || submissionCode);

      // 4. Open Cashfree v3 Checkout in new tab
      setStatusMessage('নতুন ট্যাবে ক্যাশফ্রি পেমেন্ট গেটওয়ে খোলা হচ্ছে...');
      await openCashfreeCheckout(resData.payment_session_id);

      setPendingSession({
        record: submissionRecord,
        paymentSessionId: resData.payment_session_id,
        cashfreeOrderId: cfOrderId,
      });
      setStatusMessage(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Author submission error:', err);
      setFormError(
        err?.message || 'আবেদন প্রক্রিয়াকরণে ত্রুটি দেখা দিয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
      setStatusMessage(null);
    } finally {
      setSubmitting(false);
    }
  };

  const programTermsCards = [
    {
      num: '০১',
      title: 'বিনা খরচে প্রকাশনা',
      subtitle: 'Zero-Cost Publishing',
      desc: 'সম্পাদকীয় মূল্যায়নে নির্বাচিত মৌলিক পাণ্ডুলিপিগুলো হিজিবিজি পাবলিশার্স-এর সম্পূর্ণ নিজস্ব খরচে মুদ্রণ ও প্রকাশ করা হবে।',
      icon: BookOpenCheck,
    },
    {
      num: '০২',
      title: '৩০ দিনের প্রমোশন ও আলাদা ওয়েব পেজ',
      subtitle: 'Dedicated Sales Page & Campaign',
      desc: 'প্রকাশিত প্রতিটি বইয়ের জন্য নিজস্ব ডেডিকেটেড সেলস ওয়েব পেজ তৈরি এবং পাঠকদের কাছে পৌঁছে দিতে ৩০ দিনের বিশেষ প্রমোশনাল ক্যাম্পেইন।',
      icon: Megaphone,
    },
    {
      num: '০৩',
      title: 'লেখক সম্মানী ও সুবিধা',
      subtitle: 'Author Royalty & Copies',
      desc: 'লেখক পাবেন ২ কপি সৌজন্য সংখ্যা, অতিরিক্ত কপি সংগ্রহের ক্ষেত্রে ৩০% বিশেষ লেখক ছাড় এবং প্রতিটি বই বিক্রয়ে ১০% রয়্যালটি।',
      icon: Award,
    },
    {
      num: '০৪',
      title: '₹৫০০ মূল্যায়ন ফি ও ৯০ দিনের রিফান্ড গ্যারান্টি',
      subtitle: '90-Day Evaluation Guarantee',
      desc: 'এককালীন ₹৫০০ সম্পাদকীয় মূল্যায়ন ফি প্রযোজ্য। জমা দেওয়ার ৯০ দিনের মধ্যে লিখিত ফিডব্যাক বা চূড়ান্ত সিদ্ধান্ত না দিতে পারলে ১০০% ফি রিফান্ড।',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-amber-50/30 text-stone-900">
      <Navbar
        cartCount={cartCount}
        onOpenCart={() => {
          window.location.href = '/';
        }}
        activePath="/author-support"
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 w-full space-y-8 sm:space-y-10">
        {/* Back link */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-600 hover:text-emerald-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>হোমপেজে ফিরে যান</span>
          </Link>
          <span className="text-xs text-stone-500 hidden sm:inline">
            হিজিবিজি পাবলিশার্স · Author Support Program
          </span>
        </div>

        {/* Hero Banner (Emerald & Gold Publishing Theme) */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-amber-900/90 text-white shadow-xl border border-emerald-900/20 px-6 py-8 sm:px-10 sm:py-12">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 85% 20%, rgba(251, 191, 36, 0.45), transparent 50%), radial-gradient(circle at 12% 85%, rgba(16, 185, 129, 0.35), transparent 45%)',
            }}
          />
          <div className="relative z-10 max-w-3xl space-y-3">
            <p className="text-xs sm:text-sm font-semibold text-amber-300 tracking-wide">
              হিজিবিজি পাবলিশার্স · লেখক সহায়তা কর্মসূচি (Author Support Program)
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif-bn leading-tight [text-wrap:balance]">
              আপনার মৌলিক পাণ্ডুলিপি পৌঁছে যাক বইপ্রেমী পাঠকের হাতে
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
              নতুন ও প্রতিভাবান বাংলা লেখকদের পাশে দাঁড়াতে আমাদের বিশেষ উদ্যোগ। নিচে কর্মসূচির ৪টি স্পষ্ট শর্তাবলী পড়ে আপনার পাণ্ডুলিপি জমা দিন।
            </p>
          </div>
        </section>

        {/* STEP 2: POST-PAYMENT UPLOAD SCREEN OR FINAL CONFIRMATION RECEIPT */}
        {receipt ? (
          !receipt.file_url || !receipt.file_url.trim() ? (
            /* STEP 2A: THANK YOU & POST-PAYMENT MANUSCRIPT UPLOAD SCREEN */
            <section className="max-w-2xl mx-auto bg-white rounded-3xl border border-emerald-200 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 px-6 py-7 text-center text-white space-y-2">
                <div className="w-16 h-16 rounded-full bg-white/15 border border-amber-300/60 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9 text-amber-300" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  ধাপ ২ / ২ · পাণ্ডুলিপি আপলোড
                </p>
                <h2 className="text-2xl font-bold font-serif-bn">
                  পেমেন্ট সফল হয়েছে! এবার আপনার পাণ্ডুলিপি আপলোড করুন
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100">
                  আপনার ₹৫০০ মূল্যায়ন ফি গৃহীত হয়েছে। নিচে আপনার পাণ্ডুলিপির MS Word ফাইল (.doc / .docx) আপলোড করে আবেদন সম্পূর্ণ করুন।
                </p>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {/* Primary IDs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-4">
                    <p className="text-xs font-semibold text-emerald-800">Submission ID</p>
                    <p className="text-lg font-bold font-mono text-emerald-950 mt-1 tabular-nums">
                      {receipt.submission_code}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-4">
                    <p className="text-xs font-semibold text-amber-900">Transaction ID</p>
                    <p className="text-sm sm:text-base font-bold font-mono text-stone-900 mt-1 break-all tabular-nums">
                      {receipt.transaction_id || 'VERIFIED'}
                    </p>
                  </div>
                </div>

                {/* Details summary */}
                <div className="rounded-2xl border border-stone-200 divide-y divide-stone-100 text-sm">
                  <div className="px-4 py-3 flex justify-between gap-4">
                    <span className="text-stone-500">লেখকের নাম</span>
                    <span className="font-semibold text-stone-900 text-right">
                      {receipt.author_name}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between gap-4">
                    <span className="text-stone-500">পাণ্ডুলিপির শিরোনাম</span>
                    <span className="font-semibold font-serif-bn text-stone-900 text-right">
                      {receipt.manuscript_title}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between gap-4">
                    <span className="text-stone-500">বিভাগ</span>
                    <span className="font-semibold text-stone-900 text-right">
                      {receipt.genre}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between gap-4">
                    <span className="text-stone-500">পেমেন্ট স্ট্যাটাস</span>
                    <span className="font-bold text-emerald-800 tabular-nums">₹৫০০ (Paid)</span>
                  </div>
                </div>

                {/* Post-payment .doc / .docx File Upload Form */}
                <form onSubmit={handleManuscriptUpload} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-semibold text-stone-800">
                      পাণ্ডুলিপি ফাইল আপলোড করুন (শুধুমাত্র .doc / .docx, সর্বোচ্চ 10MB) *
                    </label>

                    <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-800/40 bg-emerald-50/50 hover:bg-emerald-50/90 px-5 py-7 text-center cursor-pointer transition">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 text-emerald-800 flex items-center justify-center shadow-2xs">
                        {manuscriptFile ? (
                          <FileText className="w-6 h-6 text-emerald-700" />
                        ) : (
                          <UploadCloud className="w-6 h-6 text-emerald-800" />
                        )}
                      </div>
                      {manuscriptFile ? (
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-emerald-950 break-all">
                            {manuscriptFile.name}
                          </p>
                          <p className="text-xs text-stone-500 tabular-nums">
                            {(manuscriptFile.size / (1024 * 1024)).toFixed(2)} MB · পরিবর্তন করতে ক্লিক করুন
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-stone-800">
                            ডিভাইস থেকে আপনার পাণ্ডুলিপির MS Word ফাইল (.doc / .docx) নির্বাচন করুন
                          </p>
                          <p className="text-xs text-stone-500">
                            সর্বোচ্চ ফাইল সাইজ: 10MB · PDF বা ছবি গ্রহণযোগ্য নয়
                          </p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        disabled={uploadingManuscript}
                        className="sr-only"
                      />
                    </label>

                    {fileError && (
                      <p className="text-xs font-medium text-red-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fileError}</span>
                      </p>
                    )}

                    {uploadError && (
                      <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{uploadError}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!manuscriptFile || uploadingManuscript}
                    className="w-full py-3.5 px-6 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm sm:text-base transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UploadCloud className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      {uploadingManuscript
                        ? 'পাণ্ডুলিপি আপলোড হচ্ছে...'
                        : 'পাণ্ডুলিপি আপলোড করুন ও চূড়ান্ত জমা দিন'}
                    </span>
                  </button>
                </form>
              </div>
            </section>
          ) : (
            /* STEP 2B: FINAL CONFIRMATION RECEIPT SCREEN (Shown after manuscript upload completes) */
            <section className="max-w-2xl mx-auto bg-white rounded-3xl border border-emerald-200 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 px-6 py-7 text-center text-white space-y-2">
                <div className="w-16 h-16 rounded-full bg-white/15 border border-amber-300/60 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9 text-amber-300" />
                </div>
                <h2 className="text-2xl font-bold font-serif-bn">
                  আপনার পাণ্ডুলিপি সফলভাবে জমা হয়েছে!
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100">
                  হিজিবিজি পাবলিশার্স Author Support Program — অফিসিয়াল কনফার্মেশন রসিদ
                </p>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {/* Primary IDs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-4">
                    <p className="text-xs font-semibold text-emerald-800">Submission ID</p>
                    <p className="text-lg font-bold font-mono text-emerald-950 mt-1 tabular-nums">
                      {receipt.submission_code}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-4">
                    <p className="text-xs font-semibold text-amber-900">Transaction ID</p>
                    <p className="text-sm sm:text-base font-bold font-mono text-stone-900 mt-1 break-all tabular-nums">
                      {receipt.transaction_id || 'VERIFIED'}
                    </p>
                  </div>
                </div>

                {/* Details summary */}
                <div className="rounded-2xl border border-stone-200 divide-y divide-stone-100 text-sm">
                  <div className="px-4 py-3 flex justify-between gap-4">
                    <span className="text-stone-500">লেখকের নাম</span>
                    <span className="font-semibold text-stone-900 text-right">
                      {receipt.author_name}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between gap-4">
                    <span className="text-stone-500">পাণ্ডুলিপির শিরোনাম</span>
                    <span className="font-semibold font-serif-bn text-stone-900 text-right">
                      {receipt.manuscript_title}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between gap-4">
                    <span className="text-stone-500">বিভাগ</span>
                    <span className="font-semibold text-stone-900 text-right">
                      {receipt.genre}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between gap-4">
                    <span className="text-stone-500">আপলোডকৃত ফাইল</span>
                    <span className="font-semibold text-emerald-800 text-right inline-flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="break-all">
                        {uploadedFileName || 'পাণ্ডুলিপি ফাইল সংযুক্ত (.docx)'}
                      </span>
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between gap-4">
                    <span className="text-stone-500">পরিশোধিত মূল্যায়ন ফি</span>
                    <span className="font-bold text-emerald-800 tabular-nums">₹৫০০ (Paid)</span>
                  </div>
                </div>

                {/* Originality & Copyright Declaration Confirmation Note */}
                <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200 px-4 py-3.5 flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>মৌলিকত্ব ও কপিরাইট ঘোষণাপত্র গৃহীত হয়েছে</span>
                </div>

                {/* 90-Day Guarantee Box */}
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-emerald-50/60 border border-amber-200 p-4 sm:p-5 flex items-start gap-3">
                  <CalendarClock className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs sm:text-sm text-stone-700 leading-relaxed">
                    <p className="font-bold text-emerald-950">
                      ৯০ দিনের সম্পাদকীয় মূল্যায়ন ও ১০০% রিফান্ড গ্যারান্টি
                    </p>
                    <p>
                      আপনার পাণ্ডুলিপি আমাদের সম্পাদকমণ্ডলীর কাছে পৌঁছে গেছে।{' '}
                      <strong className="text-stone-900">
                        {formatDateBn(receipt.refund_deadline)}
                      </strong>{' '}
                      তারিখের মধ্যে মূল্যায়ন রিপোর্ট বা প্রকাশনা সিদ্ধান্ত না জানালে আপনার ₹৫০০ সম্পূর্ণ ফেরত দেওয়া হবে।
                    </p>
                  </div>
                </div>

                {/* Receipt Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-3 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>রসিদ প্রিন্ট / সেভ করুন</span>
                  </button>
                  <Link
                    href="/"
                    className="flex-1 py-3 px-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>হোমপেজে ফিরে যান</span>
                  </Link>
                </div>
              </div>
            </section>
          )
        ) : (
          <>
            {/* 1. TOP PROGRAM TERMS SECTION (4 Clean Cards) */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold font-serif-bn text-stone-900">
                    Author Support কর্মসূচির ৪টি মূল শর্তাবলী
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
                    পাণ্ডুলিপি জমা দেওয়ার আগে সমস্ত সুবিধা ও মূল্যায়ন নীতিমালা ভালোভাবে পড়ে নিন
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-800 tabular-nums">
                  এককালীন মূল্যায়ন ফি: ₹৫০০
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {programTermsCards.map((card) => {
                  const IconComp = card.icon;
                  return (
                    <article
                      key={card.num}
                      className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-amber-300 hover:shadow-md transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center">
                            <IconComp className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold font-mono text-amber-800/80 tabular-nums">
                            {card.num}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold font-serif-bn text-stone-900 leading-snug">
                            {card.title}
                          </h3>
                          <p className="text-[11px] font-medium text-emerald-800/80 mt-0.5">
                            {card.subtitle}
                          </p>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* PENDING CASHFREE SESSION VERIFICATION BANNER */}
            {pendingSession && (
              <section className="max-w-3xl mx-auto bg-white rounded-3xl border-2 border-emerald-700 shadow-lg p-6 sm:p-8 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                      পেমেন্ট সেশন তৈরি হয়েছে (₹৫০০)
                    </p>
                    <h3 className="text-xl font-bold font-serif-bn text-stone-900">
                      Submission ID: <span className="font-mono text-emerald-900">{pendingSession.record.submission_code}</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      আপনার আবেদন <strong>&ldquo;{pendingSession.record.manuscript_title}&rdquo;</strong> নিবন্ধিত হয়েছে (Status: Pending)। নতুন ট্যাবে খোলা ক্যাশফ্রি পেমেন্ট গেটওয়েতে ₹৫০০ পেমেন্ট সম্পন্ন করে নিচের বোতামে ক্লিক করুন — পরবর্তী ধাপে আপনার পাণ্ডুলিপি (.doc / .docx) আপলোড করতে পারবেন।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingSession(null)}
                    aria-label="বন্ধ করুন"
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {formError && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => openCashfreeCheckout(pendingSession.paymentSessionId)}
                    className="py-3 px-4 rounded-2xl border border-emerald-800/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>ক্যাশফ্রি পেমেন্ট ট্যাব পুনরায় খুলুন</span>
                  </button>
                  <button
                    type="button"
                    disabled={confirmingPaid}
                    onClick={handleConfirmPaymentComplete}
                    className="py-3 px-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-300" />
                    <span>
                      {confirmingPaid
                        ? 'যাচাই হচ্ছে...'
                        : 'পেমেন্ট সম্পন্ন — পাণ্ডুলিপি আপলোড করুন'}
                    </span>
                  </button>
                </div>
              </section>
            )}

            {/* 2. STEP 1: DETAILS & PAYMENT FORM (Manuscript upload happens in Step 2 after payment) */}
            <section className="max-w-3xl mx-auto bg-white rounded-3xl border border-stone-200/90 shadow-md overflow-hidden">
              <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-stone-100 bg-gradient-to-r from-emerald-50/70 via-amber-50/50 to-white">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                  ধাপ ১ / ২ · লেখক ও পাণ্ডুলিপির তথ্য এবং ₹৫০০ মূল্যায়ন ফি
                </p>
                <h2 className="text-xl sm:text-2xl font-bold font-serif-bn text-stone-900">
                  পাণ্ডুলিপি জমা দেওয়ার আবেদন ফর্ম
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  প্রথমে আপনার তথ্য দিয়ে ₹৫০০ মূল্যায়ন ফি পরিশোধ করুন; সফল পেমেন্টের পরপরই পরবর্তী ধাপে আপনার .doc / .docx পাণ্ডুলিপি আপলোড করতে পারবেন।
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
                {formError && !pendingSession && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs sm:text-sm text-red-700 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {statusMessage && (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs sm:text-sm text-emerald-900 flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="font-medium">{statusMessage}</span>
                  </div>
                )}

                {/* Author Name & WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-800 mb-1.5">
                      লেখকের পুরো নাম (Author Name) *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        required
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="আপনার সম্পূর্ণ নাম লিখুন"
                        className="w-full border border-stone-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-800 mb-1.5">
                      হোয়াটসঅ্যাপ নম্বর (10-digit WhatsApp) *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        required
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={whatsapp}
                        onChange={(e) =>
                          setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))
                        }
                        placeholder="যেমন: 9830123456"
                        className="w-full border border-stone-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 bg-white tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Email & Manuscript Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-800 mb-1.5">
                      ই-মেইল (Email) *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full border border-stone-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-800 mb-1.5">
                      পাণ্ডুলিপির শিরোনাম (Manuscript Title) *
                    </label>
                    <div className="relative">
                      <BookMarked className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        required
                        type="text"
                        value={manuscriptTitle}
                        onChange={(e) => setManuscriptTitle(e.target.value)}
                        placeholder="পাণ্ডুলিপির নাম লিখুন"
                        className="w-full border border-stone-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Genre & Approximate Word/Page Count */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-800 mb-1.5">
                      বিভাগ (Genre) *
                    </label>
                    <div className="relative">
                      <Layers className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="w-full border border-stone-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 bg-white cursor-pointer"
                      >
                        {GENRE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-800 mb-1.5">
                      আনুমানিক শব্দ বা পাতার সংখ্যা *
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        required
                        type="text"
                        value={pageOrWordCount}
                        onChange={(e) => setPageOrWordCount(e.target.value)}
                        placeholder="যেমন: ৩৫,০০০ শব্দ / ১৮০ পাতা"
                        className="w-full border border-stone-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Mandatory Consent Checkbox (Originality & Indemnity Declaration) */}
                <div className="rounded-2xl bg-amber-50/70 border border-amber-200/90 p-4 sm:p-5">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-stone-400 text-emerald-800 focus:ring-emerald-700 cursor-pointer shrink-0"
                    />
                    <span className="text-xs sm:text-sm font-medium text-stone-800 leading-relaxed">
                      আমি এই মর্মে ঘোষণা করছি যে, জমাকৃত পাণ্ডুলিপিটি সম্পূর্ণভাবে আমার নিজের মৌলিক সৃষ্টি এবং এতে কোনো তৃতীয় পক্ষের কপিরাইট বা আইনি অধিকার লঙ্ঘন করা হয়নি। এই লেখার মৌলিকত্ব বা কপিরাইট সংক্রান্ত ভবিষ্যতে কোনো আইনি জটিলতা বা দাবি উত্থাপিত হলে তার সম্পূর্ণ দায়ভার আমার নিজের থাকবে এবং এর জন্য HIJIBIJI Publisher কোনোভাবেই দায়ী থাকবে না। পাশাপাশি, আমি কর্মসূচির সমস্ত শর্তাবলী পড়েছি এবং এককালীন ₹৫০০ মূল্যায়ন ফি প্রদানে সম্মত।
                    </span>
                  </label>
                </div>

                {/* Submit & Cashfree ₹500 CTA */}
                <div className="pt-1 space-y-2.5">
                  <button
                    type="submit"
                    disabled={!consentChecked || submitting}
                    className="w-full py-3.5 px-6 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm sm:text-base transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      {submitting
                        ? 'প্রক্রিয়াকরণ হচ্ছে...'
                        : '₹৫০০ মূল্যায়ন ফি পরিশোধ করুন (পরবর্তী ধাপে পাণ্ডুলিপি আপলোড)'}
                    </span>
                  </button>
                  <p className="text-[11px] text-center text-stone-500">
                    ১০০% সুরক্ষিত ক্যাশফ্রি (Cashfree) পেমেন্ট গেটওয়ে · UPI / কার্ড / নেট ব্যাংকিং
                  </p>
                </div>
              </form>
            </section>
          </>
        )}
      </main>

      <Footer onOpenPolicy={setActivePolicy} />
      <PolicyModal type={activePolicy} onClose={() => setActivePolicy(null)} />
    </div>
  );
}
