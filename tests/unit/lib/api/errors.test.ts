/**
 * Purpose: Test API error utilities for correct message extraction,
 * field error normalization, and error handling.
 */
import { describe, it, expect } from 'vitest';
import {
  ApiRequestError,
  errorMessage,
  fieldErrors,
  fieldErrorMessage,
  normalizeFieldErrors,
} from '@/lib/api/errors';

describe('ApiRequestError', () => {
  /**
   * Purpose: Verify ApiRequestError stores message and fields correctly.
   */
  it('should store message and fields', () => {
    const fields = [{ field: 'email', message: 'Required' }];
    const error = new ApiRequestError('Validation failed', fields);

    expect(error.message).toBe('Validation failed');
    expect(error.fields).toEqual(fields);
    expect(error.name).toBe('ApiRequestError');
  });

  /**
   * Purpose: Verify ApiRequestError defaults to empty fields array.
   */
  it('should default to empty fields array', () => {
    const error = new ApiRequestError('Something went wrong');

    expect(error.fields).toEqual([]);
  });

  /**
   * Purpose: Verify ApiRequestError is an instance of Error.
   */
  it('should be an instance of Error', () => {
    const error = new ApiRequestError('fail');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiRequestError);
  });
});

describe('errorMessage', () => {
  /**
   * Purpose: Verify errorMessage extracts the message from Error instances.
   */
  it('should return message from Error instance', () => {
    const error = new Error('Not found');

    expect(errorMessage(error)).toBe('Not found');
  });

  /**
   * Purpose: Verify errorMessage extracts the message from ApiRequestError.
   */
  it('should return message from ApiRequestError', () => {
    const error = new ApiRequestError('Validation failed');

    expect(errorMessage(error)).toBe('Validation failed');
  });

  /**
   * Purpose: Verify errorMessage returns fallback for non-Error values.
   */
  it('should return fallback for non-Error values', () => {
    expect(errorMessage('string error')).toBe('Something went wrong.');
    expect(errorMessage(null)).toBe('Something went wrong.');
    expect(errorMessage(undefined)).toBe('Something went wrong.');
    expect(errorMessage(42)).toBe('Something went wrong.');
  });
});

describe('fieldErrors', () => {
  /**
   * Purpose: Verify fieldErrors extracts fields from ApiRequestError.
   */
  it('should extract fields from ApiRequestError', () => {
    const fields = [
      { field: 'email', message: 'Invalid' },
      { field: 'name', message: 'Required' },
    ];
    const error = new ApiRequestError('Validation failed', fields);

    expect(fieldErrors(error)).toEqual(fields);
  });

  /**
   * Purpose: Verify fieldErrors returns empty array for non-ApiRequestError.
   */
  it('should return empty array for non-ApiRequestError', () => {
    expect(fieldErrors(new Error('fail'))).toEqual([]);
    expect(fieldErrors('string')).toEqual([]);
    expect(fieldErrors(null)).toEqual([]);
    expect(fieldErrors(undefined)).toEqual([]);
  });
});

describe('fieldErrorMessage', () => {
  /**
   * Purpose: Verify fieldErrorMessage finds the correct field message.
   */
  it('should return message for matching field', () => {
    const error = new ApiRequestError('Validation', [
      { field: 'email', message: 'Email is required' },
      { field: 'name', message: 'Name is too short' },
    ]);

    expect(fieldErrorMessage(error, 'email')).toBe('Email is required');
    expect(fieldErrorMessage(error, 'name')).toBe('Name is too short');
  });

  /**
   * Purpose: Verify fieldErrorMessage returns undefined for non-existent field.
   */
  it('should return undefined for non-existent field', () => {
    const error = new ApiRequestError('Validation', [
      { field: 'email', message: 'Invalid' },
    ]);

    expect(fieldErrorMessage(error, 'password')).toBeUndefined();
  });

  /**
   * Purpose: Verify fieldErrorMessage returns undefined for non-ApiRequestError.
   */
  it('should return undefined for non-ApiRequestError', () => {
    expect(fieldErrorMessage(new Error('fail'), 'email')).toBeUndefined();
    expect(fieldErrorMessage(null, 'email')).toBeUndefined();
  });
});

describe('normalizeFieldErrors', () => {
  /**
   * Purpose: Verify normalizeFieldErrors handles a standard array of field errors.
   */
  it('should normalize standard field error objects', () => {
    const input = [
      { field: 'email', message: 'Required', code: 'REQUIRED' },
      { field: 'name', message: 'Too short', code: 'MIN_LENGTH' },
    ];

    expect(normalizeFieldErrors(input)).toEqual([
      { field: 'email', message: 'Required', code: 'REQUIRED' },
      { field: 'name', message: 'Too short', code: 'MIN_LENGTH' },
    ]);
  });

  /**
   * Purpose: Verify normalizeFieldErrors defaults field to "field" when missing.
   */
  it('should default field to "field" when missing', () => {
    const input = [{ message: 'Some error' }];

    expect(normalizeFieldErrors(input)).toEqual([
      { field: 'field', message: 'Some error', code: undefined },
    ]);
  });

  /**
   * Purpose: Verify normalizeFieldErrors defaults message to empty string when missing.
   */
  it('should default message to empty string when missing', () => {
    const input = [{ field: 'email' }];

    expect(normalizeFieldErrors(input)).toEqual([]);
  });

  /**
   * Purpose: Verify normalizeFieldErrors defaults code to undefined when missing.
   */
  it('should set code to undefined when missing', () => {
    const input = [{ field: 'email', message: 'Required' }];

    expect(normalizeFieldErrors(input)).toEqual([
      { field: 'email', message: 'Required', code: undefined },
    ]);
  });

  /**
   * Purpose: Verify normalizeFieldErrors returns empty array for non-array input.
   */
  it('should return empty array for non-array input', () => {
    expect(normalizeFieldErrors(null)).toEqual([]);
    expect(normalizeFieldErrors(undefined)).toEqual([]);
    expect(normalizeFieldErrors('string')).toEqual([]);
    expect(normalizeFieldErrors(42)).toEqual([]);
    expect(normalizeFieldErrors({})).toEqual([]);
  });

  /**
   * Purpose: Verify normalizeFieldErrors filters out non-object items.
   */
  it('should filter out non-object items in array', () => {
    const input = [null, 'string', 42, { field: 'email', message: 'Valid' }];

    expect(normalizeFieldErrors(input)).toEqual([
      { field: 'email', message: 'Valid', code: undefined },
    ]);
  });

  /**
   * Purpose: Verify normalizeFieldErrors filters out items with empty message.
   */
  it('should filter out items with empty message', () => {
    const input = [
      { field: 'email', message: '' },
      { field: 'name', message: 'Valid' },
    ];

    expect(normalizeFieldErrors(input)).toEqual([
      { field: 'name', message: 'Valid', code: undefined },
    ]);
  });

  /**
   * Purpose: Verify normalizeFieldErrors handles empty array.
   */
  it('should handle empty array', () => {
    expect(normalizeFieldErrors([])).toEqual([]);
  });

  /**
   * Purpose: Verify normalizeFieldErrors handles mixed valid and invalid items.
   */
  it('should handle mixed valid and invalid items', () => {
    const input = [
      { field: 'email', message: 'Required', code: 'R1' },
      null,
      { field: 'name' },
      { field: 'age', message: 'Must be positive', code: 'POS' },
    ];

    expect(normalizeFieldErrors(input)).toEqual([
      { field: 'email', message: 'Required', code: 'R1' },
      { field: 'age', message: 'Must be positive', code: 'POS' },
    ]);
  });
});
