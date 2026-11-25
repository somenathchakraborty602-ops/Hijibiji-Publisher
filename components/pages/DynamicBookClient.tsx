'use client';

import React, { useState, useEffect } from 'react';
import { BookSalesView } from '@/components/BookSalesView';
import { supabase, Book, INITIAL_BOOKS } from '@/lib/supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function DynamicBookClient({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadBook() {
      setLoading(true);
      try {
        let fetched: Book | null = null;

        if (UUID_REGEX.test(bookId)) {
          const { data } = await supabase
            .from('books')
            .select('*')
            .eq('id', bookId)
            .maybeSingle();
          if (data) fetched = data as Book;
        }

        // Support friendly slug lookup as well (e.g. /book/chad or /book/shimlay-sonkot)
        if (!fetched) {
          const lower = bookId.toLowerCase();
          if (lower.includes('chad')) {
            const { data } = await supabase
              .from('books')
              .select('*')
              .ilike('title', '%ছাদ%')
              .maybeSingle();
            if (data) fetched = data as Book;
          } else if (lower.includes('shimla')) {
            const { data } = await supabase
              .from('books')
              .select('*')
              .ilike('title', '%শিমলা%')
              .maybeSingle();
            if (data) fetched = data as Book;
          }
        }

        if (cancelled) return;

        if (fetched) {
          setBook(fetched);
        } else {
          const fallback =
            INITIAL_BOOKS.find((b) => b.id === bookId || b.slug === bookId) ||
            INITIAL_BOOKS[0];
          setBook(fallback);
        }
      } catch {
        if (cancelled) return;
        const fallback =
          INITIAL_BOOKS.find((b) => b.id === bookId || b.slug === bookId) ||
          INITIAL_BOOKS[0];
        setBook(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (bookId) {
      loadBook();
    }

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  return <BookSalesView book={book} loading={loading} />;
}
