/* eslint-disable */
// @ts-nocheck
// This file is loaded at runtime via dynamic import.
// It intentionally uses Node.js builtins (fs, path) for file-based logging.
// Turbopack NFT trace warnings are expected and harmless for this module.

import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

const LOG_DIR = process.env.LOG_DIR ?? 'logs';
const ROTATION = process.env.LOG_ROTATION ?? 'daily';
const LEVEL = process.env.LOG_LEVEL ?? 'info';

let fileLoggerInstance: pino.Logger | null = null;

export function getFileLogger(): pino.Logger {
  if (fileLoggerInstance) return fileLoggerInstance;

  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  const getLogFile = () => {
    const today = new Date().toISOString().slice(0, 10);
    return path.join(LOG_DIR, `app-${today}.log`);
  };

  fileLoggerInstance = pino(
    { level: LEVEL, timestamp: pino.stdTimeFunctions.isoTime },
    pino.destination({ dest: getLogFile(), sync: false }),
  );

  if (ROTATION === 'daily') {
    setInterval(() => {
      const newFile = getLogFile();
      fileLoggerInstance = pino(
        { level: LEVEL, timestamp: pino.stdTimeFunctions.isoTime },
        pino.destination({ dest: newFile, sync: false }),
      );
    }, 60_000);
  }

  return fileLoggerInstance;
}
