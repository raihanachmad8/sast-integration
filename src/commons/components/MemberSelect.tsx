'use client';

import { useState } from 'react';
import { Popover, Input, Button, Avatar, Typography, Flex, Divider, theme } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { FaIcon } from '@/commons/components/FaIcon';


interface Member {
  userId: string;
  name: string;
  initials: string;
  color: string;
}

interface MemberSelectProps {
  members: Member[];
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
}

/**
 * Member selector with search popover and avatar display.
 * Used in: Finding assignment, team member selection.
 *
 * @example
 * <MemberSelect
 *   members={workspaceMembers}
 *   value={assignedToUserId}
 *   onChange={setAssignedToUserId}
 *   placeholder="Assign reviewer"
 * />
 */
export function MemberSelect({ members, value, onChange, placeholder = 'Select reviewer' }: MemberSelectProps) {
  const { token } = theme.useToken();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = members.find((m) => m.userId === value);

  const handleSelect = (userId: string | null) => {
    onChange(userId);
    setSearch('');
    setOpen(false);
  };

  const popoverContent = (
    <div style={{ width: 300 }}>
      <Input
        prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
        placeholder="Search members..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        allowClear
        style={{ marginBottom: token.marginSM }}
      />

      {value && (
        <>
          <Button
            type="text"
            danger
            block
            onClick={() => handleSelect(null)}
            style={{ justifyContent: 'flex-start', height: 40, marginBottom: token.marginXS }}
          >
            Unassign
          </Button>
          <Divider style={{ margin: `${token.marginXS}px 0` }} />
        </>
      )}

      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <Flex justify="center" style={{ padding: token.paddingLG }}>
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>No members found</Typography.Text>
          </Flex>
        ) : (
          filtered.map((m) => (
            <Button
              key={m.userId}
              type="text"
              block
              onClick={() => handleSelect(m.userId)}
              style={{
                justifyContent: 'flex-start',
                height: 44,
                background: value === m.userId ? token.colorPrimaryBg : 'transparent',
                borderRadius: token.borderRadiusSM,
                marginBottom: token.marginXXS,
              }}
            >
              <Flex align="center" gap={token.marginSM} style={{ width: '100%' }}>
                <Avatar
                  size={32}
                  style={{
                    background: m.color,
                    fontSize: token.fontSizeSM,
                    fontWeight: token.fontWeightStrong,
                    flexShrink: 0,
                  }}
                >
                  {m.initials}
                </Avatar>
                <Typography.Text style={{ flex: 1, textAlign: 'left' }}>{m.name}</Typography.Text>
                {value === m.userId && (
                  <FaIcon icon="fa-check" style={{ color: token.colorPrimary, fontSize: token.fontSizeSM }} />
                )}
              </Flex>
            </Button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      open={open}
      onOpenChange={setOpen}
      content={popoverContent}
      getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
    >
      <Button block style={{ justifyContent: selected ? 'flex-start' : 'center', height: 40 }}>
        {selected ? (
          <Flex align="center" gap={token.marginSM}>
            <Avatar
              size={24}
              style={{
                background: selected.color,
                fontSize: token.fontSizeSM,
                fontWeight: token.fontWeightStrong,
              }}
            >
              {selected.initials}
            </Avatar>
            <Typography.Text strong>{selected.name}</Typography.Text>
          </Flex>
        ) : (
          <Flex align="center" gap={token.marginXS}>
            <FaIcon icon="fa-user-plus" /> {placeholder}
          </Flex>
        )}
      </Button>
    </Popover>
  );
}
