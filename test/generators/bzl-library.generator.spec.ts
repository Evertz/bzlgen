import mockfs from 'mock-fs';

import { Workspace } from '../../src/workspace';
import { BzlLibraryGenerator } from '../../src/generators/bzl/bzl-library.generator';
import { setupAndParseArgs } from '../../src/flags';

describe('bzl_library generator', () => {
  let workspace: Workspace;
  let gen: BzlLibraryGenerator;

  afterEach(() => mockfs.restore());

  it('can generate for files in a package', () => {
    const argv = [
      'bzl_library',
      './src',
      '--default_visibility=//:__subpackages__',
      '--base_dir=/home/workspace',
      '--no-assert_is_bazel_workspace'
    ];

    workspace = new Workspace(setupAndParseArgs(argv, true, 0));
    gen = new BzlLibraryGenerator(workspace);

    mockfs({
      '/home/workspace/src': {
        'foo.bzl': '',
        'bar.bzl': '',
        'baz.txt': ''
      }
    });

    gen.generate();

    const commands = workspace.getBuildozer().toCommands().join('\n');
    const expected =
      'new_load @bazel_skylib//:bzl_library.bzl bzl_library|//src:__pkg__\n' +
      'new bzl_library bzl|//src:__pkg__\n' +
      'add srcs //src:bar.bzl //src:foo.bzl|//src:bzl\n' +
      'add visibility //:__subpackages__|//src:bzl';

    expect(commands).toEqual(expected);
  });
});
