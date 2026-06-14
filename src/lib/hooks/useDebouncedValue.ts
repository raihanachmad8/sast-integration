'use client';

import { useEffect, useState } from 'react';

/**
 * Debounce a string value by the given delay.
 * Returns a stale value that only updates after the delay has passed
 * without the input changing.
 *
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebouncedValue(search);
 * // debouncedSearch updates 300ms after the user stops typing
 */
export function useDebouncedValue(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
