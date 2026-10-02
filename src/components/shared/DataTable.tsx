import { Table } from 'antd';

/** Sort direction. */
export type SortOrder = 'asc' | 'desc' | null;

/**
 * Column definition for the DataTable component.
 *
 * @template T - The row data type.
 */
export interface DataTableColumn<T> {
  /** Unique key for React list rendering and column identification */
  key: string;
  /** Column header content (text, node, etc.) */
  header: React.ReactNode;
  /** Render function that receives the row data and its index */
  render: (row: T, index: number) => React.ReactNode;
  /** Optional CSS class to apply to the column header and cells */
  className?: string;
  /** Horizontal text alignment for the column */
  align?: 'left' | 'right' | 'center';
  /** Whether this column is sortable. Enables click-to-sort on the header. */
  sortable?: boolean;
  /** Extract the comparable sort value from a row. Required when sortable is true. */
  sortValue?: (row: T) => string | number;
}

/** Props for the DataTable component. */
interface DataTableProps<T> {
  /** Array of row data objects */
  data: T[];
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Optional callback fired when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Function that returns a unique key for each row */
  rowKey: (row: T) => string | number;
  /** Text to display when data is empty */
  emptyText?: string;
  /** Optional CSS class for the outer container */
  className?: string;
  /** Whether the table is currently loading */
  isLoading?: boolean;
}

/**
 * Reusable DataTable component built on Ant Design Table.
 *
 * Column headers with `sortable: true` become clickable to toggle sort.
 * Three states: unsorted → ascending → descending → unsorted.
 *
 * @param props - {@link DataTableProps}
 * @returns JSX element containing the rendered Ant Design Table.
 *
 * @example
 * <DataTable
 *   data={repos}
 *   columns={repoColumns}
 *   onRowClick={(repo) => openDetail(repo)}
 *   rowKey={(r) => r.id}
 * />
 */
export function DataTable<T>({
  data,
  columns,
  onRowClick,
  rowKey,
  emptyText = 'No data available.',
  className,
  isLoading = false,
}: DataTableProps<T>) {
  const antdColumns = columns.map((col) => ({
    title: col.header,
    dataIndex: col.key,
    key: col.key,
    className: col.className,
    align: col.align,
    render: (_value: React.ReactNode, record: T, index: number) => col.render(record, index),
    ...(col.sortable && col.sortValue
      ? {
          sorter: (a: T, b: T) => {
            const aVal = col.sortValue!(a);
            const bVal = col.sortValue!(b);
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          },
          showSorterTooltip: false,
        }
      : {}),
  }));

  return (
      <Table<T>
        dataSource={data}
        columns={antdColumns}
        rowKey={(record) => rowKey(record)}
        onRow={(record) => ({
          onClick: () => onRowClick?.(record),
          style: onRowClick ? { cursor: 'pointer' } : undefined,
        })}
        loading={isLoading}
        pagination={false}
        size="middle"
        locale={{ emptyText }}
        scroll={{ x: 600 }}
      />
  );
}
