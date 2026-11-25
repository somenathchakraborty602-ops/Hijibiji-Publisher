'use client';

import React, { useState, useEffect } from 'react';
import { BookSalesView } from '@/components/BookSalesView';
import { supabase, Book, INITIAL_BOOKS } from '@/lib/supabase';

const DEFAULT_CHAD = INITIAL_BOOKS.find((b) => b.id.includes('chad'))!;

export default function ChadClient() {
  const [book, setBook] = useState<Book>(DEFAULT_CHAD);

  useEffect(() => {
    let cancelled = false;

    async function loadBook() {
      try {
        const { data } = await supabase
          .from('books')
          .select('*')
          .ilike('title', '%ছাদ%')
          .maybeSingle();

        if (!cancelled && data) {
          const dbBook = data as Book;
          setBook({
            ...DEFAULT_CHAD,
            ...dbBook,
            genre: dbBook.genre || DEFAULT_CHAD.genre,
            page_count: dbBook.page_count || DEFAULT_CHAD.page_count,
            publish_year: dbBook.publish_year || DEFAULT_CHAD.publish_year,
            sales_banner_url: dbBook.sales_banner_url || null,
          });
        }
      } catch (e) {
        console.warn('Supabase book fetch fallback for /chad:', e);
      }
    }

    loadBook();
    return () => {
      cancelled = true;
    };
  }, []);

  return <BookSalesView book={book} />;
}
