// @vitest-environment jsdom
/**
 * Purpose: Verify ErrorState renders error message, description, and retry button correctly.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ConfigProvider } from 'antd';
import { ErrorState } from '@/components/shared/ErrorState';

function renderError(props?: Record<string, any>) {
  return render(
    <ConfigProvider>
      <ErrorState {...props} />
    </ConfigProvider>,
  );
}

describe('ErrorState', () => {
  /**
   * Purpose: Verify default title is rendered when no title prop is provided.
   */
  it('renders default title', () => {
    renderError();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify custom title overrides the default.
   */
  it('renders custom title when provided', () => {
    renderError({ title: 'Access denied' });
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify default description is rendered when no description prop is provided.
   */
  it('renders default description', () => {
    renderError();
    expect(
      screen.getByText('We encountered an error while loading this content. Please try again.'),
    ).toBeInTheDocument();
  });

  /**
   * Purpose: Verify custom description overrides the default.
   */
  it('renders custom description when provided', () => {
    renderError({ description: 'You do not have permission.' });
    expect(screen.getByText('You do not have permission.')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify retry button is rendered when onRetry callback is provided.
   */
  it('renders retry button when onRetry is provided', () => {
    renderError({ onRetry: () => {} });
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  /**
   * Purpose: Verify retry button is not rendered when onRetry is not provided.
   */
  it('does not render retry button when onRetry is not provided', () => {
    renderError();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  /**
   * Purpose: Verify custom retry button text overrides the default.
   */
  it('renders custom retry button text', () => {
    renderError({ onRetry: () => {}, retryText: 'Reload' });
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  /**
   * Purpose: Verify onRetry callback is invoked when retry button is clicked.
   */
  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();
    renderError({ onRetry });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  /**
   * Purpose: Verify error icon is rendered.
   */
  it('renders error icon', () => {
    renderError();
    const icon = document.querySelector('.fa-solid.fa-exclamation-triangle');
    expect(icon).toBeInTheDocument();
  });
});
