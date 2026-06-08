type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  return data ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`;
}

function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => console.debug(formatMessage('debug', context, message, data)),
    info: (message: string, data?: unknown) => console.info(formatMessage('info', context, message, data)),
    warn: (message: string, data?: unknown) => console.warn(formatMessage('warn', context, message, data)),
    error: (message: string, data?: unknown) => console.error(formatMessage('error', context, message, data)),
  };
}

export const logger = {
  auth: createLogger('auth'),
  project: createLogger('project'),
  team: createLogger('team'),
  workspace: createLogger('workspace'),
  member: createLogger('member'),
  model: createLogger('model'),
  webhook: createLogger('webhook'),
  knowledge: createLogger('knowledge'),
  scan: createLogger('scan'),
  queue: createLogger('queue'),
  mail: createLogger('mail'),
  schedule: createLogger('schedule'),
  sourceControl: createLogger('sourceControl'),
  repository: createLogger('repository'),
  finding: createLogger('finding'),
  report: createLogger('report'),
  dashboard: createLogger('dashboard'),
  audit: createLogger('audit'),
  notifications: createLogger('notifications'),
  profile: createLogger('profile'),
  storage: createLogger('storage'),
};
