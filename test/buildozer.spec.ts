import { Buildozer } from '../src/buildozer';
import { Label } from '../src/label';

describe('buildozer', () => {
  it('can merge default load sites with overrides', () => {
    const loads = new Map([['ts_library', '//tools/bazel/defaults.bzl']]);
    const buildozer = new Buildozer(loads);

    const sass = buildozer.getRuleLoadSite('sass_binary');
    expect(sass).toEqual('@io_bazel_rules_sass//sass:sass.bzl');

    const ts = buildozer.getRuleLoadSite('ts_library');
    expect(ts).toEqual('//tools/bazel/defaults.bzl');

    const unknown = buildozer.getRuleLoadSite('foo');
    expect(unknown).toBeUndefined();
  });

  it('can add additional loads for rules not part of defaults', () => {
    const loads = new Map([['ev_pkg_node', '//ev/tooling/bazel:defs.bzl']]);
    const buildozer = new Buildozer(loads);

    const pkgNode = buildozer.getRuleLoadSite('ev_pkg_node');
    expect(pkgNode).toEqual('//ev/tooling/bazel:defs.bzl');
  });

  it('can merge two buildozer instances', () => {
    const buildozer = new Buildozer();
    const label = Label.parseAbsolute('//foo:bar');
    buildozer.addSrc(['foo'], label);

    const buildozer2 = new Buildozer();
    const label2 = Label.parseAbsolute('//:bin');
    buildozer2.addAttr('entry_point', ['main.ts'], label2);

    buildozer.merge(buildozer2);
    const commands = buildozer.toCommands().join('\n');

    const expected = `add srcs foo|//foo:bar\nadd entry_point main.ts|//:bin`;
    expect(expected).toEqual(commands);
  });
});
