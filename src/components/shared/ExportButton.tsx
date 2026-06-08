'use client';

import { Button, App } from 'antd';
import { FaIcon } from './FaIcon';
import { exportToCSV } from '@/lib/utils/export';

/** Column definition for CSV export. */
interface ExportColumn<T> {
  /** Key in the data object */
  key: keyof T;
  /** Display label in CSV header */
  label: string;
}

/** Props for the ExportButton component. */
interface ExportButtonProps<T> {
  /** Data to export */
  data: T[];
  /** Column definitions */
  columns: ExportColumn<T>[];
  /** Base filename (timestamp will be appended) */
  filename: string;
  /** Button label */
  label?: string;
  /** Button variant */
  variant?: 'default' | 'primary';
}

/**
 * Export button with CSV download functionality.
 *
 * @param props - {@link ExportButtonProps}
 * @returns JSX element containing the export button.
 *
 * @example
 * ```tsx
 * <ExportButton
 *   data={findings}
 *   columns={[
 *     { key: 'rule', label: 'Rule' },
 *     { key: 'severity', label: 'Severity' },
 *     { key: 'status', label: 'Status' },
 *   ]}
 *   filename="findings"
 * />
 * ```
 */
export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  label = 'Export',
  variant = 'default',
}: ExportButtonProps<T>) {
  const { message } = App.useApp();

  const handleExport = () => {
    if (data.length === 0) {
      message.warning('No data to export');
      return;
    }
    exportToCSV(data, columns, filename);
    message.success(`Exported ${data.length} rows to CSV`);
  };

  return (
    <Button
      type={variant === 'primary' ? 'primary' : 'default'}
      icon={<FaIcon icon="fa-download" />}
      onClick={handleExport}
    >
      {label}
    </Button>
  );
}
