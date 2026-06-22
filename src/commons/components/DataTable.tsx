'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Table, Card, Input, Select, Dropdown, Button, Tag, Flex, Grid, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { TableFooter } from '@/commons/components/TableFooter';

export type SortOrder = 'asc' | 'desc' | null;

export interface FilterConfig {
  key: string;
  label: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  searchable?: boolean;
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

export interface ActionConfig<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: 'default' | 'danger';
  show?: (row: T) => boolean;
  disabled?: boolean | ((row: T) => boolean);
}

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  hideOnMobile?: boolean;
  width?: string | number;
}

export interface TableMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface TableSource<T> {
  data: T[];
  meta: TableMeta;
}

/** Convert PaginatedResponse from API to TableSource */
export function makeSource<T>(response: { data: T[]; meta: { page: number; perPage: number; total: number } } | undefined): TableSource<T> {
  return {
    data: response?.data ?? [],
    meta: {
      page: response?.meta?.page ?? 1,
      pageSize: response?.meta?.perPage ?? 10,
      total: response?.meta?.total ?? 0,
    },
  };
}

interface DataTableProps<T> {
  source: TableSource<T>;
  columns: DataTableColumn<T>[];
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string | number;
  emptyText?: string;
  className?: string;
  isLoading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  activeFilters?: ActiveFilter[];
  onFilterRemove?: (key: string) => void;
  actions?: ActionConfig<T>[];
  actionsVariant?: 'inline' | 'dropdown';
  toolbar?: React.ReactNode;
  compact?: boolean;
  onChange?: (page: number, pageSize: number) => void;
  /** Controlled sort state from parent (e.g. URL-synced) */
  sort?: { key: string; dir: 'asc' | 'desc' } | null;
  /** Callback when sort changes */
  onSortChange?: (sort: { key: string; dir: 'asc' | 'desc' } | null) => void;
}

function SortIndicator({ columnKey, sort }: { columnKey: string; sort: { key: string; dir: 'asc' | 'desc' } | null }) {
  const { token } = theme.useToken();

  if (sort?.key !== columnKey) {
    return <FaIcon icon="fa-arrow-up-arrow-down" style={{ fontSize: 10, opacity: 0.3, marginLeft: 4 }} />;
  }

  return (
    <FaIcon
      icon={sort.dir === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'}
      style={{ fontSize: 10, color: token.colorPrimary, marginLeft: 4 }}
    />
  );
}

export function DataTable<T>({
  source,
  columns,
  onRowClick,
  rowKey,
  emptyText = 'No data available.',
  isLoading = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters = [],
  filterValues = {},
  onFilterChange,
  activeFilters = [],
  onFilterRemove,
  actions,
  actionsVariant = 'inline',
  toolbar,
  compact = false,
  onChange,
  sort: externalSort,
  onSortChange,
}: DataTableProps<T>) {
  const { token } = theme.useToken();
  const breakpoints = Grid.useBreakpoint();
  const isMobile = !breakpoints.md;

  // Internal state for immediate UI feedback
  const [internalSearch, setInternalSearch] = useState(searchValue ?? '');
  const lastExternalRef = useRef(searchValue ?? '');

  // Sync from external searchValue (URL changes, back/forward, clear)
  useEffect(() => {
    if (searchValue !== undefined && searchValue !== lastExternalRef.current) {
      lastExternalRef.current = searchValue;
      setInternalSearch(searchValue);
    }
  }, [searchValue]);

  // Use external sort if provided, otherwise local state
  const [internalSort, setInternalSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const sort = externalSort !== undefined ? externalSort : internalSort;

  const visibleColumns = useMemo(
    () => (isMobile ? columns.filter((col) => !col.hideOnMobile) : columns),
    [isMobile, columns],
  );

  const handleSearch = useCallback(
    (value: string) => {
      lastExternalRef.current = value;
      setInternalSearch(value);
      onSearchChange?.(value);
    },
    [onSearchChange],
  );

  const antdColumns = useMemo(() => {
    const cols = visibleColumns.map((col) => ({
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {col.header}
          {col.sortable && <SortIndicator columnKey={col.key} sort={sort} />}
        </span>
      ),
      dataIndex: col.key,
      key: col.key,
      className: col.className,
      align: col.align,
      width: col.width,
      render: (_value: unknown, record: T, index: number) => col.render(record, index),
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

    if (actions && actions.length > 0) {
      const colWidth = actionsVariant === 'dropdown' ? 44 : undefined;
      cols.push({
        title: <span />,
        dataIndex: '__actions',
        key: '__actions',
        className: undefined,
        width: colWidth,
        align: 'center' as const,
        render: (_: unknown, record: T) => {
          const visibleActions = actions.filter((a) => !a.show || a.show(record));
          if (visibleActions.length === 0) return null;

          if (actionsVariant === 'inline') {
            return (
              <Flex gap={token.paddingXS} wrap="nowrap">
                {visibleActions.map((action) => (
                  <Button
                    key={action.label}
                    size="small"
                    danger={action.variant === 'danger'}
                    disabled={typeof action.disabled === 'function' ? action.disabled(record) : action.disabled}
                    onClick={(e) => { e.stopPropagation(); action.onClick(record); }}
                    icon={action.icon}
                  >
                    {action.label}
                  </Button>
                ))}
              </Flex>
            );
          }

          return (
            <Dropdown
              menu={{
                items: visibleActions.map((action) => ({
                  key: action.label,
                  label: action.label,
                  icon: action.icon,
                  danger: action.variant === 'danger',
                  disabled: typeof action.disabled === 'function' ? action.disabled(record) : action.disabled,
                  onClick: () => action.onClick(record),
                })),
              }}
              trigger={['click']}
            >
              <FaIcon
                icon="fa-ellipsis-vertical"
                style={{ cursor: 'pointer', color: token.colorTextSecondary, padding: `${token.paddingXXS}px ${token.paddingXS}px` }}
              />
            </Dropdown>
          );
        },
      });
    }

    return cols;
  }, [visibleColumns, actions, sort, actionsVariant, token]);

  const hasToolbar = searchable || filters.length > 0 || !!toolbar;

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {hasToolbar && (
          <Flex
            gap={token.marginSM}
            wrap="wrap"
            align="center"
            style={{
              padding: `${token.paddingSM}px ${token.paddingLG}px`,
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            {searchable && (
              <Input
                allowClear
                style={{ flex: 1, minWidth: 200, maxWidth: 360 }}
                placeholder={searchPlaceholder}
                prefix={<FaIcon icon="fa-magnifying-glass" style={{ color: token.colorTextQuaternary }} />}
                value={internalSearch}
                onChange={(e) => handleSearch(e.target.value)}
              />
            )}

            {filters.map((filter) => (
              <Select
                key={filter.key}
                style={{ minWidth: 150 }}
                placeholder={filter.label}
                value={filterValues[filter.key] || undefined}
                onChange={(value) => onFilterChange?.(filter.key, value ?? '')}
                options={[{ value: '', label: filter.placeholder ?? `All ${filter.label}` }, ...filter.options]}
                allowClear
                {...(filter.searchable ? {
                  showSearch: true,
                  filterOption: (input, option) =>
                    (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase()),
                } : {})}
              />
            ))}

            {toolbar && <Flex style={{ marginLeft: isMobile ? undefined : 'auto' }}>{toolbar}</Flex>}
          </Flex>
        )}

        {activeFilters.length > 0 && (
          <Flex
            gap="small"
            wrap="wrap"
            style={{ padding: `${token.paddingXS}px ${token.paddingMD}px`, borderBottom: `1px solid ${token.colorBorderSecondary}` }}
          >
            {activeFilters.map((filter) => (
              <Tag
                key={filter.key}
                closable
                onClose={() => onFilterRemove?.(filter.key)}
                style={{ borderRadius: 6, margin: 0 }}
              >
                {filter.label}: {filter.value}
              </Tag>
            ))}
          </Flex>
        )}

        <Table<T>
          dataSource={source.data}
          columns={antdColumns}
          rowKey={(record) => rowKey(record)}
          onRow={(record) => ({
            onClick: () => onRowClick?.(record),
            style: onRowClick ? { cursor: 'pointer' } : undefined,
          })}
          loading={isLoading}
          pagination={false}
          size={compact ? 'small' : 'middle'}
          locale={{ emptyText }}
          scroll={{ x: 600 }}
          onChange={(_pagination, _filters, sorter) => {
            if (!Array.isArray(sorter) && sorter.columnKey && sorter.order) {
              const newSort = { key: String(sorter.columnKey), dir: sorter.order === 'ascend' ? 'asc' as const : 'desc' as const };
              setInternalSort(newSort);
              onSortChange?.(newSort);
            } else {
              setInternalSort(null);
              onSortChange?.(null);
            }
          }}
        />

        {!isLoading && source.meta.total > 0 && onChange && (
          <TableFooter
            current={source.meta.page}
            pageSize={source.meta.pageSize}
            total={source.meta.total}
            onChange={onChange}
          />
        )}
      </div>
    </Card>
  );
}
