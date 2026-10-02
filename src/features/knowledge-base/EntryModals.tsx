'use client';

import { useEffect } from 'react';
import { Button, Drawer, Modal, Input, Select, Form, App, Card, Typography, Tag, Flex, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';

const { Title } = Typography;
import { CloseOutlined } from '@ant-design/icons';
import { FaIcon } from '@/components/shared/fa-icon';
import { StatusTag } from '@/components/shared/StatusTag';

interface KnowledgeBaseEntry {
  id: string;
  name: string;
  source: string;
  severity: string;
  usedByAi: string;
  snippet: string;
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

  const SEVERITY_COLOR: Record<string, string> = { Critical: token.colorError, High: token.colorWarning, Medium: token.colorInfo, Low: token.colorTextSecondary };
  const SEVERITY_PILL: Record<string, string> = { Critical: 'red', High: 'amber', Medium: 'blue', Low: 'slate' };

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
            <div style={{ fontSize: token.fontSize, color: token.colorTextSecondary, marginTop: 4 }}>{entry.source} &middot; {entry.usedByAi}</div>
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
              <Typography.Text style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSizeLG, color: token.colorText }}>{entry.severity}</Typography.Text>
              <StatusTag type="severity" value={entry.severity.toLowerCase()} />
            </Flex>
          </Card>
          <Card styles={{ body: { padding: token.paddingSM, display: 'flex', flexDirection: 'column', gap: token.paddingXS } }}>
            <Typography.Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Status</Typography.Text>
            <Flex justify="space-between" align="center">
              <Typography.Text style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSizeLG, color: token.colorText }}>Active</Typography.Text>
              <StatusTag type="findingStatus" value="open" />
            </Flex>
          </Card>
          <Card styles={{ body: { padding: token.paddingSM, display: 'flex', flexDirection: 'column', gap: token.paddingXS } }}>
            <Typography.Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Updated</Typography.Text>
            <Flex justify="space-between" align="center">
              <Typography.Text style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSizeLG, color: token.colorText }}>Synced today</Typography.Text>
              <StatusTag type="scanner" value="Cppcheck" />
            </Flex>
          </Card>
        </div>

        {/* Usage analytics */}
        <Card styles={{ body: { padding: token.paddingMD } }}>
          <Title level={3} style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginSM}`, color: token.colorText }}>Usage analytics</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: token.marginSM }}>
            <div style={{ textAlign: 'center', padding: token.padding, background: token.colorBgLayout, borderRadius: token.borderRadiusLG }}>
              <div style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, color: token.colorText }}>142</div>
              <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Total uses</div>
            </div>
            <div style={{ textAlign: 'center', padding: token.padding, background: token.colorBgLayout, borderRadius: token.borderRadiusLG }}>
              <div style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, color: token.colorText }}>140</div>
              <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Last 7 days</div>
            </div>
            <div style={{ textAlign: 'center', padding: token.padding, background: token.colorBgLayout, borderRadius: token.borderRadiusLG }}>
              <div style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, color: token.colorTealAccent }}>Active</div>
              <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Retrieval state</div>
            </div>
          </div>
        </Card>

        {/* Retrieval preview */}
        <Card styles={{ body: { padding: token.paddingMD } }}>
          <Title level={3} style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginSM}`, color: token.colorText }}>Retrieval preview</Title>
          <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize, lineHeight: 1.6, margin: `0 0 ${token.marginSM}` }}>{entry.snippet}</Typography.Paragraph>
          <Flex wrap gap={token.marginXXS}>
            {['injection', 'database', 'input validation'].map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Flex>
        </Card>

        {/* Preview scope note */}
        <div style={{ padding: token.paddingSM, background: token.colorBgLayout, borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorBorderSecondary}`, fontSize: token.fontSize, color: token.colorTextSecondary }}>
          Preview scope: retrieved snippet, source metadata, tags, usage count, and mute state.
        </div>

        {/* Mute button */}
        <Button danger block onClick={() => { onDisable(entry); onClose(); }}>
          <FaIcon icon="fa-volume-xmark" /> Mute entry
        </Button>
      </Flex>
    </Drawer>
  );
}

interface EditEntryModalProps {
  open: boolean;
  entry: KnowledgeBaseEntry | null;
  onClose: () => void;
  onSave: (values: { name: string; source: string; severity: string; snippet: string }) => void;
}

export function EditEntryModal({ open, entry, onClose, onSave }: EditEntryModalProps) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  useEffect(() => {
    if (entry) {
      form.setFieldsValue({ name: entry.name, source: entry.source, severity: entry.severity, snippet: entry.snippet });
    }
  }, [entry, form]);

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
        <Form form={form} layout="vertical" initialValues={{ name: '', source: 'CWE', severity: 'Medium', snippet: '' }}>
          <Form.Item label="Name" name="name" required rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.marginSM }}>
            <Form.Item label="Source" name="source">
              <Select style={{ width: '100%' }} options={[{ value: 'CWE', label: 'CWE' }, { value: 'NVD', label: 'NVD' }, { value: 'MITRE', label: 'MITRE' }, { value: 'Custom Rules', label: 'Custom Rules' }]} />
            </Form.Item>
            <Form.Item label="Severity" name="severity">
              <Select style={{ width: '100%' }} options={[{ value: 'Critical', label: 'Critical' }, { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }]} />
            </Form.Item>
          </div>
          <Form.Item label="Description" name="snippet">
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
          <Form.Item label="Rule name" name="name" required rules={[{ required: true, message: 'Rule name is required' }]}>
            <Input placeholder="e.g., Internal auth bypass pattern" />
          </Form.Item>
          <Form.Item label="Severity" name="severity">
            <Select style={{ width: '100%' }} options={[{ value: 'Critical', label: 'Critical' }, { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }]} />
          </Form.Item>
          <Form.Item label="Pattern / Rule logic" name="pattern" required rules={[{ required: true, message: 'Pattern is required' }]}>
            <Input.TextArea rows={4} placeholder="Describe the pattern or rule logic..." />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="When should this rule be applied?" />
          </Form.Item>
        </Form>
      </Flex>
    </Modal>
  );
}
