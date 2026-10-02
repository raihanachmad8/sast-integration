'use client';

import { Input, Select, Flex, theme } from 'antd';
import { StatusPill } from './StatusPill';

/** A single filter item definition. */
interface FilterItem {
  /** Unique key for the filter */
  key: string;
  /** Display label */
  label: string;
  /** Filter type */
  type: 'select' | 'date' | 'dateRange';
  /** Placeholder text */
  placeholder?: string;
  /** Options for select type */
  options?: { value: string; label: string }[];
  /** Default value */
  defaultValue?: string | [string, string];
}

/** Configuration for displaying active filter tags. */
interface FilterTagConfig {
  /** Filter key */
  key: string;
  /** Display name for the tag */
  name: string;
  /** Whether the value is a timestamp */
  isTimestamp?: boolean;
  /** Date format for timestamp display */
  dateFormat?: string;
}

/** Props for the FilterControl component. */
interface FilterControlProps {
  /** Search placeholder text */
  placeholder?: string;
  /** Current search value */
  searchValue?: string;
  /** Callback when search changes */
  onSearchChange?: (value: string) => void;
  /** Filter items to display */
  filters?: FilterItem[];
  /** Current filter values */
  filterValues?: Record<string, string | null>;
  /** Callback when a filter changes */
  onFilterChange?: (key: string, value: string | null) => void;
  /** Active filter tag configuration */
  tagConfig?: FilterTagConfig[];
  /** Callback when an active filter tag is removed */
  onTagRemove?: (key: string) => void;
  /** Additional content to render after filters */
  children?: React.ReactNode;
}

/**
 * Shared filter control component with search + filter dropdowns + active tags.
 *
 * @param props - {@link FilterControlProps}
 * @returns JSX element containing the filter UI.
 *
 * @example
 * ```tsx
 * <FilterControl
 *   placeholder="Search findings..."
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   filters={[
 *     { key: 'severity', label: 'Severity', type: 'select', options: severityOptions },
 *     { key: 'status', label: 'Status', type: 'select', options: statusOptions },
 *   ]}
 *   filterValues={filters}
 *   onFilterChange={(key, value) => setFilter(key, value)}
 *   tagConfig={[
 *     { key: 'severity', name: 'Severity' },
 *     { key: 'status', name: 'Status' },
 *   ]}
 *   onTagRemove={(key) => setFilter(key, null)}
 * />
 * ```
 */
export function FilterControl({
  placeholder = 'Search...',
  searchValue,
  onSearchChange,
  filters = [],
  filterValues = {},
  onFilterChange,
  tagConfig = [],
  onTagRemove,
  children,
}: FilterControlProps) {
  const { token } = theme.useToken();
  const activeFilters = tagConfig.filter((t) => filterValues[t.key]);

  return (
    <Flex vertical gap="middle" style={{ marginBottom: token.paddingLG }}>
      <Flex gap="middle" wrap="wrap" align="center">
        {onSearchChange && (
          <Input.Search
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ minWidth: 240, maxWidth: 360 }}
            allowClear
          />
        )}
        {filters.map((filter) => (
          <Select
            key={filter.key}
            placeholder={filter.label}
            value={filterValues[filter.key] ?? undefined}
            onChange={(value) => onFilterChange?.(filter.key, value ?? null)}
            style={{ minWidth: 150 }}
            allowClear
            options={filter.options}
          />
        ))}
        {children}
      </Flex>

      {activeFilters.length > 0 && (
        <Flex gap="small" wrap="wrap">
          {activeFilters.map((tag) => {
            const value = filterValues[tag.key];
            return (
              <StatusPill
                key={tag.key}
                variant="slate"
                closable
                onClose={() => onTagRemove?.(tag.key)}
              >
                {tag.name}: {value}
              </StatusPill>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
}
