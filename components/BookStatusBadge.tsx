'use client';

import React from 'react';
import { Award, BookCheck, Clock, Star } from 'lucide-react';
import { normalizeBookStatus } from '@/lib/supabase';

interface BookStatusBadgeProps {
  status?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

export function BookStatusBadge({
  status,
  className = '',
  size = 'md',
}: BookStatusBadgeProps) {
  const normalized = normalizeBookStatus(status);

  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5 gap-1'
      : 'text-xs px-3 py-1 gap-1.5';
  const iconClass = size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0';

  if (normalized === 'বেস্ট সেলার') {
    return (
      <span
        className={`inline-flex items-center font-bold rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-300 text-stone-950 border border-amber-200 shadow-md ${sizeClasses} ${className}`}
      >
        <Star className={`${iconClass} fill-stone-950`} />
        <span>বেস্ট সেলার</span>
      </span>
    );
  }

  if (normalized === 'রিডার্স চয়েস') {
    return (
      <span
        className={`inline-flex items-center font-bold rounded-full bg-gradient-to-r from-emerald-700 to-teal-700 text-white border border-emerald-400/70 shadow-md ${sizeClasses} ${className}`}
      >
        <Award className={`${iconClass} text-amber-300`} />
        <span>রিডার্স চয়েস</span>
      </span>
    );
  }

  if (normalized === 'প্রি-বুকিং') {
    return (
      <span
        className={`inline-flex items-center font-bold rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white border border-indigo-300/70 shadow-md ${sizeClasses} ${className}`}
      >
        <Clock className={`${iconClass} text-indigo-100`} />
        <span>প্রি-বুকিং</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full bg-white/95 text-stone-800 border border-stone-200 shadow-sm backdrop-blur-xs ${sizeClasses} ${className}`}
    >
      <BookCheck className={`${iconClass} text-stone-600`} />
      <span>প্রকাশিত</span>
    </span>
  );
}
