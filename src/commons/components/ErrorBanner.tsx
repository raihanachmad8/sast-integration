'use client';

import { Alert } from 'antd';
import type { ReactNode } from 'react';

/** A single field-level error entry. */
interface FieldError {
  /** Field name that has the error */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Optional error code for programmatic identification */
  code?: string;
}

/** Props for the ErrorBanner component. */
interface ErrorBannerProps {
  /** Primary error message displayed prominently */
  message: string;
  /** Optional array of field-level errors displayed as a list */
  errors?: FieldError[];
  /** Optional custom content rendered below the error list */
  children?: ReactNode;
}

/**
 * Shared inline error banner using Ant Design Alert.
 * Used for mutation errors and form validation errors.
 *
 * @param props - {@link ErrorBannerProps}
 * @returns JSX element rendering an error alert with `role="alert"`.
 *
 * @example
 * <ErrorBanner message="Something went wrong" />
 *
 * @example
 * <ErrorBanner
 *   message="Please fix the highlighted fields"
 *   errors={[
 *     { field: 'email', message: 'Email is required' },
 *     { field: 'role', message: 'Invalid role' },
 *   ]}
 * />
 */
export function ErrorBanner({ message, errors }: ErrorBannerProps) {
  const hasFields = errors && errors.length > 0;

  const description = hasFields ? (
    <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
      {errors.map((item) => (
        <li key={`${item.field}-${item.code ?? item.message}`}>
          <strong>{item.field.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase())}</strong>
          {' '}{item.message}
        </li>
      ))}
    </ul>
  ) : undefined;

  return (
    <Alert
      type="error"
      showIcon
      title={message}
      description={description}
      role="alert"
    />
  );
}
