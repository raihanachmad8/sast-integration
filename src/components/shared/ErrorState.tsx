'use client';

import { Result, Button } from 'antd';
import { FaIcon } from './fa-icon';

interface ErrorStateProps {
  /** Main error title */
  title?: string;
  /** Error description / message */
  description?: string;
  /** Optional retry action */
  onRetry?: () => void;
  /** Custom retry button label */
  retryText?: string;
}

/**
 * Standardized error state component.
 * Use this for API failures, permission errors, etc.
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error while loading this content. Please try again.',
  onRetry,
  retryText = 'Try again',
}: ErrorStateProps) {
  return (
    <Result
      status="error"
      title={title}
      subTitle={description}
      icon={<FaIcon icon="fa-exclamation-triangle" style={{ color: '#ff4d4f', fontSize: 48 }} />}
      extra={
        onRetry && (
          <Button type="primary" onClick={onRetry}>
            {retryText}
          </Button>
        )
      }
    />
  );
}
