'use client';

import { Modal, Select, Flex, theme } from 'antd';

interface BulkAssignModalProps {
  open: boolean;
  bulkAssignee: string | undefined;
  memberOptions: Array<{ value: string; label: string }>;
  onOk: () => void;
  onCancel: () => void;
  onChange: (value: string) => void;
}

/**
 * Modal for bulk-assigning selected findings to a reviewer.
 *
 * Provides a member select dropdown and confirm/cancel actions.
 *
 * @param props - {@link BulkAssignModalProps}
 * @returns JSX element rendering the bulk assign modal.
 *
 * @example
 * <BulkAssignModal
 *   open={true}
 *   bulkAssignee={selectedMember}
 *   memberOptions={[{ value: 'u1', label: 'John Doe' }]}
 *   onOk={() => assignAll()}
 *   onCancel={() => setOpen(false)}
 *   onChange={(val) => setSelectedMember(val)}
 * />
 */
export function BulkAssignModal({ open, bulkAssignee, memberOptions, onOk, onCancel, onChange }: BulkAssignModalProps) {
  const { token } = theme.useToken();

  return (
    <Modal
      title="Assign to reviewer"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText="Assign"
      okButtonProps={{ disabled: !bulkAssignee }}
    >
      <Flex vertical gap={token.marginSM} style={{ padding: `${token.paddingSM}px 0` }}>
        <Select
          style={{ width: '100%' }}
          placeholder="Select a reviewer"
          value={bulkAssignee}
          onChange={onChange}
          options={memberOptions}
          filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          showSearch
        />
      </Flex>
    </Modal>
  );
}
