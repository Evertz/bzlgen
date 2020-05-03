import { lstatSync, readFileSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';
import * as yargs from 'yargs';

import { debug, fatal, lb } from './logger';
import { GeneratorType } from './generators/types';
import { GENERATORS } from './generators/resolve-generator';

function coerceMappingFlag(loads: string[]): Map<string, string> {
  const items: Array<[string, string]> = loads
    .map(load => load.split('=') as [string, string]);
  return new Map(items);
}

const RC_FILE_NAME = '.bzlgenrc';

export interface CommonFlags {
  /*
   * Common Flags
   * Affects all rule generation
   */

  /**
   * Type of rule to expect to generate
   * The generator may error if the expected type doesn't match files found
   */
  type: GeneratorType;

  /**
   * Relative path to the directory or file to generate for
   */
  path: string;

  /**
   * A glob pattern that is applied to the files at path when path represents a directory
   */
  pattern: string;

  /**
   * Remove the existing build file before creating the new one
   */
  nuke_build_file: boolean;

  /**
   * Checks if the base_dir is a bazel workspace, and if not throws an error
   */
  assert_is_bazel_workspace: boolean;

  /**
   * Base dir that is prefixed to 'path' to form an absolute path
   */
  base_dir: string;

  /**
   * Separator character to use when generating targets
   * eg foo_styles vs foo-styles
   */
  suffix_separator: string;

  /**
   * Additional label mappings in the form ../some/file/path.js=//some/label:target
   */
  label_mapping: Map<string, string>;

  /**
   * Additional load sites or overrides for existing rules
   * Parsed in the form ts_library=//some/path/to/defs.bzl
   */
  load_mapping: Map<string, string>;

  /**
   * Only calculate a files dependencies and output them as labels to the console
   * Don't generate any BUILD files or buildozer commands
   */
  only_deps: boolean;

  /**
   * If true, will create missing BUILD files and invoke buildozer
   * If false, will create the buildozer commands and then exit
   */
  generate_build_files: boolean;

  /**
   * The name to use for bazel build files, eg BUILD or BUILD.bazel
   */
  build_file_name: string;

  /**
   * When generating best guess dependency labels, treat the dependency labels as though there is a BUILD file for each
   * directory and use the package default label - //my/package:package
   * If false, then the filename is considered to be the target for the dependency label - //my/package:main
   * Defaults true
   */
  pkg_default_dep_labels: boolean;

  /**
   * Path to write the buildozer command file
   */
  buildozer_commands_file: string;

  /**
   * If set, then the buildozer commands file is removed when done
   */
  clean_commands_file: boolean;

  /**
   * If true, ignores spec / test files and does not generate rules for them
   */
  ignore_spec_files: boolean;

  /**
   * The default visibility to set on rules
   * If blank then no visibility will be set
   */
  default_visibility: string;

  /**
   * If true, bazel query will be used to determine a source files label
   * If the label can't be resolved via query, bzlgen will fall back to the best guess
   * Label mappings will always be resolved first
   */
  use_bazel_query: boolean;

  /*
   * Verbosity Flags
   * Affects logging
   */

  /**
   * If set, print the value of all flags with defaults and exit
   */
  canonicalize_flags: boolean;

  /**
   * Log extra info when calculating import label mappings
   */
  verbose_import_mappings: boolean;

  /**
   * Enables debug logging, implies --canonicalize_flags
   */
  debug: boolean;

  /**
   * Output commands to the console before invoking buildozer
   */
  output_buildozer_to_console: boolean;

  /*
   * Finalization flags
   */

  /**
   * When generation is complete, output the bazel command that will build or test
   * the resulting labels
   */
  output_bzl_command: boolean;

  /**
   * Outputs the generated labels to stdout allowing: bzl build ${gen ...}
   */
  output_bzl_labels: boolean;

  /**
   * Path or name of the bazel binary
   */
  bzl_binary: string;

  /**
   * Path or name of the buildifier binary
   */
  buildifier_binary: string;
}

export type Flags<T> = Readonly<CommonFlags & T>;

const commonYargsOptions = y => {
  return y.positional('path', {
    describe: 'Relative path to the directory or file to generate for',
    type: 'string',
    normalize: true,
    coerce: arg => {
      // simple check, not comprehensive but catches most users
      if (arg.startsWith('..')) { fatal('Path must not attempt to escape base_dir'); }
      return arg;
    }
  });
};

export const setupAndParseArgs = (argv: string[], ignorerc = false, strip = 2): Flags<any> => {
  const ARGS = [...argv].slice(strip);
  const isDebug = ARGS.includes('--debug');

  if (!ignorerc) {
    try {
      // if we are running under bazel, then load the rc file using the runfiles helper
      let rcpath = RC_FILE_NAME;
      const runfilesHelper = process.env.BAZEL_NODE_RUNFILES_HELPER;
      if (runfilesHelper) {
        const f = require(runfilesHelper);
        rcpath = (f.manifest as Map<string, string>).get(`${process.env.BAZEL_WORKSPACE}/${RC_FILE_NAME}`);
      }

      if (lstatSync(rcpath).isFile()) {
        if (isDebug) {
          debug(`Loading args from ${rcpath}`);
        }

        const rc = readFileSync(RC_FILE_NAME, { encoding: 'utf-8' })
          .split('\n')
          .filter(t => !t.startsWith('#') && !!t)
          .map(t => t.trim());

        ARGS.splice(2, 0, ...rc);
      }
    } catch (e) {
      // probably no rc file
    }
  }

  if (isDebug) {
    debug('Parsing argv:');
    debug(ARGS.join(' '));
    lb();
  }

  const bazelWorkspaceDir = process.env.BUILD_WORKSPACE_DIRECTORY;

  const parser = yargs
    .command({
      command: '$0 <type> <path>',
      builder: y => {
        return commonYargsOptions(y)
          .positional('type', {
            describe: 'Type of rule to expect to generate',
            type: 'string',
            choices: Array.from(GENERATORS.values()).map(ref => ref.type)
          });
      }
    })
    // command flags
    .option('nuke_build_file', {
      type: 'boolean',
      description: 'Remove the existing build file before creating the new one',
      default: false,
      group: 'Configuration'
    })
    .option('pattern', {
      type: 'string',
      description: 'A glob pattern that is applied to the files at path when path represents a directory',
      default: false,
      group: 'Configuration'
    })
    .option('base_dir', {
      type: 'string',
      description: 'Base dir that is prefixed to \'path\' to form an absolute path',
      default: bazelWorkspaceDir ? bazelWorkspaceDir : process.cwd(),
      coerce: arg => {
        return isAbsolute(arg) ? arg :
          bazelWorkspaceDir ? join(bazelWorkspaceDir, arg) : resolve(process.cwd(), arg);
      },
      requiresArg: true,
      group: 'Configuration'
    })
    .option('assert_is_bazel_workspace', {
      type: 'boolean',
      description: 'Checks if the base_dir is a bazel workspace, and if not throws an error',
      default: true,
      group: 'Configuration'
    })
    .option('suffix_separator', {
      type: 'string',
      description: 'Separator character to use when generating targets',
      default: '-',
      requiresArg: true,
      group: 'Configuration'
    })
    .option('label_mapping', {
      type: 'array',
      description: 'Adds a one time mapping between',
      default: [],
      requiresArg: true,
      coerce: coerceMappingFlag,
      group: 'Configuration'
    })
    .option('load_mapping', {
      type: 'array',
      description: 'Additional load sites or overrides for existing rules',
      default: [],
      requiresArg: true,
      coerce: coerceMappingFlag,
      group: 'Configuration'
    })
    .option('only_deps', {
      type: 'boolean',
      description: 'Only calculate a files dependencies and output them as labels to the console',
      default: false,
      group: 'Configuration'
    })
    .option('generate_build_files', {
      type: 'boolean',
      description: 'Create missing BUILD files and invoke buildozer',
      default: true,
      group: 'Configuration'
    })
    .option('build_file_name', {
      type: 'string',
      description: 'The name to use for bazel build files',
      default: 'BUILD',
      group: 'Configuration',
      choices: ['BUILD', 'BUILD.bazel']
    })
    .option('default_visibility', {
      type: 'string',
      description: 'The default visibility to set on rules',
      default: null,
      group: 'Configuration'
    })
    .option('ignore_spec_files', {
      type: 'boolean',
      description: 'Ignores spec files from import resolution and generation',
      default: true
    })
    .option('use_bazel_query', {
      type: 'boolean',
      description: 'Use bazel query to try and resolve labels for source files',
      default: false
    })
    .option('pkg_default_dep_labels', {
      type: 'boolean',
      description: 'When generating best guess dependency labels, treat the dependency labels as though there is a BUILD file for each directory',
      default: true
    })
    // verbosity flags
    .option('canonicalize_flags', {
      type: 'boolean',
      description: 'Print all canonicalize args before continuing',
      default: false,
      group: 'Verbosity'
    })
    .option('verbose_import_mappings', {
      type: 'boolean',
      description: 'Print verbose messages when mapping modules',
      default: false,
      group: 'Verbosity'
    })
    .option('debug', {
      type: 'boolean',
      description: 'Enables debug logging, implies --canonicalize_flags',
      default: false,
      group: 'Verbosity'
    })
    .option('output_buildozer_to_console', {
      type: 'boolean',
      description: 'Outputs the resulting buildozer commands to the console',
      default: false,
      group: 'Verbosity'
    })
    // finalization flags
    .option('output_bzl_command', {
      type: 'boolean',
      description: 'Outputs the bzl command to build the resulting BUILD file',
      default: false,
      group: 'Finalization'
    })
    .option('output_bzl_labels', {
      type: 'boolean',
      description: 'Outputs the generated labels to stdout allowing: bzl build ${gen ...}',
      default: false,
      group: 'Finalization'
    })
    .option('bzl_binary', {
      type: 'string',
      description: 'The name (or path) to use for the bazel binary',
      default: 'bazel',
      requiresArg: true,
      group: 'Finalization'
    })
    .option('buildifier_binary', {
      type: 'string',
      description: 'The name (or path) to use for the buildifier binary',
      default: 'buildifier',
      requiresArg: true,
      group: 'Finalization'
    })
    .wrap(yargs.terminalWidth())
    .version();

  GENERATORS.forEach(ref => {
    parser.command({
      command: `${ref.type} <path>`,
      description: ref.description,
      builder: builder => {
        commonYargsOptions(builder);

        if (!ref.flags) { return builder; }
        Object.keys(ref.flags).forEach(flag => builder.option(flag, ref.flags[flag]));
      },
      handler: args => args.type = ref.type
    });
  });

  return parser.parse(ARGS) as Flags<any>;
};
