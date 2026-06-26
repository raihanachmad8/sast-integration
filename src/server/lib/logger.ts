import pino from 'pino';

const LEVEL = process.env.LOG_LEVEL ?? 'info';
const DESTINATION = process.env.LOG_DESTINATION ?? 'console';

const baseLogger = pino({
  level: LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(DESTINATION === 'console' || DESTINATION === 'both'
    ? {}
    : { silent: true }),
});

function createLogger(context: string) {
  const child = baseLogger.child({ ctx: context });
  return {
    debug: (message: string, data?: unknown) => {
      if (data !== undefined) child.debug(data, message);
      else child.debug(message);
    },
    info: (message: string, data?: unknown) => {
      if (data !== undefined) child.info(data, message);
      else child.info(message);
    },
    warn: (message: string, data?: unknown) => {
      if (data !== undefined) child.warn(data, message);
      else child.warn(message);
    },
    error: (message: string, data?: unknown) => {
      if (data !== undefined) child.error(data, message);
      else child.error(message);
    },
  };
}

// File transport — only loaded in Node.js runtime, never in edge/browser
let fileLoggerInstance: pino.Logger | null = null;
let getFileLoggerFn: (() => pino.Logger) | null = null;

async function ensureFileTransport() {
  if (getFileLoggerFn) return;
  if (typeof window !== 'undefined') return; // skip in browser/edge
  const mod = await import(/* webpackIgnore: true */ './file-transport');
  getFileLoggerFn = mod.getFileLogger;
}

function createFileLogger(context: string) {
  ensureFileTransport(); // fire-and-forget promise

  const child = () => {
    if (!getFileLoggerFn) return baseLogger.child({ ctx: context });
    return getFileLoggerFn().child({ ctx: context });
  };

  return {
    debug: (message: string, data?: unknown) => {
      if (data !== undefined) child().debug(data, message);
      else child().debug(message);
    },
    info: (message: string, data?: unknown) => {
      if (data !== undefined) child().info(data, message);
      else child().info(message);
    },
    warn: (message: string, data?: unknown) => {
      if (data !== undefined) child().warn(data, message);
      else child().warn(message);
    },
    error: (message: string, data?: unknown) => {
      if (data !== undefined) child().error(data, message);
      else child().error(message);
    },
  };
}

function createBothLogger(context: string) {
  const consoleLog = createLogger(context);
  const fileLog = createFileLogger(context);
  return {
    debug: (message: string, data?: unknown) => { consoleLog.debug(message, data); fileLog.debug(message, data); },
    info: (message: string, data?: unknown) => { consoleLog.info(message, data); fileLog.info(message, data); },
    warn: (message: string, data?: unknown) => { consoleLog.warn(message, data); fileLog.warn(message, data); },
    error: (message: string, data?: unknown) => { consoleLog.error(message, data); fileLog.error(message, data); },
  };
}

function buildLogger(context: string) {
  if (DESTINATION === 'file') return createFileLogger(context);
  if (DESTINATION === 'both') return createBothLogger(context);
  return createLogger(context);
}

export const logger = {
  auth: buildLogger('auth'),
  project: buildLogger('project'),
  team: buildLogger('team'),
  workspace: buildLogger('workspace'),
  member: buildLogger('member'),
  model: buildLogger('model'),
  webhook: buildLogger('webhook'),
  knowledge: buildLogger('knowledge'),
  scan: buildLogger('scan'),
  queue: buildLogger('queue'),
  mail: buildLogger('mail'),
  schedule: buildLogger('schedule'),
  sourceControl: buildLogger('sourceControl'),
  repository: buildLogger('repository'),
  finding: buildLogger('finding'),
  report: buildLogger('report'),
  dashboard: buildLogger('dashboard'),
  audit: buildLogger('audit'),
  notifications: buildLogger('notifications'),
  profile: buildLogger('profile'),
  storage: buildLogger('storage'),
};
