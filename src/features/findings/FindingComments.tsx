'use client';

import { useState, useRef } from 'react';
import { Input, Button, Avatar, Badge, Flex, Typography, theme } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import type { FindingComment } from '@/commons/types';
import type { TextAreaRef } from 'antd/es/input/TextArea';

const { Text } = Typography;

interface FindingCommentsProps {
  findingId: string;
  onAddComment?: (findingId: string, text: string) => void;
}

export function FindingComments({ findingId, onAddComment }: FindingCommentsProps) {
  const { token } = theme.useToken();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<FindingComment[]>([]);
  const textareaRef = useRef<TextAreaRef>(null);

  const handleSendComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    const newComment: FindingComment = {
      id: String(Date.now()),
      author: 'You',
      avatar: 'RO',
      time: 'just now',
      text: trimmed,
    };
    setComments((prev) => [...prev, newComment]);
    setCommentText('');
    onAddComment?.(findingId, trimmed);
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
              {c.avatar}
            </Avatar>
            <Flex vertical flex={1} gap={0} style={{ minWidth: 0 }}>
              <Flex align="baseline" gap={token.marginXS}>
                <Text strong>{c.author}</Text>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{c.time}</Text>
              </Flex>
              <Text style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.text}</Text>
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
          <Button type="primary" icon={<SendOutlined />} onClick={handleSendComment} disabled={!commentText.trim()} style={{ width: 36, height: 36, minWidth: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: token.borderRadius, opacity: commentText.trim() ? 1 : 0.4 }} />
        </Flex>
      </Flex>
      <Text type="secondary" style={{ fontSize: token.fontSizeSM, marginLeft: 40 }}>Enter to send · Shift+Enter for new line</Text>
    </Flex>
  );
}
