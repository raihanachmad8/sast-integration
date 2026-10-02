// @vitest-environment jsdom
/**
 * Purpose: Verify StatusPill renders correct variant styles and displays children text.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConfigProvider } from 'antd';
import { StatusPill } from '@/components/shared/StatusPill';

function renderPill(variant: string, children: React.ReactNode, props?: Record<string, any>) {
  return render(
    <ConfigProvider>
      <StatusPill variant={variant as any} {...props}>
        {children}
      </StatusPill>
    </ConfigProvider>,
  );
}

describe('StatusPill', () => {
  /**
   * Purpose: Verify teal variant renders with teal color.
   */
  it('renders teal variant with correct color', () => {
    renderPill('teal', 'Active');
    const tag = screen.getByText('Active');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-teal');
  });

  /**
   * Purpose: Verify blue variant renders with blue color.
   */
  it('renders blue variant with correct color', () => {
    renderPill('blue', 'Manager');
    const tag = screen.getByText('Manager');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-blue');
  });

  /**
   * Purpose: Verify amber variant maps to gold color.
   */
  it('renders amber variant with gold color', () => {
    renderPill('amber', 'Pending');
    const tag = screen.getByText('Pending');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-gold');
  });

  /**
   * Purpose: Verify red variant renders with red color.
   */
  it('renders red variant with correct color', () => {
    renderPill('red', 'Failed');
    const tag = screen.getByText('Failed');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-red');
  });

  /**
   * Purpose: Verify purple variant renders with purple color.
   */
  it('renders purple variant with correct color', () => {
    renderPill('purple', 'Reviewer');
    const tag = screen.getByText('Reviewer');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-purple');
  });

  /**
   * Purpose: Verify slate variant maps to default color.
   */
  it('renders slate variant with default color', () => {
    renderPill('slate', 'Member');
    const tag = screen.getByText('Member');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-default');
  });

  /**
   * Purpose: Verify children text is displayed inside the pill.
   */
  it('shows children text', () => {
    renderPill('teal', 'Hello World');
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify closable tag renders close button.
   */
  it('renders closable tag when closable is true', () => {
    renderPill('teal', 'Filter: value', { closable: true });
    const closeBtn = document.querySelector('.ant-tag-close-icon');
    expect(closeBtn).toBeInTheDocument();
  });

  /**
   * Purpose: Verify unknown variant falls back to default color.
   */
  it('falls back to default color for unknown variant', () => {
    renderPill('unknown', 'Test');
    const tag = screen.getByText('Test');
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-default');
  });
});
