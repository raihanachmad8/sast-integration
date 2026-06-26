'use client';

import { Button, Badge, theme } from 'antd';
import { FaIcon } from './FaIcon';

/** A single tab definition. */
interface Tab {
  /** Unique key used for identification and active state matching */
  key: string;
  /** Display label shown in the tab button */
  label: string;
  /** Font Awesome icon class (without fa-solid prefix) */
  icon?: string;
  /** Optional count badge displayed next to the label */
  count?: number;
}

/** Props for the TabBar component. */
interface TabBarProps {
  /** Available tabs to render */
  tabs: Tab[];
  /** Currently active tab key */
  activeKey: string;
  /** Callback fired when a tab is clicked, receives the tab key */
  onChange: (key: string) => void;
  /** Base ID prefix for generating tab IDs (used for aria-labelledby linkage) */
  id?: string;
}

/**
 * Shared tab bar navigation with icons and count badges using Ant Design Button.
 *
 * @param props - {@link TabBarProps}
 * @returns JSX element rendering a horizontal tab bar with ARIA `role="tablist"`.
 *
 * @example
 * <TabBar
 *   tabs={[
 *     { key: 'members', label: 'Members', icon: 'fa-users', count: 5 },
 *     { key: 'pending', label: 'Pending', icon: 'fa-envelope-open-text', count: 2 },
 *   ]}
 *   activeKey={activeTab}
 *   onChange={setActiveTab}
 * />
 */
export function TabBar({ tabs, activeKey, onChange, id }: TabBarProps) {
  const { token } = theme.useToken();
  return (
    <div style={{ display: 'flex', gap: token.marginXXS, borderBottom: `1px solid ${token.colorBorder}`, background: token.colorBgLayout, padding: token.paddingXS }} role="tablist">
      {tabs.map((tab) => (
        <Button
          key={tab.key}
          id={id ? `${id}-${tab.key}` : undefined}
          type={activeKey === tab.key ? 'primary' : 'default'}
          role="tab"
          aria-selected={activeKey === tab.key}
          aria-controls={id ? `${id}-${tab.key}-panel` : undefined}
          onClick={() => onChange(tab.key)}
          icon={tab.icon ? <FaIcon icon={tab.icon} /> : undefined}
        >
          {tab.label}
          {tab.count !== undefined && <Badge count={tab.count} size="small" style={{ marginLeft: token.marginXS }} />}
        </Button>
      ))}
    </div>
  );
}
