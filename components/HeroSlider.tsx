'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, BookOpen, Image as ImageIcon } from 'lucide-react';
import { BannerSlide } from '@/lib/supabase';

interface HeroSliderProps {
  slides: BannerSlide[];
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const activeSlides = slides.filter((s) => s.is_active);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);

  // Auto-advance slides every 5 seconds (paused on hover)
  useEffect(() => {
    if (activeSlides.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSlides.length, isHovered]);

  if (activeSlides.length === 0) return null;

  const safeIndex = currentIndex % activeSlides.length;
  const currentSlide = activeSlides[safeIndex] || activeSlides[0];

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

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-stone-200/90 group select-none bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-950 text-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Container with responsive height */}
      <div className="relative min-h-[380px] sm:min-h-[420px] md:min-h-[440px] w-full flex items-center overflow-hidden">
        
        {/* Subtle Ambient Blurred Background from the current slide */}
        {activeSlides.map((slide, idx) => {
          const isCurrent = idx === safeIndex;
          return (
            <div
              key={slide.id || idx}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-none ${
                isCurrent ? 'opacity-35 z-0' : 'opacity-0 z-0'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.image_url}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover blur-2xl scale-125"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-stone-950/60" />
            </div>
          );
        })}

        {/* Foreground Active Slide Content */}
        <div className="relative z-10 w-full px-6 py-8 sm:px-10 md:px-14 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
          
          {/* Left / Info Side */}
          <div className="flex-1 space-y-3 sm:space-y-4 max-w-xl text-center md:text-left order-2 md:order-1">
            {currentSlide.badge && (
              <div className="inline-flex items-center gap-1.5 bg-amber-400 text-stone-950 text-xs font-bold px-3 py-1 rounded-full shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                <span>{currentSlide.badge}</span>
              </div>
            )}

            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-serif-bn leading-tight text-white drop-shadow-md">
              {currentSlide.title}
            </h3>

            {currentSlide.subtitle && (
              <p className="text-xs sm:text-sm md:text-base text-stone-200 line-clamp-3 leading-relaxed drop-shadow-sm font-medium">
                {currentSlide.subtitle}
              </p>
            )}

            <div className="pt-2 sm:pt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {currentSlide.link_url && (
                <Link
                  href={currentSlide.link_url}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-lg transition flex items-center gap-2 group/btn border border-emerald-400/30"
                >
                  <BookOpen className="w-4 h-4 text-amber-300" />
                  <span>{currentSlide.button_text || 'বিস্তারিত দেখুন ও অর্ডার করুন'}</span>
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>
          </div>

          {/* Right / PROMINENT BOOK PHOTO CARD Side */}
          <div className="shrink-0 flex items-center justify-center order-1 md:order-2">
            <div className="relative group/book">
              {/* Outer decorative ambient glow */}
              <div className="absolute -inset-3 bg-gradient-to-r from-amber-500/30 via-emerald-500/20 to-amber-500/30 rounded-3xl blur-xl opacity-75 group-hover/book:opacity-100 transition duration-500" />

              {/* The Actual Book Cover Photo Card */}
              <div className="relative w-44 h-60 sm:w-56 sm:h-76 md:w-64 md:h-88 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 bg-stone-900 transition-all duration-500 group-hover/book:scale-105 flex items-center justify-center">
                {imageErrorMap[currentSlide.id] ? (
                  <div className="flex flex-col items-center justify-center p-4 text-center text-stone-400 space-y-2">
                    <ImageIcon className="w-12 h-12 text-stone-500" />
                    <span className="text-xs font-serif-bn text-stone-300 font-semibold">{currentSlide.title}</span>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentSlide.image_url}
                      alt={currentSlide.title}
                      className="w-full h-full object-cover object-center"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        setImageErrorMap((prev) => ({ ...prev, [currentSlide.id]: true }));
                      }}
                    />
                    {/* Realistic 3D book spine gradient reflection on the left edge */}
                    <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white/20 via-black/30 to-transparent pointer-events-none" />
                    {/* Subtle gloss highlight across the cover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/10 pointer-events-none" />
                  </>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Previous & Next Control Buttons */}
        {activeSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="পূর্ববর্তী স্লাইড"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-stone-950/60 hover:bg-emerald-700 text-white backdrop-blur-md flex items-center justify-center transition border border-white/20 shadow-lg cursor-pointer hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="পরবর্তী স্লাইড"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-stone-950/60 hover:bg-emerald-700 text-white backdrop-blur-md flex items-center justify-center transition border border-white/20 shadow-lg cursor-pointer hover:scale-110 active:scale-95"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Slide Counter Badge (Top Right) */}
        {activeSlides.length > 1 && (
          <div className="absolute top-4 right-4 z-20 bg-stone-950/70 backdrop-blur-md text-amber-300 text-xs font-mono font-bold px-3 py-1 rounded-full border border-white/20 shadow-sm">
            {safeIndex + 1} / {activeSlides.length}
          </div>
        )}

        {/* Dots Pagination Indicator (Bottom) */}
        {activeSlides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {activeSlides.map((_, idx) => {
              const isActive = idx === safeIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`স্লাইড ${idx + 1}-এ যান`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'w-8 bg-amber-400 shadow-md'
                      : 'w-2 bg-white/40 hover:bg-white/80'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
