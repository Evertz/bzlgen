#!/usr/bin/env node

import { run } from './main';
import { error, fatal } from './logger';
import { writeTracingProfile } from './tracing';

run()
  .catch(err => {
    error(err.message);
    error(err);
    writeTracingProfile();

    fatal('Please report this error');
  });
