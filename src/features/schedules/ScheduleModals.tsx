'use client';

import { useEffect } from 'react';
import { Modal, Input, Select, Form, App, Row, Col, Typography, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';

interface Schedule {
  id: string;
  repo: string;
  branch: string;
  frequency: string;
  cron: string;
  timezone: string;
  policy: string;
  nextRun: string;
  lastRuns: string[];
  status: string;
}

interface EditScheduleModalProps {
  open: boolean;
  schedule: Schedule | null;
  onClose: () => void;
  onSave: (values: { repo: string; branch: string; frequency: string; timezone: string; policy: string }) => void;
}

export function EditScheduleModal({ open, schedule, onClose, onSave }: EditScheduleModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  useEffect(() => {
    if (schedule) {
      form.setFieldsValue({ repo: schedule.repo, branch: schedule.branch, frequency: schedule.frequency, timezone: schedule.timezone, policy: schedule.policy });
    }
  }, [schedule, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave(values);
      onClose();
      message.success('Schedule updated');
    });
  };

  return (
    <Modal title="Edit schedule" open={open} onOk={handleSave} onCancel={onClose} okText="Save" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical">
        <Row gutter={token.marginMD}>
          <Col xs={24} sm={12}>
            <Form.Item label="Repository" name="repo" rules={[{ required: true, message: 'Repository is required' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Branch" name="branch" rules={[{ required: true, message: 'Branch is required' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Frequency" name="frequency">
              <Select options={[{ value: 'Hourly', label: 'Hourly' }, { value: 'Daily', label: 'Daily' }, { value: 'Weekly', label: 'Weekly' }, { value: 'Monthly', label: 'Monthly' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Timezone" name="timezone">
              <Select options={[{ value: 'UTC', label: 'UTC' }, { value: 'Asia/Jakarta', label: 'Asia/Jakarta' }, { value: 'America/New_York', label: 'America/New_York' }, { value: 'Europe/London', label: 'Europe/London' }]} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Scan policy" name="policy">
              <Select options={[{ value: 'Standard Workspace Policy', label: 'Standard Workspace Policy' }, { value: 'PR Quick Check', label: 'PR Quick Check' }, { value: 'Release Comprehensive', label: 'Release Comprehensive' }]} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

interface AddScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: { repo: string; branch: string; frequency: string; timezone: string; policy: string }) => void;
}

export function AddScheduleModal({ open, onClose, onSave }: AddScheduleModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave(values);
      onClose();
      form.resetFields();
      message.success('Schedule created');
    });
  };

  return (
    <Modal title="Add schedule" open={open} onOk={handleSave} onCancel={onClose} okText="Create" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical">
        <Row gutter={token.marginMD}>
          <Col xs={24} sm={12}>
            <Form.Item label="Repository" name="repo" rules={[{ required: true, message: 'Repository is required' }]}>
              <Input placeholder="e.g., backend-api" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Branch" name="branch" rules={[{ required: true, message: 'Branch is required' }]}>
              <Input placeholder="e.g., main" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Frequency" name="frequency">
              <Select options={[{ value: 'Hourly', label: 'Hourly' }, { value: 'Daily', label: 'Daily' }, { value: 'Weekly', label: 'Weekly' }, { value: 'Monthly', label: 'Monthly' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Timezone" name="timezone">
              <Select options={[{ value: 'UTC', label: 'UTC' }, { value: 'Asia/Jakarta', label: 'Asia/Jakarta' }, { value: 'America/New_York', label: 'America/New_York' }, { value: 'Europe/London', label: 'Europe/London' }]} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Scan policy" name="policy">
              <Select options={[{ value: 'Standard Workspace Policy', label: 'Standard Workspace Policy' }, { value: 'PR Quick Check', label: 'PR Quick Check' }, { value: 'Release Comprehensive', label: 'Release Comprehensive' }]} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
