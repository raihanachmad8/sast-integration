'use client';

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Flex, Typography, theme } from 'antd';
import Link from 'next/link';

import { getDocNav, type DocNavItem } from '@/lib/docs/shared-utils';

const { Text } = Typography;

function NavCard({
  item,
  direction,
  token,
}: {
  item: DocNavItem;
  direction: 'prev' | 'next';
  token: ReturnType<typeof theme.useToken>['token'];
}) {
  const isNext = direction === 'next';

  return (
    <Link
      href={`/docs/${item.slug}`}
      style={{
        flex: 1,
        textDecoration: 'none',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: `${token.paddingMD}px ${token.paddingLG}px`,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
          textAlign: isNext ? 'right' : 'left',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = token.colorPrimary;
          e.currentTarget.style.boxShadow = `0 4px 12px rgba(15,118,110,0.08)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = token.colorBorderSecondary;
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Flex
          align="center"
          gap={6}
          justify={isNext ? 'flex-end' : 'flex-start'}
          style={{ fontSize: token.fontSizeSM, color: token.colorTextTertiary }}
        >
          {!isNext && <LeftOutlined style={{ fontSize: 10 }} />}
          <span>{isNext ? 'Next' : 'Previous'}</span>
          {isNext && <RightOutlined style={{ fontSize: 10 }} />}
        </Flex>
        <Text
          strong
          style={{
            fontSize: token.fontSize,
            color: token.colorText,
            lineHeight: 1.4,
          }}
        >
          {item.title}
        </Text>
        <Text
          type="secondary"
          style={{
            fontSize: token.fontSizeSM,
            lineHeight: 1.3,
          }}
        >
          {item.section}
        </Text>
      </div>
    </Link>
  );
}

export function DocNav({ slug }: { slug: string }) {
  const { token } = theme.useToken();
  const { prev, next } = getDocNav(slug);

  if (!prev && !next) return null;

  return (
    <Flex
      gap={12}
      style={{
        marginTop: token.marginXXL,
        paddingTop: token.paddingXL,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      {prev ? (
        <NavCard item={prev} direction="prev" token={token} />
      ) : (
        <div style={{ flex: 1 }} />
      )}
      {next ? (
        <NavCard item={next} direction="next" token={token} />
      ) : (
        <div style={{ flex: 1 }} />
      )}
    </Flex>
  );
}
