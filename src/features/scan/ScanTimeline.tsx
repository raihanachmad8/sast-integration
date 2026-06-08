'use client';

import { Timeline, Typography, Empty, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import type { TimelineEvent, TimelineEventType } from './types';

const { Text } = Typography;

interface ScanTimelineProps {
  events: TimelineEvent[];
}

export function ScanTimeline({ events }: ScanTimelineProps) {
  const { token } = theme.useToken();

  const EVENT_CONFIG: Record<TimelineEventType, { icon: string; color: string }> = {
    triggered: { icon: 'fa-play', color: token.colorSuccess },
    queued: { icon: 'fa-clock', color: token.colorWarning },
    cloning: { icon: 'fa-code-branch', color: token.colorInfo },
    scanning: { icon: 'fa-magnifying-glass', color: token.colorSuccess },
    parsing: { icon: 'fa-file-lines', color: token.colorTealAccent },
    ai_verifying: { icon: 'fa-robot', color: token.colorPurple },
    completed: { icon: 'fa-circle-check', color: token.colorTealAccent },
    failed: { icon: 'fa-circle-xmark', color: token.colorError },
    skipped: { icon: 'fa-forward', color: token.colorTextSecondary },
  };

  if (events.length === 0) {
    return (
      <Empty
        description="No timeline events recorded"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const items = events.map((event) => {
    const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.triggered;

    return {
      icon: (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: config.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <FaIcon icon={config.icon} style={{ color: token.colorBgContainer, fontSize: token.fontSizeSM }} />
        </div>
      ),
      content: (
        <Flex vertical gap={token.marginXS}>
          <Flex align="center" justify="space-between" gap={token.marginSM}>
            <Text strong style={{ fontSize: token.fontSize }}>{event.description}</Text>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, whiteSpace: 'nowrap' }}>
              {event.timestamp}
            </Text>
          </Flex>

          {event.durationSeconds != null && (
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              Duration: {event.durationSeconds < 60 ? `${event.durationSeconds}s` : `${Math.floor(event.durationSeconds / 60)}m ${event.durationSeconds % 60}s`}
            </Text>
          )}

          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <Flex gap={token.marginXS} wrap="wrap">
              {Object.entries(event.metadata).map(([key, value]) => (
                <Text
                  key={key}
                  type="secondary"
                  style={{ fontSize: token.fontSizeSM, fontFamily: token.fontFamilyCode }}
                >
                  {key}: {String(value)}
                </Text>
              ))}
            </Flex>
          )}
        </Flex>
      ),
    };
  });

  return (
    <Timeline
      items={items}
      style={{ paddingLeft: token.paddingMD }}
    />
  );
}
