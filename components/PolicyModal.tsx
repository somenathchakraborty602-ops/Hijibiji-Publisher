'use client';

import React from 'react';
import { X, ShieldAlert, FileText, PhoneCall } from 'lucide-react';

export type PolicyType = 'contact' | 'terms' | 'refund' | null;

interface PolicyModalProps {
  type: PolicyType;
  onClose: () => void;
}

const POLICY_DATA = {
  contact: {
    title: 'যোগাযোগের তথ্য (Contact Us)',
    icon: PhoneCall,
    content: (
      <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
        <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
          <p className="font-bold text-sm text-emerald-950 font-serif-bn">
            হিজিবিজি পাবলিশার্স (HIJIBIJI PUBLISHERS)
          </p>
          <p className="text-stone-600 mt-1">
            কোলকাতা, পশ্চিমবঙ্গ, ভারত (Kolkata, West Bengal, India)
          </p>
        </div>
        <div className="space-y-1.5">
          <p>
            <strong>ফোন ও হোয়াটসঅ্যাপ:</strong>{' '}
            <a href="tel:+917003255857" className="text-emerald-800 underline font-semibold">
              +91 7003255857
            </a>
          </p>
          <p>
            <strong>অফিশিয়াল ইমেইল:</strong>{' '}
            <a href="mailto:contact@hijibijipublishers.com" className="text-emerald-800 underline">
              contact@hijibijipublishers.com
            </a>
          </p>
          <p>
            <strong>অফিস সময়:</strong> সোম থেকে শনি — সকাল ১০:০০ টা থেকে রাত ৮:০০ টা
          </p>
        </div>
        <p className="pt-2 text-stone-500 border-t border-stone-200">
          আপনার অর্ডারের বর্তমান অবস্থা, কুরিয়ার ট্র্যাকিং অথবা কোনো বইয়ের বাল্ক অর্ডারের জন্য সরাসরি আমাদের হোয়াটসঅ্যাপ নম্বরে বার্তা পাঠাতে পারেন।
        </p>
      </div>
    ),
  },
  terms: {
    title: 'শর্তাবলী (Terms & Conditions)',
    icon: FileText,
    content: (
      <div className="space-y-2.5 text-xs text-stone-700 leading-relaxed">
        <p>১. হিজিবিজি পাবলিশার্স-এর প্রতিটি বই ১০০% মৌলিক ও কপিরাইট আইন দ্বারা সুরক্ষিত।</p>
        <p>২. ওয়েবসাইট বা সেলস পেজে অর্ডার অনুমোদনের পর ৩ থেকে ৫ কার্যদিবসের মধ্যে কোলকাতা থেকে নির্ভরযোগ্য কুরিয়ার পার্টনারের মাধ্যমে গ্রাহকের ঠিকানায় পৌঁছে দেওয়া হয়।</p>
        <p>৩. সমস্ত মূল্য ভারতীয় মুদ্রা (INR)-তে ধার্য এবং সারা ভারতে হোম ডেলিভারি সম্পূর্ণ বিনামূল্যে দেওয়া হয়।</p>
        <p>৪. অনলাইনে পেমেন্টের জন্য ক্যাশফ্রি পেমেন্ট গেটওয়ের মাধ্যমে সুরক্ষিত এনক্রিপশন ব্যবহৃত হয়। গ্রাহকের কোনো কার্ড নম্বর বা পিন আমাদের ডাটাবেসে সংরক্ষিত হয় না।</p>
        <p>৫. বিশেষ পরিস্থিতির কারণে ডেলিভারিতে বিলম্ব হলে গ্রাহককে ফোন বা এসএমএস/হোয়াটসঅ্যাপের মাধ্যমে অবহিত করা হবে।</p>
      </div>
    ),
  },
  refund: {
    title: 'রিফান্ড ও রিটার্ন নীতি (Refunds & Cancellations)',
    icon: ShieldAlert,
    content: (
      <div className="space-y-2.5 text-xs text-stone-700 leading-relaxed">
        <p>১. কুরিয়ার পৌঁছানোর পর বইয়ে যদি কোনো বাঁধাই ত্রুটি, পৃষ্ঠার মিসপ্রিন্ট বা পরিবহণজনিত ক্ষতি থাকে, তবে ডেলিভারির ৪৮ ঘণ্টার মধ্যে আমাদের হেল্পলাইন নম্বরে জানালে সম্পূর্ণ বিনামূল্যে নতুন বই রিপ্লেস করে দেওয়া হবে।</p>
        <p>২. অর্ডার বাতিল করতে চাইলে পার্সেল ডিসপ্যাচ হওয়ার পূর্বে আমাদের হেল্পলাইনে যোগাযোগ করতে হবে।</p>
        <p>৩. রিফান্ড অনুমোদিত হলে সংশ্লিষ্ট ব্যাংকের নিয়ম অনুযায়ী ৫ থেকে ৭ কার্যদিবসের মধ্যে মূল পেমেন্ট মেথডে সম্পূর্ণ অর্থ ফেরত দেওয়া হয়।</p>
        <p>৪. ই-বুক বা ডিজিটাল সংস্করণের ক্ষেত্রে ডাউনলোড বা পাঠের অ্যাক্সেস পাওয়ার পর সাধারণত ক্যাশ রিফান্ড প্রযোজ্য নয়।</p>
      </div>
    ),
  },
};

export function PolicyModal({ type, onClose }: PolicyModalProps) {
  if (!type) return null;

  const current = POLICY_DATA[type];
  const IconComponent = current.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div onClick={onClose} className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-7 text-stone-800 z-10 text-left border border-stone-100">
          <div className="flex justify-between items-center pb-3 border-b border-stone-100 mb-4">
            <div className="flex items-center gap-2">
              <IconComponent className="w-5 h-5 text-emerald-800" />
              <h4 className="font-bold font-serif-bn text-base text-stone-900">
                {current.title}
              </h4>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto pr-1">{current.content}</div>

          <div className="mt-5 pt-3 border-t border-stone-100 text-right">
            <button
              type="button"
              onClick={onClose}
              className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
