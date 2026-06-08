'use client';

import { useState } from 'react';
import { Drawer, Form, Input, InputNumber, Modal, Typography, Button, Flex, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { CloseOutlined } from '@ant-design/icons';
import { FaIcon } from '@/components/shared/FaIcon';
import { StatusTag } from '@/components/shared/StatusTag';
import { StatusPill } from '@/components/shared/StatusPill';

interface Scanner {
  id: string;
  name: string;
  icon: string;
  capability: string;
  status: string;
  rules: string;
  version: string;
  enabled: boolean;
}

interface ScannerRulesDrawerProps {
  open: boolean;
  scanner: Scanner | null;
  onClose: () => void;
}

/** Rules will be fetched from the backend via a scanner-rules module hook once available. */
const EMPTY_RULES: { id: string; name: string; description: string; severity: string; languages: string[]; cwe: string }[] = [];

export function RulesDrawer({ open, scanner, onClose }: ScannerRulesDrawerProps) {
  const { token } = theme.useToken();
  const [search, setSearch] = useState('');
  if (!scanner) return null;

  const rules = EMPTY_RULES;
  const filtered = rules.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase()) ||
    r.cwe.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={null}
      size="large"
      closeIcon={null}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: token.paddingXL, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Flex justify="space-between" align="flex-start">
          <div>
            <Typography.Title level={2} style={{ margin: 0, fontSize: token.fontSizeLG, fontWeight: token.fontWeightStrong, color: token.colorText }}>{scanner.name} rule browser</Typography.Title>
            <Typography.Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>{scanner.capability} &middot; {rules.length} rules</Typography.Text>
          </div>
          <Button type="text" onClick={onClose} icon={<CloseOutlined />} />
        </Flex>
      </div>

      <div style={{ padding: token.paddingXL }}>
        <Input
          allowClear
          style={{ maxWidth: 360, flex: 1, marginBottom: token.paddingLG }}
          placeholder="Search rules by ID, language, or CWE..."
          prefix={<FaIcon icon="fa-magnifying-glass" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Flex vertical gap={token.padding}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: token.paddingXL, color: token.colorTextSecondary }}>
              {rules.length === 0 ? 'No rules available for this scanner.' : 'No rules match your search.'}
            </div>
          ) : (
            filtered.map((rule) => (
              <div key={rule.id} style={{ padding: token.paddingLG, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: token.fontSize, color: token.colorText }}>{rule.name}</div>
                  <Typography.Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>{rule.description}</Typography.Text>
                  <Flex gap={4} style={{ marginTop: token.padding, flexWrap: 'wrap' }}>
                    {rule.languages.map((lang) => (
                      <StatusPill key={lang} variant="slate">{lang}</StatusPill>
                    ))}
                    <StatusPill variant="slate">{rule.cwe}</StatusPill>
                  </Flex>
                </div>
                <StatusTag type="severity" value={rule.severity.toLowerCase()} />
              </div>
            ))
          )}
        </Flex>
      </div>
    </Drawer>
  );
}

interface ScannerSettingsModalProps {
  open: boolean;
  scanner: Scanner | null;
  onClose: () => void;
  onSave: (settings: { timeout: string; maxFindings: string }) => void;
}

export function ScannerSettingsModal({ open, scanner, onClose, onSave }: ScannerSettingsModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  if (!scanner) return null;

  const handleSave = () => {
    onSave(form.getFieldsValue());
    onClose();
    form.resetFields();
  };

  return (
    <Modal title={`${scanner.name} Settings`} open={open} onOk={handleSave} onCancel={onClose} okText="Save" width={MODAL_WIDTH.SM}>
      <Form form={form} layout="vertical" initialValues={{ timeout: '300', maxFindings: '2000' }}>
        <Flex vertical gap={token.paddingMD} style={{ padding: `${token.paddingLG} 0` }}>
          <Form.Item label="Timeout (seconds)" name="timeout" required rules={[{ required: true, message: 'Timeout is required' }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Max findings" name="maxFindings" required rules={[{ required: true, message: 'Max findings is required' }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Flex>
      </Form>
    </Modal>
  );
}
