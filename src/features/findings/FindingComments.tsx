'use client';

import { useState, useRef } from 'react';
import { Input, Button, Avatar, Badge, Flex, Typography, App, theme } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useCommentsQuery, useAddCommentMutation } from '@/modules/findings';
import { useWorkspace } from '@/hooks/use-workspace';
import { errorMessage } from '@/lib/api/errors';
import type { Comment } from '@/commons/types/dashboard';
import type { TextAreaRef } from 'antd/es/input/TextArea';

const { Text } = Typography;

interface FindingCommentsProps {
  findingId: string;
}

export function FindingComments({ findingId }: FindingCommentsProps) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { workspaceId } = useWorkspace();
  const [commentText, setCommentText] = useState('');
  const textareaRef = useRef<TextAreaRef>(null);

  const commentsQuery = useCommentsQuery(findingId);
  const addCommentMutation = useAddCommentMutation(findingId);

  const comments = (commentsQuery.data ?? []) as Comment[];

  const handleSendComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    addCommentMutation.mutate(trimmed, {
      onSuccess: () => {
        setCommentText('');
      },
      onError: (err) => {
        message.error(errorMessage(err));
      },
    });
  };

  const sectionTitleStyle = {
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  };

  return (
    <Flex vertical gap={token.marginMD}>
      <Flex align="center" gap={token.marginXS}>
        <Text style={sectionTitleStyle}>Comments</Text>
        <Badge count={comments.length} style={{ backgroundColor: token.colorPrimary }} />
      </Flex>

      <Flex vertical gap={token.marginSM}>
        {comments.map((c) => (
          <Flex key={c.id} gap={token.marginSM} align="flex-start">
            <Avatar size={32} style={{ background: token.colorTextSecondary, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {c.createdByName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
            </Avatar>
            <Flex vertical flex={1} gap={0} style={{ minWidth: 0 }}>
              <Flex align="baseline" gap={token.marginXS}>
                <Text strong>{c.createdByName}</Text>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{new Date(c.createdAt).toLocaleString()}</Text>
              </Flex>
              <Text style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.content}</Text>
            </Flex>
          </Flex>
        ))}
      </Flex>

      <Flex gap={token.marginXS} align="flex-end">
        <Avatar size={32} style={{ background: token.colorTextSecondary, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>RO</Avatar>
        <Flex flex={1} gap={token.marginXS} align="flex-end">
          <div role="textbox" tabIndex={0} style={{ flex: 1, position: 'relative' }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Input.TextArea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
              placeholder="Add a comment or review note…"
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ width: '100%' }}
            />
          </div>
          <Button type="primary" icon={<SendOutlined />} onClick={handleSendComment} disabled={!commentText.trim() || addCommentMutation.isPending} loading={addCommentMutation.isPending} style={{ width: 36, height: 36, minWidth: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: token.borderRadius, opacity: commentText.trim() ? 1 : 0.4 }} />
        </Flex>
      </Flex>
      <Text type="secondary" style={{ fontSize: token.fontSizeSM, marginLeft: 40 }}>Enter to send · Shift+Enter for new line</Text>
    </Flex>
  );
}
