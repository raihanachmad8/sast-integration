/**
 * Application-wide constants — name, version, and feature flags.
 */

import { clientEnv } from '@/config/client-env';

export const APP_NAME = 'SAST Integration';
export const APP_VERSION = '0.4.0';
export const APP_BASE_URL = clientEnv.appUrl;
