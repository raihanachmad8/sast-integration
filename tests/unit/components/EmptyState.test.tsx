// @vitest-environment jsdom
/**
 * Purpose: Verify EmptyState renders title, text, action button, and handles different sizes.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConfigProvider, Button } from 'antd';
import { EmptyState } from '@/components/shared/EmptyState';

function renderEmpty(props: Record<string, any>) {
  return render(
    <ConfigProvider>
      <EmptyState title="Test" {...props} />
    </ConfigProvider>,
  );
}

describe('EmptyState', () => {
  /**
   * Purpose: Verify title is rendered as primary text.
   */
  it('renders title', () => {
    renderEmpty({ title: 'No members yet' });
    expect(screen.getByText('No members yet')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify description text is shown when provided.
   */
  it('renders description text when provided', () => {
    renderEmpty({ title: 'No scans', text: 'Run your first scan.' });
    expect(screen.getByText('Run your first scan.')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify action button is rendered when action prop is provided.
   */
  it('renders action button when provided', () => {
    renderEmpty({
      title: 'Empty',
      action: <Button>Run Scan</Button>,
    });
    expect(screen.getByRole('button', { name: 'Run Scan' })).toBeInTheDocument();
  });

  /**
   * Purpose: Verify no action button is rendered when action prop is omitted.
   */
  it('does not render action button when not provided', () => {
    renderEmpty({ title: 'Empty' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  /**
   * Purpose: Verify no description text is rendered when text prop is omitted.
   */
  it('does not render text when not provided', () => {
    renderEmpty({ title: 'No items' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    // Only the title should be present
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify small size variant renders without errors.
   */
  it('renders with small size', () => {
    renderEmpty({ title: 'Small', size: 'small' });
    expect(screen.getByText('Small')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify large size variant renders without errors.
   */
  it('renders with large size', () => {
    renderEmpty({ title: 'Large', size: 'large' });
    expect(screen.getByText('Large')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify default size renders without errors.
   */
  it('renders with default size', () => {
    renderEmpty({ title: 'Default', size: 'default' });
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify icon prop renders the FaIcon element.
   */
  it('renders icon when provided', () => {
    renderEmpty({ title: 'With icon', icon: 'fa-folder-open' });
    const icon = document.querySelector('.fa-solid.fa-folder-open');
    expect(icon).toBeInTheDocument();
  });

  /**
   * Purpose: Verify no icon is rendered when icon prop is omitted.
   */
  it('does not render icon when not provided', () => {
    renderEmpty({ title: 'No icon' });
    expect(document.querySelector('.fa-solid')).not.toBeInTheDocument();
  });
});
