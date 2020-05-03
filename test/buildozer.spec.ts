import { Buildozer } from '../src/buildozer';
import { Label } from '../src/label';

describe('buildozer', () => {
  it('can create ts_library', () => {
    const loads = new Map([['ts_library', '@npm_bazel_typescript//:defs.bzl']]);
    const buildozer = new Buildozer(loads);
    const label = Label.parseAbsolute('//foo:bar');

    buildozer.newTsLibraryRule(label)
      .addDeps(['baz'])
      .setSrcs(['foo.ts'])
      .setTsconfig('//:tsconfig')
      .setVisibility('//:__subpackages__');

    const commands = buildozer.toCommands();

    const expected =
'new_load @npm_bazel_typescript//:defs.bzl ts_library|//foo:__pkg__\n' +
'new ts_library bar|//foo:__pkg__\n' +
'add deps baz|//foo:bar\n' +
'add srcs foo.ts|//foo:bar\n' +
'set tsconfig "//:tsconfig"|//foo:bar\n' +
'add visibility //:__subpackages__|//foo:bar';

    expect(commands.join('\n')).toBe(expected);
  });

  it('can generate buildozer command batch', () => {
    const buildozer = new Buildozer();
    const label = Label.parseAbsolute('//foo:bar');

    buildozer.newTsLibraryRule(label)
      .addDeps(['baz'])
      .setSrcs(['foo.ts'])
      .setTsconfig('//:tsconfig')
      .setVisibility('//:__subpackages__');

    const batch = buildozer.toCommandBatch();

    // 2, one against the package (loads), one against the target
    expect(batch.length).toBe(2);

    const commands = batch.flatMap(item => item.commands).join('\n');
    const expected =
      'new_load @npm_bazel_typescript//:index.bzl ts_library\n' +
      'new ts_library bar\n' +
      'add deps baz\n' +
      'add srcs foo.ts\n' +
      'set tsconfig "//:tsconfig"\n' +
      'add visibility //:__subpackages__';

    expect(commands).toBe(expected);

    const targets = batch.flatMap(item => item.targets).join('\n');
    const expectedTargets = '//foo:__pkg__\n//foo:bar';

    expect(targets).toBe(expectedTargets);
  });

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
});
