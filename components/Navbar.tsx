'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Shield, BookOpen } from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  activePath?: string;
}

export function Navbar({ cartCount, onOpenCart, activePath = '/' }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-amber-100 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Identity */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 overflow-hidden flex items-center justify-center shadow-xs group-hover:border-emerald-700 transition relative">
            <Image
              src="/logo.png"
              alt="হিজিবিজি পাবলিশার্স"
              width={48}
              height={48}
              className="w-full h-full object-contain p-0.5"
              priority
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-serif-bn text-emerald-900 leading-tight group-hover:text-emerald-950 transition">
              হিজিবিজি পাবলিশার্স
            </h1>
            <p className="text-[11px] md:text-xs text-amber-800 font-medium">
              HIJIBIJI PUBLISHERS • Kolkata
            </p>
          </div>
        </Link>

        {/* Navigation links & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-stone-600 mr-2">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg transition ${
                activePath === '/'
                  ? 'bg-amber-100/70 text-emerald-950 font-bold'
                  : 'hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              সব বই
            </Link>
            <Link
              href="/shimlay-sonkot"
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                activePath === '/shimlay-sonkot'
                  ? 'bg-amber-100/70 text-emerald-950 font-bold'
                  : 'hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
              <span>শিমলায় সংকট</span>
            </Link>
            <Link
              href="/chad"
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                activePath === '/chad'
                  ? 'bg-amber-100/70 text-emerald-950 font-bold'
                  : 'hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
              <span>ছাদ</span>
            </Link>
          </nav>

          {/* Admin link */}
          <Link
            href="/admin"
            className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-emerald-900 px-3 py-2 rounded-xl text-xs font-semibold tracking-wider transition border border-stone-200 shadow-xs"
            title="Admin Control Panel"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-800" />
            <span className="hidden xs:inline">ADMIN</span>
          </Link>

          {/* Cart Bag button */}
          <button
            onClick={onOpenCart}
            type="button"
            className="relative flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 sm:px-4 py-2 rounded-xl font-medium transition shadow-xs cursor-pointer active:scale-95"
            aria-label="শপিং কার্ট খুলুন"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline text-xs sm:text-sm">বইয়ের থলি</span>
            <span className="bg-amber-500 text-stone-950 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
