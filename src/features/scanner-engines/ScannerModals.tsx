'use client';

import { useState, useEffect, useRef } from 'react';
import { Drawer, Form, Input, InputNumber, Modal, Typography, Button, Flex, Pagination, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { CloseOutlined } from '@ant-design/icons';
import { FaIcon } from '@/components/shared/FaIcon';
import { StatusTag } from '@/components/shared/StatusTag';
import { StatusPill } from '@/components/shared/StatusPill';
import { LoadingState } from '@/components/shared/LoadingState';
import { useScannerRulesQuery } from '@/modules/scanner-engines';

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

const RULES_PER_PAGE = 50;
const SEARCH_DEBOUNCE_MS = 400;

export function RulesDrawer({ open, scanner, onClose }: ScannerRulesDrawerProps) {
  const { token } = theme.useToken();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchInput]);

  // Reset on drawer open/close
  useEffect(() => {
    if (!open) {
      setSearchInput('');
      setDebouncedSearch('');
      setPage(1);
    }
  }, [open]);

  const rulesQuery = useScannerRulesQuery(scanner?.id ?? '', {
    enabled: open && !!scanner?.id,
    page,
    perPage: RULES_PER_PAGE,
    search: debouncedSearch || undefined,
  });

  const rules = rulesQuery.data?.rules ?? [];
  const total = rulesQuery.data?.total ?? 0;
  const totalPages = rulesQuery.data?.totalPages ?? 0;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (!scanner) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={null}
      size="large"
      closeIcon={null}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
    >
      <div style={{ padding: token.paddingXL, borderBottom: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 }}>
        <Flex justify="space-between" align="flex-start">
          <div>
            <Typography.Title level={2} style={{ margin: 0, fontSize: token.fontSizeLG, fontWeight: token.fontWeightStrong, color: token.colorText }}>{scanner.name} rule browser</Typography.Title>
            <Typography.Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>{scanner.capability} &middot; {total} rules</Typography.Text>
          </div>
          <Button type="text" onClick={onClose} icon={<CloseOutlined />} />
        </Flex>
      </div>

      <div style={{ padding: token.paddingXL, flexShrink: 0 }}>
        <Input
          allowClear
          style={{ maxWidth: 360, flex: 1 }}
          placeholder="Search rules by ID, language, or CWE..."
          prefix={<FaIcon icon="fa-magnifying-glass" />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: `0 ${token.paddingXL} ${token.paddingXL}` }}>
        {rulesQuery.isLoading ? (
          <Flex justify="center" style={{ padding: token.paddingXL }}>
            <LoadingState text="Loading rules..." compact />
          </Flex>
        ) : (
          <Flex vertical gap={token.padding}>
            {rules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: token.paddingXL, color: token.colorTextSecondary }}>
                {total === 0 && !debouncedSearch ? 'No rules available for this scanner.' : 'No rules match your search.'}
              </div>
            ) : (
              rules.map((rule) => (
                <div key={`${rule.id}-${rule.path}`} style={{ padding: token.paddingLG, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: token.fontSize, color: token.colorText }}>{rule.name}</div>
                    <Typography.Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>{rule.description}</Typography.Text>
                    <Flex gap={token.marginXXS} style={{ marginTop: token.padding, flexWrap: 'wrap' }}>
                      {rule.languages.map((lang) => (
                        <StatusPill key={lang} variant="slate">{lang}</StatusPill>
                      ))}
                      {rule.cwe && <StatusPill variant="slate">{rule.cwe}</StatusPill>}
                    </Flex>
                  </div>
                  <StatusTag type="severity" value={rule.severity.toLowerCase()} />
                </div>
              ))
            )}
          </Flex>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ padding: token.paddingXL, borderTop: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={page}
            total={total}
            pageSize={RULES_PER_PAGE}
            onChange={handlePageChange}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(t, range) => `${range[0]}-${range[1]} of ${t} rules`}
          />
        </div>
      )}
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
