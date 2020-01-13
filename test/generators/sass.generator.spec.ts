import * as mockfs from 'mock-fs';

import { setupAndParseArgs } from '../../src/flags';
import { SassGenerator } from '../../src/generators/sass/sass.generator';
import { Workspace } from '../../src/workspace';

describe('sass generator', () => {
  let workspace: Workspace;
  let gen: SassGenerator;

  afterEach(() => mockfs.restore());

  describe('sass_library', () => {
    it('can generate a sass_library with no deps', () => {
      const argv = [
        'sass',
        './src/component/_foo.scss',
        '--base_dir=/home/workspace',
        '--no-assert_is_bazel_workspace',
        '--load_mapping=sass_library=@io_bazel_rules_sass//sass:sass.bzl'
      ];
      workspace = new Workspace(setupAndParseArgs(argv, true, 0));
      gen = new SassGenerator(workspace);

      mockfs({ '/home/workspace/src': { component: { '_foo.scss': '' } } });

      // trigger the generator
      gen.generate();

      // assert the buildozer commands are correct
      const commands = workspace.getBuildozer().toCommands().join('\n');
      const expected =
        'new_load @io_bazel_rules_sass//sass:sass.bzl sass_library|//src/component:__pkg__\n' +
        'new sass_library foo-scss_library|//src/component:__pkg__\n' +
        'add srcs _foo.scss|//src/component:foo-scss_library';

      expect(commands).toEqual(expected);
    });

    it('can generate a sass_library with deps', () => {
      const argv = [
        'sass',
        './src/component/_bar.scss',
        '--base_dir=/home/workspace',
        '--no-assert_is_bazel_workspace',
        '--load_mapping=sass_library=@io_bazel_rules_sass//sass:sass.bzl'
      ];
      workspace = new Workspace(setupAndParseArgs(argv, true, 0));
      gen = new SassGenerator(workspace);

      mockfs({
        '/home/workspace/src': {
          component: { '_foo.scss': '', '_bar.scss': '@import "./foo";' }
        }
      });

      // trigger the generator
      gen.generate();

      // assert the buildozer commands are correct
      const commands = workspace.getBuildozer().toCommands().join('\n');
      const expected =
        'new_load @io_bazel_rules_sass//sass:sass.bzl sass_library|//src/component:__pkg__\n' +
        'new sass_library bar-scss_library|//src/component:__pkg__\n' +
        'add srcs _bar.scss|//src/component:bar-scss_library\n' +
        'add deps //src/component:foo-scss_library|//src/component:bar-scss_library';

      expect(commands).toEqual(expected);
    });
  });

  describe('sass_binary', () => {
    it('can generate a sass_binary with no deps', () => {
      const argv = [
        'sass',
        './src/component/foo.scss',
        '--base_dir=/home/workspace',
        '--no-assert_is_bazel_workspace',
        '--scss_binary_suffix=css',
        '--load_mapping=sass_binary=@io_bazel_rules_sass//sass:sass.bzl'
      ];
      workspace = new Workspace(setupAndParseArgs(argv, true, 0));
      gen = new SassGenerator(workspace);

      mockfs({ '/home/workspace/src': { component: { 'foo.scss': '' } } });

      // trigger the generator
      gen.generate();

      // assert the buildozer commands are correct
      const commands = workspace.getBuildozer().toCommands().join('\n');
      const expected =
        'new_load @io_bazel_rules_sass//sass:sass.bzl sass_binary|//src/component:__pkg__\n' +
        'new sass_binary foo-css|//src/component:__pkg__\n' +
        'set src "foo.scss"|//src/component:foo-css';

      expect(commands).toEqual(expected);
    });

    it('can generate a sass_binary with deps', () => {
      const argv = [
        'sass',
        './src/component/foo.scss',
        '--base_dir=/home/workspace',
        '--no-assert_is_bazel_workspace',
        '--load_mapping=sass_binary=@io_bazel_rules_sass//sass:sass.bzl'
      ];
      workspace = new Workspace(setupAndParseArgs(argv, true, 0));
      gen = new SassGenerator(workspace);

      mockfs({ '/home/workspace/src': { component: { 'foo.scss': '@import "./bar";', '_bar.scss': '' } } });

      // trigger the generator
      gen.generate();

      // assert the buildozer commands are correct
      const commands = workspace.getBuildozer().toCommands().join('\n');
      const expected =
        'new_load @io_bazel_rules_sass//sass:sass.bzl sass_binary|//src/component:__pkg__\n' +
        'new sass_binary foo-scss|//src/component:__pkg__\n' +
        'set src "foo.scss"|//src/component:foo-scss\n' +
        'add deps //src/component:bar-scss_library|//src/component:foo-scss';

      expect(commands).toEqual(expected);
    });
  });
});
