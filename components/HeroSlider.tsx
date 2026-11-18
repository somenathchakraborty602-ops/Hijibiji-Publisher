'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { BannerSlide } from '@/lib/supabase';

interface HeroSliderProps {
  slides: BannerSlide[];
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const activeSlides = slides.filter((s) => s.is_active && s.image_url);
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
      className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-stone-200/90 group select-none bg-stone-900"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full-bleed responsive photo banner container */}
      <div className="relative h-[210px] sm:h-[310px] md:h-[390px] lg:h-[430px] w-full overflow-hidden">
        {activeSlides.map((slide, idx) => {
          const isCurrent = idx === safeIndex;
          const hasError = imageErrorMap[slide.id];
          return (
            <div
              key={slide.id || idx}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {hasError ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900 text-stone-400 space-y-2">
                  <ImageIcon className="w-12 h-12 text-stone-500" />
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={slide.image_url}
                  alt={slide.title || `ব্যানার ${idx + 1}`}
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    setImageErrorMap((prev) => ({ ...prev, [slide.id]: true }));
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Previous & Next Control Buttons */}
        {activeSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="পূর্ববর্তী ব্যানার"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-stone-950/55 hover:bg-emerald-700 text-white backdrop-blur-md flex items-center justify-center transition border border-white/25 shadow-lg cursor-pointer hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="পরবর্তী ব্যানার"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-stone-950/55 hover:bg-emerald-700 text-white backdrop-blur-md flex items-center justify-center transition border border-white/25 shadow-lg cursor-pointer hover:scale-110 active:scale-95"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Dots Pagination Indicator (Bottom) */}
        {activeSlides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-stone-950/35 backdrop-blur-xs px-3 py-1.5 rounded-full">
            {activeSlides.map((_, idx) => {
              const isActive = idx === safeIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`ব্যানার ${idx + 1}-এ যান`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'w-7 bg-amber-400 shadow-md'
                      : 'w-2 bg-white/60 hover:bg-white'
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
