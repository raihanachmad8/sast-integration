'use client';

import React from 'react';
import { Drawer, Button, Tag, Timeline } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { Repository } from '@/modules/scan/api';

interface RepositoryDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  repository: Repository | null;
  onRunScan?: () => void;
}

/**
 * Right side detail panel for a selected repository.
 * Uses CSS variable tokens for consistent styling.
 */
export function RepositoryDetailDrawer({
  open,
  onClose,
  repository,
  onRunScan,
}: RepositoryDetailDrawerProps) {
  if (!repository) return null;

  const isScm = repository.connection_type === 'scm';

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <span style={{ fontWeight: 'var(--weight-bold)' }}>{repository.name}</span>
          <Tag color={isScm ? 'green' : 'orange'}>
            {isScm ? 'SCM' : 'External'}
          </Tag>
        </div>
      }
      placement="right"
      size="default"
      onClose={onClose}
      open={open}
      closeIcon={<CloseOutlined />}
    >
      <div style={{ marginBottom: 'var(--space-5xl)' }}>
        <div style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-xs)' }}>Repository</div>
        <div style={{ fontSize: 'var(--text-md)', color: 'var(--slate)' }}>{repository.url}</div>
        <div style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-sm)' }}>
          Branch: <strong>{repository.default_branch || 'main'}</strong>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-5xl)' }}>
        <div style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-lg)' }}>Execution timeline</div>

        <Timeline
          items={[
            {
              color: 'green',
              content: (
                <>
                  <div>Validation and permission check</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>Complete</div>
                </>
              ),
            },
            {
              color: 'green',
              content: (
                <>
                  <div>Runtime workspace and git clone</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>Complete</div>
                </>
              ),
            },
            {
              color: 'blue',
              content: (
                <>
                  <div>Scanner execution</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>AI verification</div>
                </>
              ),
            },
          ]}
        />
      </div>

      <div style={{ marginTop: 'var(--space-5xl)' }}>
        <Button
          type="primary"
          onClick={onRunScan}
          disabled={!isScm}
          style={{ width: '100%' }}
        >
          Run Manual Scan Now
        </Button>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginTop: 'var(--space-md)', textAlign: 'center' }}>
          Last scan: a few minutes ago (mock)
        </div>
      </div>
    </Drawer>
  );
}
