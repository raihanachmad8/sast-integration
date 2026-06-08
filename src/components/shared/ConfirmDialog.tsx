'use client';

import { App, Modal } from 'antd';


/** Options for the confirm dialog. */
interface ConfirmOptions {
  /** Dialog title */
  title: string;
  /** Dialog content/description */
  content?: string;
  /** Text for the confirm button */
  okText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Whether the confirm button is dangerous (red) */
  danger?: boolean;
  /** Whether the confirm button shows loading */
  loading?: boolean;
  /** Callback when confirmed */
  onOk?: () => void | Promise<void>;
  /** Callback when cancelled */
  onCancel?: () => void;
}

/**
 * Hook that provides a consistent confirm dialog for destructive actions.
 *
 * @returns Object with `confirm` and `confirmAsync` methods
 *
 * @example
 * ```tsx
 * const { confirm, confirmAsync } = useConfirm();
 *
 * // Simple confirm
 * confirm({
 *   title: 'Delete member?',
 *   content: 'This action cannot be undone.',
 *   danger: true,
 *   onOk: () => deleteMember(id),
 * });
 *
 * // Async confirm (with loading state)
 * await confirmAsync({
 *   title: 'Delete project?',
 *   content: 'All data will be permanently removed.',
 *   danger: true,
 *   onOk: () => api.deleteProject(id),
 * });
 * ```
 */
export function useConfirm() {
  const { modal } = App.useApp();

  /**
   * Show a confirm dialog.
   */
  const confirm = (options: ConfirmOptions) => {
    modal.confirm({
      title: options.title,
      content: options.content,
      okText: options.okText ?? 'Confirm',
      cancelText: options.cancelText ?? 'Cancel',
      okButtonProps: { danger: options.danger, loading: options.loading },
      onOk: options.onOk,
      onCancel: options.onCancel,
    });
  };

  /**
   * Show a confirm dialog that returns a Promise.
   * Useful for async operations where you need to await the result.
   */
  const confirmAsync = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      modal.confirm({
        title: options.title,
        content: options.content,
        okText: options.okText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        okButtonProps: { danger: options.danger },
        onOk: async () => {
          await options.onOk?.();
          resolve(true);
        },
        onCancel: () => {
          options.onCancel?.();
          resolve(false);
        },
      });
    });
  };

  return { confirm, confirmAsync };
}

/**
 * Standalone confirm function (for use outside of React components or when hook is not available).
 * Uses Ant Design's static modal API.
 */
export function showConfirm(options: ConfirmOptions) {
  Modal.confirm({
    title: options.title,
    content: options.content,
    okText: options.okText ?? 'Confirm',
    cancelText: options.cancelText ?? 'Cancel',
    okButtonProps: { danger: options.danger },
    onOk: options.onOk,
    onCancel: options.onCancel,
  });
}
