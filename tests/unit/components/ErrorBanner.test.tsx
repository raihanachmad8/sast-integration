// @vitest-environment jsdom
/**
 * Purpose: Verify ErrorBanner renders error message, field errors, and accessibility attributes.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConfigProvider } from 'antd';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

function renderBanner(props: Record<string, any>) {
  return render(
    <ConfigProvider>
      <ErrorBanner message="Test" {...props} />
    </ConfigProvider>,
  );
}

describe('ErrorBanner', () => {
  /**
   * Purpose: Verify primary error message is rendered.
   */
  it('renders error message', () => {
    renderBanner({ message: 'Something went wrong' });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify error banner has role="alert" for accessibility.
   */
  it('has role="alert" for accessibility', () => {
    renderBanner({ message: 'Error' });
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  /**
   * Purpose: Verify field errors are rendered as a list when provided.
   */
  it('renders field errors when provided', () => {
    renderBanner({
      message: 'Please fix the highlighted fields',
      errors: [
        { field: 'email', message: 'Email is required' },
        { field: 'role', message: 'Invalid role' },
      ],
    });
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid role')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify field names are formatted to human-readable labels.
   */
  it('formats snake_case field names to human-readable labels', () => {
    renderBanner({
      message: 'Error',
      errors: [{ field: 'first_name', message: 'Required' }],
    });
    expect(screen.getByText('First name')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify camelCase field names are formatted with spaces.
   */
  it('formats camelCase field names to human-readable labels', () => {
    renderBanner({
      message: 'Error',
      errors: [{ field: 'firstName', message: 'Required' }],
    });
    expect(screen.getByText('First Name')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify no field error list is rendered when errors array is empty.
   */
  it('does not render field errors when errors array is empty', () => {
    renderBanner({ message: 'Error', errors: [] });
    const alert = screen.getByRole('alert');
    expect(alert.querySelector('ul')).not.toBeInTheDocument();
  });

  /**
   * Purpose: Verify no field error list is rendered when errors prop is omitted.
   */
  it('does not render field errors when errors prop is omitted', () => {
    renderBanner({ message: 'Error' });
    const alert = screen.getByRole('alert');
    expect(alert.querySelector('ul')).not.toBeInTheDocument();
  });

  /**
   * Purpose: Verify children content is rendered below the error.
   */
  it('renders children when provided', () => {
    renderBanner({
      message: 'Error',
      children: <div data-testid="custom-content">Custom content</div>,
    });
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
  });
});
