'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin, ShieldCheck, Heart } from 'lucide-react';
import { PolicyType } from './PolicyModal';

interface FooterProps {
  onOpenPolicy: (type: PolicyType) => void;
}

export function Footer({ onOpenPolicy }: FooterProps) {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-12 pb-8 border-t border-stone-800 text-xs mt-auto">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
        {/* Brand Col */}
        <div className="space-y-3 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 overflow-hidden flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="হিজিবিজি পাবলিশার্স"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <p className="font-serif-bn font-bold text-base text-amber-300">
                হিজিবিজি পাবলিশার্স
              </p>
              <p className="text-[10px] text-stone-400">HIJIBIJI PUBLISHERS</p>
            </div>
          </div>
          <p className="text-stone-400 text-xs leading-relaxed">
            গল্প থেকে বই, বই থেকে পাঠক • Kolkata to World। মৌলিক থ্রিলার, সমকালীন উপন্যাস ও কবিতার নতুন সম্ভার।
          </p>
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium pt-1">
            <ShieldCheck className="w-4 h-4" />
            <span>১০০% কপিরাইট সুরক্ষিত মৌলিক বই</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-2">
          <h4 className="font-bold text-stone-100 text-xs tracking-wider uppercase">
            বিশেষ সংস্করণ
          </h4>
          <ul className="space-y-1.5 text-stone-400">
            <li>
              <Link href="/shimlay-sonkot" className="hover:text-amber-300 transition">
                শিমলায় সংকট (দীপক চন্দ)
              </Link>
            </li>
            <li>
              <Link href="/chad" className="hover:text-amber-300 transition">
                ছাদ (ছবি ব্যানার্জী)
              </Link>
            </li>
            <li>
              <Link href="/" className="hover:text-amber-300 transition">
                সমস্ত প্রকাশিত বই
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-amber-300 transition text-amber-400/90 font-medium">
                অ্যাডমিন ড্যাশবোর্ড
              </Link>
            </li>
          </ul>
        </div>

        {/* Compliance / Legal */}
        <div className="space-y-2">
          <h4 className="font-bold text-stone-100 text-xs tracking-wider uppercase">
            নীতিমালা ও তথ্য
          </h4>
          <ul className="space-y-1.5 text-stone-400">
            <li>
              <button
                type="button"
                onClick={() => onOpenPolicy('contact')}
                className="hover:text-amber-300 transition cursor-pointer text-left"
              >
                যোগাযোগ (Contact Us)
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onOpenPolicy('terms')}
                className="hover:text-amber-300 transition cursor-pointer text-left"
              >
                শর্তাবলী (Terms & Conditions)
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onOpenPolicy('refund')}
                className="hover:text-amber-300 transition cursor-pointer text-left"
              >
                রিটার্ন ও রিফান্ড পলিসি
              </button>
            </li>
          </ul>
        </div>

        {/* Contact info */}
        <div className="space-y-2">
          <h4 className="font-bold text-stone-100 text-xs tracking-wider uppercase">
            হেল্পলাইন ও সহায়তা
          </h4>
          <div className="space-y-2 text-stone-400 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>হিজিবিজি পাবলিশার্স, কলকাতা, পশ্চিমবঙ্গ, ভারত</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <a href="tel:+917003255857" className="hover:text-amber-300 transition">
                +91 7003255857 (কল বা WhatsApp)
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400 shrink-0" />
              <a href="mailto:contact@hijibijipublishers.com" className="hover:text-amber-300 transition">
                contact@hijibijipublishers.com
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 border-t border-stone-800 text-center text-[11px] text-stone-500 space-y-1">
        <p>
          © ২০২৬ হিজিবিজি পাবলিশার্স (HIJIBIJI PUBLISHERS)। সর্বস্বত্ব সংরক্ষিত। সমস্ত পণ্যের মূল্য ভারতীয় মুদ্রায় (INR)।
        </p>
        <p className="text-stone-600 flex items-center justify-center gap-1">
          কোলকাতা থেকে বইপ্রেমী পাঠকদের জন্য নিবেদিত <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" />
        </p>
      </div>
    </footer>
  );
}
