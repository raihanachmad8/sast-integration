'use client';

import { useEffect } from 'react';
import { Button, Drawer, Modal, Input, Select, Form, App, Card, Typography, Tag, Flex, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { updateKnowledgeEntrySchema } from '@/commons/schemas/knowledge-base.schema';
import { createCustomRuleSchema } from '@/commons/schemas/knowledge-custom-rule.schema';
import { createZodSync } from '@/lib/utils/zod-sync';
import { formatDate } from '@/lib/utils/formatDate';

const { Title } = Typography;
import { CloseOutlined } from '@ant-design/icons';
import { FaIcon } from '@/components/shared/FaIcon';
import { StatusTag } from '@/components/shared/StatusTag';

interface KnowledgeBaseEntry {
  id: string;
  name: string;
  source: string;
  severity: string;
  usedByAi: number;
  snippet: string;
  tags?: string[];
  muted?: boolean;
  updatedAt?: string;
}

interface EntryDetailDrawerProps {
  open: boolean;
  entry: KnowledgeBaseEntry | null;
  onClose: () => void;
  onEdit: (entry: KnowledgeBaseEntry) => void;
  onDisable: (entry: KnowledgeBaseEntry) => void;
}

export function EntryDetailDrawer({ open, entry, onClose, onEdit, onDisable }: EntryDetailDrawerProps) {
  const { token } = theme.useToken();
  if (!entry) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={null}
      size="large"
      closeIcon={null}
      styles={{ body: { padding: 0, overflowY: 'auto' } }}
    >
      {/* Header */}
      <div style={{ padding: token.paddingLG, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Flex justify="space-between" align="flex-start">
          <div>
            <Title level={2} style={{ margin: 0, fontSize: token.fontSizeXL, fontWeight: token.fontWeightStrong, color: token.colorText }}>{entry.name}</Title>
            <div style={{ fontSize: token.fontSize, color: token.colorTextSecondary, marginTop: 4 }}>{entry.source} &middot; Used by AI {entry.usedByAi} times</div>
          </div>
          <Button type="text" onClick={onClose} icon={<CloseOutlined />} />
        </Flex>
      </div>

      <Flex vertical gap={token.paddingXL} style={{ padding: token.paddingLG }}>
        {/* Status row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: token.marginSM }}>
          <Card styles={{ body: { padding: token.paddingSM, display: 'flex', flexDirection: 'column', gap: token.paddingXS } }}>
            <Typography.Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Severity</Typography.Text>
            <Flex justify="space-between" align="center">
              <Typography.Text style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSizeLG, color: token.colorText }}>{entry.severity || 'N/A'}</Typography.Text>
              {entry.severity && <StatusTag type="severity" value={entry.severity.toLowerCase()} />}
            </Flex>
          </Card>
          <Card styles={{ body: { padding: token.paddingSM, display: 'flex', flexDirection: 'column', gap: token.paddingXS } }}>
            <Typography.Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Status</Typography.Text>
            <Flex justify="space-between" align="center">
              <Typography.Text style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSizeLG, color: token.colorText }}>{entry.muted ? 'Muted' : 'Active'}</Typography.Text>
              <StatusTag type="findingStatus" value={entry.muted ? 'muted' : 'open'} />
            </Flex>
          </Card>
          <Card styles={{ body: { padding: token.paddingSM, display: 'flex', flexDirection: 'column', gap: token.paddingXS } }}>
            <Typography.Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Updated</Typography.Text>
            <Flex justify="space-between" align="center">
              <Typography.Text style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSizeLG, color: token.colorText }}>{entry.updatedAt ? formatDate(entry.updatedAt) : 'Unknown'}</Typography.Text>
            </Flex>
          </Card>
        </div>

        {/* Usage analytics */}
        <Card styles={{ body: { padding: token.paddingMD } }}>
          <Title level={3} style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginSM}`, color: token.colorText }}>Usage analytics</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.marginSM }}>
            <div style={{ textAlign: 'center', padding: token.padding, background: token.colorBgLayout, borderRadius: token.borderRadiusLG }}>
              <div style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, color: token.colorText }}>{entry.usedByAi}</div>
              <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Total AI uses</div>
            </div>
            <div style={{ textAlign: 'center', padding: token.padding, background: token.colorBgLayout, borderRadius: token.borderRadiusLG }}>
              <div style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, color: entry.muted ? token.colorWarning : token.colorTealAccent }}>{entry.muted ? 'Muted' : 'Active'}</div>
              <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Retrieval state</div>
            </div>
          </div>
        </Card>

        {/* Description / Content */}
        {entry.snippet && (
          <Card styles={{ body: { padding: token.paddingMD } }}>
            <Title level={3} style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginSM}`, color: token.colorText }}>Description</Title>
            <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize, lineHeight: 1.6, margin: 0 }}>{entry.snippet}</Typography.Paragraph>
          </Card>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <Card styles={{ body: { padding: token.paddingMD } }}>
            <Title level={3} style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginSM}`, color: token.colorText }}>Tags</Title>
            <Flex wrap gap={token.marginXXS}>
              {entry.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Flex>
          </Card>
        )}

        {/* Actions */}
        <Flex gap={token.marginSM}>
          <Button block onClick={() => { onEdit(entry); onClose(); }}>
            <FaIcon icon="fa-pen" /> Edit entry
          </Button>
          <Button danger block onClick={() => { onDisable(entry); onClose(); }}>
            <FaIcon icon="fa-volume-xmark" /> {entry.muted ? 'Unmute entry' : 'Mute entry'}
          </Button>
        </Flex>
      </Flex>
    </Drawer>
  );
}

interface EditEntryModalProps {
  open: boolean;
  entry: KnowledgeBaseEntry | null;
  onClose: () => void;
  onSave: (values: { title: string; content: string; severity: string }) => void;
}

export function EditEntryModal({ open, entry, onClose, onSave }: EditEntryModalProps) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const rule = createZodSync(updateKnowledgeEntrySchema);

  useEffect(() => {
    if (open && entry) {
      form.setFieldsValue({ title: entry.name, content: entry.snippet, severity: entry.severity });
    }
  }, [open, entry, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave(values);
      onClose();
      message.success('Entry updated');
    });
  };

  return (
    <Modal title="Edit entry" open={open} onOk={handleSave} onCancel={onClose} okText="Save" width={MODAL_WIDTH.MD}>
      <Flex vertical gap={token.paddingLG} style={{ padding: `${token.paddingSM} 0` }}>
        <Form form={form} layout="vertical" initialValues={{ title: '', content: '', severity: 'Medium' }}>
          <Form.Item label="Title" name="title" required rules={[rule]}>
            <Input />
          </Form.Item>
          <Form.Item label="Severity" name="severity" rules={[rule]}>
            <Select style={{ width: '100%' }} options={[{ value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
          </Form.Item>
          <Form.Item label="Description" name="content" rules={[rule]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Flex>
    </Modal>
  );
}

interface CreateCustomRuleModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: { name: string; severity: string; pattern: string; description: string }) => void;
}

export function CreateCustomRuleModal({ open, onClose, onSave }: CreateCustomRuleModalProps) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const rule = createZodSync(createCustomRuleSchema);

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave(values);
      onClose();
      form.resetFields();
      message.success('Custom rule created');
    });
  };

  return (
    <Modal title="Create custom rule" open={open} onOk={handleSave} onCancel={onClose} okText="Create" width={MODAL_WIDTH.MD}>
      <Flex vertical gap={token.paddingLG} style={{ padding: `${token.paddingSM} 0` }}>
        <Form form={form} layout="vertical" initialValues={{ name: '', severity: 'Medium', pattern: '', description: '' }}>
          <Form.Item label="Rule name" name="name" required rules={[rule]}>
            <Input placeholder="e.g., Internal auth bypass pattern" />
          </Form.Item>
          <Form.Item label="Severity" name="severity" rules={[rule]}>
            <Select style={{ width: '100%' }} options={[{ value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
          </Form.Item>
          <Form.Item label="Pattern / Rule logic" name="pattern" required rules={[rule]}>
            <Input.TextArea rows={4} placeholder="Describe the pattern or rule logic..." />
          </Form.Item>
          <Form.Item label="Description" name="description" rules={[rule]}>
            <Input.TextArea rows={3} placeholder="When should this rule be applied?" />
          </Form.Item>
        </Form>
      </Flex>
    </Modal>
  );
}
