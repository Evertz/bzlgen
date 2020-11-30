import { Flags, setupAndParseArgs } from '../src/flags';

describe('flags', () => {
  it('strips trailing path separator on path arg', () => {
    const args = ['ng', './bar/foo/'];
    const flags: Flags<any> = setupAndParseArgs(args, true, 0);

    expect(flags.path).toBe('bar/foo');
  });

  it('leaves paths with no trailing separator intact', () => {
    const args = ['ng', './bar/foo'];
    const flags: Flags<any> = setupAndParseArgs(args, true, 0);

    expect(flags.path).toBe('bar/foo');
  });
});
