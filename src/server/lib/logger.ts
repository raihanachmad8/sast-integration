type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const MIN_LEVEL: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const configuredLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';
const minLevel = MIN_LEVEL[configuredLevel] ?? 1;

function formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  return data ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`;
}

function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => { if (minLevel <= 0) console.debug(formatMessage('debug', context, message, data)); },
    info: (message: string, data?: unknown) => { if (minLevel <= 1) console.info(formatMessage('info', context, message, data)); },
    warn: (message: string, data?: unknown) => { if (minLevel <= 2) console.warn(formatMessage('warn', context, message, data)); },
    error: (message: string, data?: unknown) => { if (minLevel <= 3) console.error(formatMessage('error', context, message, data)); },
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
