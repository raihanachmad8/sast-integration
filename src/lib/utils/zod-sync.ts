import type { RuleRender } from 'antd/es/form';
import type { ZodType } from 'zod';

/**
 * Bridge between Zod schemas and Ant Design form rules.
 * Converts a Zod schema into a RuleRender that validates the entire form
 * and shows field-level errors from Zod.
 *
 * @example
 * ```tsx
 * const rule = createZodSync(inviteMemberSchema);
 *
 * <Form.Item name="email" rules={[rule]}>
 *   <Input />
 * </Form.Item>
 * ```
 */
export function createZodSync(schema: ZodType): RuleRender {
  return ({ getFieldsValue }) => ({
    validator: (rule) =>
      new Promise<void>(async (resolve, reject) => {
        const { field } = rule as { field: string };
        const raw = getFieldsValue();
        const values = Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, v === undefined ? '' : v]),
        );
        const data = await schema.safeParseAsync(values);

        if (!data.success && data.error) {
          const error = data.error.issues.find(
            (issue) => issue.path.join('.') === field,
          );
          if (error) reject(new Error(error.message));
        }

        resolve();
      }),
  });
}
