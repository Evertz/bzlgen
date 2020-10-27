import mockfs from 'mock-fs';

import { setupAndParseArgs } from '../src/flags';
import { Workspace } from '../src/workspace';

describe('workspace', () => {
  let pathWorkspace: Workspace;
  let fileWorkspace: Workspace;

  beforeEach(() => {
    const argv = [
      '--base_dir=/home/workspace',
      '--no-assert_is_bazel_workspace',
      '--label_mapping=src/baz=//other',
      '--label_mapping=src/foo/*=//fother'
    ];

    const pathArgv = [
      'sass',
      './src/component',
      ...argv
    ];
    pathWorkspace = new Workspace(setupAndParseArgs(pathArgv, true, 0));

    const fileArgv = [
      'sass',
      './src/component/foo.component.scss',
      ...argv
    ];
    fileWorkspace = new Workspace(setupAndParseArgs(fileArgv, true, 0));

    // setting up the mock file system MUST come after parsing args and creating the workspace
    // as this part requires access to the real file system (commands are lazily required)
    mockfs({
      '/home/workspace': {
        src: {
          component: {
            'foo.component.scss': ''
          },
          foo: {
            'some-file.ts': ''
          },
          baz: {}
        },
        test: {
          bar: {}
        }
      }
    });
  });

  afterEach(() => mockfs.restore());

  describe('path resolution', () => {
    it('resolves absolute path', () => {
      expect(pathWorkspace.getAbsolutePath()).toBe('/home/workspace/src/component');
      expect(fileWorkspace.getAbsolutePath()).toBe('/home/workspace/src/component/foo.component.scss');
    });

    it('resolves path relative to the base dir', () => {
      expect(pathWorkspace.getPathFromBaseDir()).toBe('src/component');
      expect(fileWorkspace.getPathFromBaseDir()).toBe('src/component/foo.component.scss');
    });

    it('resolves workspace relative path for passed path', () => {
      expect(pathWorkspace.resolveRelativeToWorkspace('./foo.ts')).toBe('src/component/foo.ts');
      expect(fileWorkspace.resolveRelativeToWorkspace('./foo.ts')).toBe('src/component/foo.ts');

      // test the following scenario:
      // src/component/foo.ts imports '../bar/bar.ts', fetch the workspace relative path for bar.ts to then calculate
      // the bazel package default label
      expect(pathWorkspace.resolveRelativeToWorkspace('../bar/bar.ts')).toBe('src/bar/bar.ts');
      expect(fileWorkspace.resolveRelativeToWorkspace('../bar/bar.ts')).toBe('src/bar/bar.ts');
    });

    it('can test if path is workspace relative', () => {
      expect(pathWorkspace.isWorkspaceRelative('./foo.ts')).toBeFalsy();
      expect(pathWorkspace.isWorkspaceRelative('../foo.ts')).toBeFalsy();
      expect(pathWorkspace.isWorkspaceRelative('src/components/foo.ts')).toBeTruthy();
      expect(pathWorkspace.isWorkspaceRelative('test/bar')).toBeTruthy();
      expect(pathWorkspace.isWorkspaceRelative('./src/components/foo.ts')).toBeTruthy();

      expect(fileWorkspace.isWorkspaceRelative('./foo.ts')).toBeFalsy();
      expect(fileWorkspace.isWorkspaceRelative('../foo.ts')).toBeFalsy();
      expect(fileWorkspace.isWorkspaceRelative('src/components/foo.ts')).toBeTruthy();
      expect(fileWorkspace.isWorkspaceRelative('./src/components/foo.ts')).toBeTruthy();
    });

    it('can resolve absolute path from relative path', () => {
      expect(pathWorkspace.resolveAbsolute('./foo.ts')).toBe('/home/workspace/src/component/foo.ts');
      expect(pathWorkspace.resolveAbsolute('foo.ts')).toBe('/home/workspace/src/component/foo.ts');
      expect(fileWorkspace.resolveAbsolute('./foo.ts')).toBe('/home/workspace/src/component/foo.ts');
      expect(fileWorkspace.resolveAbsolute('foo.ts')).toBe('/home/workspace/src/component/foo.ts');

      expect(pathWorkspace.resolveAbsolute('../bar/bar.ts')).toBe('/home/workspace/src/bar/bar.ts');
      expect(fileWorkspace.resolveAbsolute('../bar/bar.ts')).toBe('/home/workspace/src/bar/bar.ts');
    });
  });

  describe('bazel label resolution', () => {
    it('can resolve path package label', () => {
      expect(pathWorkspace.getLabelForPath().toString()).toBe('//src/component:component');
      expect(fileWorkspace.getLabelForPath().toString()).toBe('//src/component:component');
    });

    it('can resolve label for path', () => {
      expect(pathWorkspace.getLabelFor('../foo').toString()).toBe('//src/foo:foo');
      expect(fileWorkspace.getLabelFor('../foo').toString()).toBe('//src/foo:foo');

      expect(pathWorkspace.getLabelFor('../foo', 'bar').toString()).toBe('//src/foo:bar');
      expect(fileWorkspace.getLabelFor('../foo', 'bar').toString()).toBe('//src/foo:bar');

      expect(pathWorkspace.getLabelFor('foo.component.scss').toString()).toBe('//src/component:component');
      expect(fileWorkspace.getLabelFor('foo.component.scss').toString()).toBe('//src/component:component');

      expect(pathWorkspace.getLabelFor('src/component/foo.component.scss', 'styles').toString()).toBe('//src/component:styles');
      expect(fileWorkspace.getLabelFor('src/component/foo.component.scss', 'styles').toString()).toBe('//src/component:styles');
    });

    it('can resolve static label mappings', () => {
      expect(pathWorkspace.getLabelFor('../baz').toString()).toBe('//other:other');
      expect(fileWorkspace.getLabelFor('../baz').toString()).toBe('//other:other');
    });

    it('can resolve static label mappings with globs', () => {
      // without the glob this resolves to //src/foo:foo
      expect(pathWorkspace.getLabelFor('../foo/some-file.ts').toString()).toBe('//fother:fother');
    });

    it('can resolve labels for files', () => {
      expect(pathWorkspace.getLabelForFile('foo.component.scss', 'theme').toString()).toBe('//src/component:foo-component-theme');
      expect(fileWorkspace.getLabelForFile('foo.component.scss', 'theme').toString()).toBe('//src/component:foo-component-theme');
    });
  });
});
