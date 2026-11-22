'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Sparkles,
  Truck,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { BannerSlide } from '@/lib/supabase';

interface HeroSliderProps {
  slides: BannerSlide[];
  loading?: boolean;
}

export function HeroSlider({ slides, loading = false }: HeroSliderProps) {
  const activeSlides = slides
    .filter((s) => s.is_active && s.image_url)
    .slice(0, 3);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);

  // Auto-advance slides every 4 seconds (paused on hover)
  useEffect(() => {
    if (activeSlides.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeSlides.length, isHovered]);

  // Clean fallback hero banner when no banners are uploaded in Supabase yet
  if (activeSlides.length === 0) {
    return (
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-md border border-amber-200/70 bg-gradient-to-br from-amber-100/80 via-amber-50/70 to-emerald-50/60 px-5 py-8 sm:px-8 sm:py-12 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-amber-200/80 text-amber-950 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wide border border-amber-300/60 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>গল্প থেকে বই, বই থেকে পাঠক • Kolkata to World</span>
          </div>

          <h2 className="text-lg sm:text-2xl md:text-3xl font-bold font-serif-bn text-stone-900 leading-tight sm:whitespace-nowrap">
            মৌলিক থ্রিলার, সমকালীন উপন্যাস ও কবিতার নতুন সম্ভার
          </h2>

          <p className="text-stone-700 text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            HIJIBIJI প্রকাশনার মৌলিক থ্রিলার, সমকালীন উপন্যাস ও কবিতার নতুন বইগুলো এখন বিশেষ ছাড়ে ঘরে বসেই অর্ডার করুন। সরাসরি কোলকাতা থেকে দ্রুততম হোম ডেলিভারি ও ক্যাশফ্রি সুরক্ষিত পেমেন্ট।
          </p>

          <div className="pt-1 text-xs sm:text-sm text-emerald-900 font-medium flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            <span className="flex items-center gap-1.5 bg-white/85 px-3 py-1.5 rounded-full border border-emerald-100 shadow-2xs">
              <Truck className="w-4 h-4 text-emerald-700" /> সারা ভারতে ফ্রি ডেলিভারি
            </span>
            <span className="flex items-center gap-1.5 bg-white/85 px-3 py-1.5 rounded-full border border-emerald-100 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700" /> ১০০% মৌলিক ও কপিরাইট
            </span>
            <span className="flex items-center gap-1.5 bg-white/85 px-3 py-1.5 rounded-full border border-emerald-100 shadow-2xs">
              <Tag className="w-4 h-4 text-emerald-700" /> বিশেষ ছাড় ও কুপন
            </span>
          </div>

          {loading && (
            <div className="sr-only" aria-live="polite">
              ব্যানার লোড হচ্ছে...
            </div>
          )}
        </div>
      </div>
    );
  }

  const safeIndex = currentIndex % activeSlides.length;

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const handleDotClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(idx);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 50) {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    } else if (diff < -50) {
      setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
    }
    touchStartX.current = null;
  };

  const renderSlideImage = (slide: BannerSlide, idx: number) => {
    const hasError = imageErrorMap[slide.id];
    const content = hasError ? (
      <div className="w-full aspect-[16/6] min-h-[160px] flex flex-col items-center justify-center bg-stone-100 text-stone-400">
        <ImageIcon className="w-10 h-10 text-stone-400" />
      </div>
    ) : (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={slide.image_url}
        alt={`হোম পেজ ব্যানার ${slide.sort_order || idx + 1}`}
        className="w-full h-auto max-h-[520px] block object-contain mx-auto select-none"
        draggable={false}
        referrerPolicy="no-referrer"
        onError={() => {
          setImageErrorMap((prev) => ({ ...prev, [slide.id]: true }));
        }}
      />
    );

    const trimmedLink = (slide.link_url || '').trim();
    if (!trimmedLink) {
      return <div className="w-full">{content}</div>;
    }

    const isExternal = /^https?:\/\//i.test(trimmedLink);
    if (isExternal) {
      return (
        <a
          href={trimmedLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full cursor-pointer"
          aria-label={`ব্যানার ${slide.sort_order || idx + 1} লিঙ্ক খুলুন`}
        >
          {content}
        </a>
      );
    }

    const normalizedInternal = trimmedLink.startsWith('/') ? trimmedLink : `/${trimmedLink}`;
    return (
      <Link
        href={normalizedInternal}
        className="block w-full cursor-pointer"
        aria-label={`ব্যানার ${slide.sort_order || idx + 1} পেজে যান`}
      >
        {content}
      </Link>
    );
  };

  return (
    <div
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-stone-200/90 group select-none bg-stone-100"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Smooth sliding horizontal carousel track preserving full aspect ratio (no text cropping) */}
      <div
        className="flex items-center transition-transform duration-500 ease-out will-change-transform"
        style={{ transform: `translateX(-${safeIndex * 100}%)` }}
      >
        {activeSlides.map((slide, idx) => (
          <div key={slide.id || idx} className="w-full shrink-0 flex items-center justify-center">
            {renderSlideImage(slide, idx)}
          </div>
        ))}
      </div>

      {/* Left & Right Navigation Arrows */}
      {activeSlides.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="পূর্ববর্তী ব্যানার"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-stone-950/55 hover:bg-emerald-700 text-white backdrop-blur-md flex items-center justify-center transition border border-white/25 shadow-lg cursor-pointer hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="পরবর্তী ব্যানার"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-stone-950/55 hover:bg-emerald-700 text-white backdrop-blur-md flex items-center justify-center transition border border-white/25 shadow-lg cursor-pointer hover:scale-105 active:scale-95"
          >
            <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      {/* Bottom Pagination Dots */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-stone-950/40 backdrop-blur-xs px-3 py-1.5 rounded-full">
          {activeSlides.map((slide, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={slide.id || idx}
                type="button"
                onClick={(e) => handleDotClick(e, idx)}
                aria-label={`ব্যানার ${idx + 1}-এ যান`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'w-7 bg-amber-400 shadow-md'
                    : 'w-2 bg-white/65 hover:bg-white'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
