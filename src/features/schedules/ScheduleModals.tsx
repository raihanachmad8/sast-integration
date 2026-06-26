'use client';

import { Modal, Input, Select, Form, App, Row, Col, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { createScheduleSchema, updateScheduleSchema } from '@/commons/schemas/schedule.schema';
import { createZodSync } from '@/lib/utils/zod-sync';
import { useRepositoriesQuery } from '@/modules/repositories';

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
  onSave: (values: { repositoryId: string; branch: string; cronExpression: string; timezone: string }) => void;
}

/**
 * Modal form for editing an existing scan schedule with repository, branch, cron, and timezone fields.
 *
 * Pre-fills fields from the existing schedule and validates via Zod schema.
 *
 * @param props - {@link EditScheduleModalProps}
 * @returns JSX element rendering the edit schedule modal.
 *
 * @example
 * <EditScheduleModal
 *   open={true}
 *   schedule={existingSchedule}
 *   onClose={() => setOpen(false)}
 *   onSave={(values) => updateSchedule(values)}
 * />
 */
export function EditScheduleModal({ open, schedule, onClose, onSave }: EditScheduleModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const rule = createZodSync(updateScheduleSchema);

  const reposQuery = useRepositoriesQuery({ page: 1, perPage: 200 });
  const repoOptions = (reposQuery.data?.data ?? []).map((r: { id: string; name: string }) => ({ value: r.id, label: r.name }));

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave(values);
      onClose();
      message.success('Schedule updated');
    });
  };

  return (
    <Modal title="Edit schedule" open={open} destroyOnHidden onOk={handleSave} onCancel={onClose} okText="Save" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical" initialValues={{ repositoryId: schedule?.repo ?? '', branch: schedule?.branch ?? '', cronExpression: schedule?.frequency ?? '', timezone: schedule?.timezone ?? '' }}>
        <Row gutter={[token.marginMD, 0]}>
          <Col xs={24} sm={12}>
            <Form.Item label="Repository" name="repositoryId" rules={[rule]}>
              <Select
                showSearch
                placeholder="Select repository"
                options={repoOptions}
                loading={reposQuery.isLoading}
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Branch" name="branch" rules={[rule]}>
              <Input placeholder="e.g., main" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Cron expression" name="cronExpression" rules={[rule]}>
              <Input placeholder="e.g., 0 0 * * *" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Timezone" name="timezone" rules={[rule]}>
              <Select options={[{ value: 'UTC', label: 'UTC' }, { value: 'Asia/Jakarta', label: 'Asia/Jakarta' }, { value: 'America/New_York', label: 'America/New_York' }, { value: 'Europe/London', label: 'Europe/London' }]} />
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
  onSave: (values: { repositoryId: string; branch: string; cronExpression: string; timezone: string }) => void;
}

/**
 * Modal form for creating a new scan schedule with repository, branch, cron, and timezone fields.
 *
 * Validates via Zod schema and resets form on successful save.
 *
 * @param props - {@link AddScheduleModalProps}
 * @returns JSX element rendering the add schedule modal.
 *
 * @example
 * <AddScheduleModal
 *   open={true}
 *   onClose={() => setOpen(false)}
 *   onSave={(values) => createSchedule(values)}
 * />
 */
export function AddScheduleModal({ open, onClose, onSave }: AddScheduleModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const rule = createZodSync(createScheduleSchema);

  const reposQuery = useRepositoriesQuery({ page: 1, perPage: 200 });
  const repoOptions = (reposQuery.data?.data ?? []).map((r: { id: string; name: string }) => ({ value: r.id, label: r.name }));

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave(values);
      onClose();
      form.resetFields();
      message.success('Schedule created');
    });
  };

  return (
    <Modal title="Add schedule" open={open} destroyOnHidden onOk={handleSave} onCancel={onClose} okText="Create" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical" initialValues={{ repositoryId: '', branch: '', cronExpression: '', timezone: '' }}>
        <Row gutter={[token.marginMD, 0]}>
          <Col xs={24} sm={12}>
            <Form.Item label="Repository" name="repositoryId" rules={[rule]}>
              <Select
                showSearch
                placeholder="Select repository"
                options={repoOptions}
                loading={reposQuery.isLoading}
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}

              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Branch" name="branch" rules={[rule]}>
              <Input placeholder="e.g., main" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Cron expression" name="cronExpression" rules={[rule]}>
              <Input placeholder="e.g., 0 0 * * *" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Timezone" name="timezone" rules={[rule]}>
              <Select options={[{ value: 'UTC', label: 'UTC' }, { value: 'Asia/Jakarta', label: 'Asia/Jakarta' }, { value: 'America/New_York', label: 'America/New_York' }, { value: 'Europe/London', label: 'Europe/London' }]} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
