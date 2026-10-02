// @vitest-environment jsdom
/**
 * Purpose: Test useDebouncedValue hook correctly delays value updates.
 *
 * This hook is critical for search inputs — it prevents API calls on every keystroke.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  /**
   * Purpose: Verify debounce delays value update by specified milliseconds.
   */
  it('should debounce value updates by the specified delay', () => {
    vi.useFakeTimers();
    
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );
    
    // Initial value should be the same
    expect(result.current).toBe('initial');
    
    // Update the value
    rerender({ value: 'updated', delay: 300 });
    
    // Should still be initial before delay
    expect(result.current).toBe('initial');
    
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Now should be updated
    expect(result.current).toBe('updated');
    
    vi.useRealTimers();
  });

  /**
   * Purpose: Verify that rapid updates only use the latest value.
   */
  it('should use the latest value when updates are rapid', () => {
    vi.useFakeTimers();
    
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'first', delay: 300 } }
    );
    
    // Rapid updates
    rerender({ value: 'second', delay: 300 });
    rerender({ value: 'third', delay: 300 });
    
    // Fast-forward before delay completes
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    // Should still be first (delay not complete)
    expect(result.current).toBe('first');
    
    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    // Should be the last value
    expect(result.current).toBe('third');
    
    vi.useRealTimers();
  });
});
