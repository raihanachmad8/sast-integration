/**
 * Schedules module — cron-based recurring scan configurations.
 *
 * @module schedules
 *
 * @example
 * ```ts
 * import { useSchedulesQuery } from '@/modules/schedules';
 * const { data: schedules } = useSchedulesQuery();
 * ```
 */
export { scheduleKeys } from './keys';
export { useSchedulesQuery, useCreateScheduleMutation, useUpdateScheduleMutation, useDeleteScheduleMutation, useToggleScheduleMutation } from './queries';
