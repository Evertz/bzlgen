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
});
