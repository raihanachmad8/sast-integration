'use client';

import { Result, Button, theme } from 'antd';
import { FaIcon } from './FaIcon';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryText?: string;
}

/**
 * Standardized error state component.
 *
 * @example
 * <ErrorState title="Failed to load" description="Please try again." onRetry={() => refetch()} />
 */
export function ErrorState({ title = 'Something went wrong', description = 'We encountered an error while loading this content. Please try again.', onRetry, retryText = 'Try again' }: ErrorStateProps) {
  const { token } = theme.useToken();

  return (
    <Result
      status="error"
      title={title}
      subTitle={description}
      icon={<FaIcon icon="fa-exclamation-triangle" style={{ color: token.colorError, fontSize: 48 }} />}
      extra={onRetry && <Button type="primary" onClick={onRetry}>{retryText}</Button>}
    />
  );
}
