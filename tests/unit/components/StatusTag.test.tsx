// @vitest-environment jsdom
/**
 * Purpose: Verify StatusTag renders correct color/style for each status type and handles unknown values.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConfigProvider } from 'antd';
import { StatusTag } from '@/components/shared/StatusTag';

function renderTag(type: string, value: string) {
  return render(
    <ConfigProvider>
      <StatusTag type={type as any} value={value} />
    </ConfigProvider>,
  );
}

describe('StatusTag', () => {
  /**
   * Purpose: Verify critical severity renders with correct red token.
   */
  it('renders correct color for critical severity', () => {
    renderTag('severity', 'critical');
    const tag = screen.getByText('CRITICAL');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('[style]')).toHaveStyle({ color: '#dc2626' });
  });

  /**
   * Purpose: Verify high severity uses its designated color.
   */
  it('renders correct color for high severity', () => {
    renderTag('severity', 'high');
    const tag = screen.getByText('HIGH');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('[style]')).toHaveStyle({ color: '#ea580c' });
  });

  /**
   * Purpose: Verify medium severity uses its designated color.
   */
  it('renders correct color for medium severity', () => {
    renderTag('severity', 'medium');
    const tag = screen.getByText('MEDIUM');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('[style]')).toHaveStyle({ color: '#d97706' });
  });

  /**
   * Purpose: Verify low severity uses its designated color.
   */
  it('renders correct color for low severity', () => {
    renderTag('severity', 'low');
    const tag = screen.getByText('LOW');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('[style]')).toHaveStyle({ color: '#0ea5e9' });
  });

  /**
   * Purpose: Verify scanStatus types render with correct colors.
   */
  it('renders correct color for scanStatus Running', () => {
    renderTag('scanStatus', 'Running');
    const tag = screen.getByText('Running');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('[style]')).toHaveStyle({ color: '#3b82f6' });
  });

  /**
   * Purpose: Verify verdict types render with correct colors.
   */
  it('renders correct color for verdict TP', () => {
    renderTag('verdict', 'TP');
    const tag = screen.getByText('TP');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('[style]')).toHaveStyle({ color: '#dc2626' });
  });

  /**
   * Purpose: Verify verdict FP renders green.
   */
  it('renders correct color for verdict FP', () => {
    renderTag('verdict', 'FP');
    const tag = screen.getByText('FP');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('[style]')).toHaveStyle({ color: '#16a34a' });
  });

  /**
   * Purpose: Verify LABEL_MAP provides human-readable text for known statuses.
   */
  it('renders human-readable label for known status', () => {
    renderTag('findingStatus', 'needs_review');
    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify unknown status falls back to raw value text.
   */
  it('renders raw value for unknown status gracefully', () => {
    renderTag('severity', 'unknown-value');
    expect(screen.getByText('unknown-value')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify unknown status type falls back to default gray token.
   */
  it('uses default color for unknown status', () => {
    renderTag('unknownType', 'someValue');
    const tag = screen.getByText('someValue');
    expect(tag.closest('[style]')).toHaveStyle({ color: '#6b7280' });
  });

  /**
   * Purpose: Verify connection status types render with correct colors.
   */
  it('renders correct color for connectionStatus connected', () => {
    renderTag('connectionStatus', 'connected');
    const tag = screen.getByText('Connected');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('[style]')).toHaveStyle({ color: '#16a34a' });
  });

  /**
   * Purpose: Verify memberRole types render with correct colors.
   */
  it('renders correct color for memberRole owner', () => {
    renderTag('memberRole', 'owner');
    const tag = screen.getByText('Owner');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('[style]')).toHaveStyle({ color: '#0f766e' });
  });
});
