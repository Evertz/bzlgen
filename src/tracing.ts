import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Utils to write a Chrome tracing profile
 * Adapted from https://github.com/bazelbuild/rules_typescript/blob/master/internal/tsc_wrapped/perf_trace.ts
 */

type Microseconds = number;

function now(): Microseconds {
  const [sec, nsec] = process.hrtime();
  return (sec * 1e6) + (nsec / 1e3);
}

// https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit
interface Event {
  name: string;
  ph: 'B'|'E'|'X'|'C'|'O';
  pid: number;
  tid: number;
  ts: Microseconds;
  dur?: Microseconds;
  args?: any;
  id?: string;
}

const events: Event[] = [];

export const TRACER_PATH = join(tmpdir(), 'bzlgentracer.json');

export function wrap<T>(name: string, f: () => T): T {
  const start = now();
  try {
    return f();
  } finally {
    const end = now();
    events.push({name, ph: 'X', pid: 1, tid: 0, ts: start, dur: (end - start)});
  }
}

export function counter(name: string, counts: {[name: string]: number}) {
  events.push({name, ph: 'C', pid: 1, tid: 0, ts: now(), args: counts});
}

export function snapshot(name: string, obj: any) {
  events.push({name, id: '1', ph: 'O', pid: 1, tid: 0, ts: now(), args: { snapshot: obj }});
}

export function writeTracingProfile() {
  try {
    writeFileSync(TRACER_PATH, JSON.stringify(events), { encoding: 'utf8' });
  } catch (e) {}
}
