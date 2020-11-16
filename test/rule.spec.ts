import { Label } from '../src/label';
import { Rule } from '../src/rules';

describe('rule', () => {
  it('can generate buildozer instance from a rule', () => {
    const label = Label.parseAbsolute('//foo:bar');
    const tsLibraryRule = new Rule('ts_library', label)
      .setDeps(['baz'])
      .setSrcs(['foo.ts'])
      .setAttr('tsconfig', '//:tsconfig')
      .setVisibility(['//:__subpackages__']);

    const buildozer = tsLibraryRule.toCommands();
    const commands = buildozer.toCommands().join('\n');

    const expected =
      'new_load @npm//@bazel/typescript:index.bzl ts_library|//foo:__pkg__\n' +
      'new ts_library bar|//foo:__pkg__\n' +
      'add deps baz|//foo:bar\n' +
      'add srcs foo.ts|//foo:bar\n' +
      'set tsconfig "//:tsconfig"|//foo:bar\n' +
      'add visibility //:__subpackages__|//foo:bar';

    expect(commands).toBe(expected);
  });
});
