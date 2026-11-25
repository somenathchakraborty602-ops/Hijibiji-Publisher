'use client';

import React, { useState, useEffect } from 'react';
import { BookSalesView } from '@/components/BookSalesView';
import { supabase, Book, INITIAL_BOOKS } from '@/lib/supabase';

const DEFAULT_SHIMLAY = INITIAL_BOOKS.find((b) => b.id.includes('shimlay'))!;

export default function ShimlaySonkotClient() {
  const [book, setBook] = useState<Book>(DEFAULT_SHIMLAY);

  useEffect(() => {
    let cancelled = false;

    async function loadBook() {
      try {
        const { data } = await supabase
          .from('books')
          .select('*')
          .ilike('title', '%শিমলা%')
          .maybeSingle();

        if (!cancelled && data) {
          const dbBook = data as Book;
          setBook({
            ...DEFAULT_SHIMLAY,
            ...dbBook,
            genre: dbBook.genre || DEFAULT_SHIMLAY.genre,
            page_count: dbBook.page_count || DEFAULT_SHIMLAY.page_count,
            publish_year: dbBook.publish_year || DEFAULT_SHIMLAY.publish_year,
            sales_banner_url: dbBook.sales_banner_url || null,
          });
        }
      } catch (e) {
        console.warn('Supabase book fetch fallback for /shimlay-sonkot:', e);
      }
    }

    loadBook();
    return () => {
      cancelled = true;
    };
  }, []);

  return <BookSalesView book={book} />;
}
