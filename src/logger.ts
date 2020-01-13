import { Signale } from 'signale';

import { writeTracingProfile } from './tracing';

export const isDebugEnabled = process.argv.includes('--debug');
export const logger = new Signale({ stream: process.stderr });

export const lb = () => logger.log('');

export const log = logger.info;
export const warn = logger.warn;
export const error = logger.error;
export const fatal = err => {
  error(err);
  if (isDebugEnabled) { writeTracingProfile(); }
  process.exit(1);
};
export const debug = (...args) => {
  if (isDebugEnabled) {
    logger.debug.apply(logger, args);
  }
};

export const out = line => process.stdout.write(line + '\n');
