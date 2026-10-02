'use client';

import { Pagination, Flex, Typography, theme } from 'antd';

interface TableFooterProps {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
  pageSizeOptions?: string[];
}

export function TableFooter({
  current,
  pageSize,
  total,
  onChange,
  pageSizeOptions = ['10', '25', '50', '100', '250'],
}: TableFooterProps) {
  const { token } = theme.useToken();
  const from = Math.min((current - 1) * pageSize + 1, total);
  const to = Math.min(current * pageSize, total);

  return (
    <Flex
      align="center"
      justify="space-between"
      style={{
        padding: `${token.paddingSM}px ${token.paddingLG}px`,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
        {total > 0 ? `Showing ${from}–${to} of ${total}` : 'No results'}
      </Typography.Text>
      <Pagination
        current={current}
        pageSize={pageSize}
        total={total}
        onChange={onChange}
        showSizeChanger
        pageSizeOptions={pageSizeOptions}
        size="small"
        style={{ margin: 0 }}
      />
    </Flex>
  );
}
