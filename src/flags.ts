import { isAbsolute, join, resolve } from 'path';
import yargs, { Options } from 'yargs';

import { GENERATORS } from './generators/resolve-generator';
import { debug, fatal, lb } from './logger';
import { GeneratorType } from './generators';
import { lstatSync, readFileSync } from 'fs';

const RC_FILE_NAME = '.bzlgenrc';

const parser = yargs
  .help()
  .wrap(yargs.terminalWidth())
  .recommendCommands()
  .scriptName('bzlgen')
  .demandCommand()
  .version();

function coerceMappingFlag(loads: string[]): Map<string, string> {
  const items: Array<[string, string]> = loads
    .map(load => load.split('=') as [string, string]);
  return new Map(items);
}

export function Flag(options: Options & { global?: boolean }) {
  return (container, prop) => {
    const group = container.constructor.name.split('Flags')[0].match(/[A-Z][a-z]+/).join(' ');

    const parserOption = {
      ...options,
      group: options.group ?? group,
    };

    if (options.global) {
      parser.option(prop, parserOption);
    } else {
      const holder = container.$Flags ?? {};
      holder[prop] = parserOption;
      container.$Flags = holder;
    }
  };
}

function GlobalFlag(options: Options) {
  return (container, prop) => Flag({ ...options, global: true })(container, prop);
}


export const setupAndParseArgs = (argv: any[], ignorerc: boolean = false, strip = 2): Flags<any> => {
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

  GENERATORS.forEach(command => {
    parser.command<any, any>({
      command: `${command.type} <path>`,
      desc: command.description,
      builder: y => {
        if (command.flags) {
          const cFlags = Array.isArray(command.flags) ? command.flags : [command.flags];
          cFlags.map(cF => cF.prototype).forEach(f => {
            Object.keys(f.$Flags).forEach(flag => y.option(flag, f.$Flags[flag]));
          });
        }

        y.positional('path', {
          describe: 'Relative path to the directory or file to generate for',
          type: 'string',
          normalize: true,
          coerce: (arg: string) => {
            // simple check, not comprehensive but catches most users
            if (arg.startsWith('..')) {
              fatal('Path must not attempt to escape base_dir');
            }
            if (arg.endsWith('/')) {
              arg = arg.substr(0, arg.length - 1);
            }
            return arg;
          }
        });

        return y;
      },
      handler: args => {
        args.type = command.type;
        if (command.implies) {
          Object.keys(command.implies).forEach(imp => args[imp] = command.implies[imp]);
        }
      }
    });
  });

  return parser.parse(ARGS) as Flags<any>;
};

export abstract class InternalFlags {
  @GlobalFlag({
    description: 'The binary or path to a binary to use for "bazel"',
    type: 'string',
    default: 'bazel'
  })
  bazel_binary: boolean;
}

export abstract class LoggingFlags {
  @GlobalFlag({
    description: 'If set, print the value of all flags with defaults and exit',
    type: 'boolean',
    default: false
  })
  canonicalize_flags: boolean;

  @GlobalFlag({
    description: 'Log extra info when calculating import label mappings',
    type: 'boolean',
    default: false
  })
  verbose_import_mappings: boolean;

  @GlobalFlag({
    description: 'Enables debug logging',
    type: 'boolean',
    default: false,
    implies: ['canonicalize_flags']
  })
  debug: boolean;

  @GlobalFlag({
    description: 'Output commands to the console before invoking buildozer',
    type: 'boolean',
    default: false
  })
  output_buildozer_to_console: boolean;
}

export abstract class CommonFlags {
  /**
   * Type of rule to expect to generate
   * The generator may error if the expected type doesn't match files found
   */
  type: GeneratorType;

  /**
   * Relative path to the directory or file to generate for
   */
  path: string;

  @GlobalFlag({
    description: 'A glob pattern that is applied to the files at path when path represents a directory',
    type: 'string'
  })
  pattern: string;

  @GlobalFlag({
    description: 'Remove the existing build file before creating the new one',
    type: 'boolean',
    default: false
  })
  nuke_build_file: boolean;

  @GlobalFlag({
    description: 'Checks if the base_dir is a bazel workspace, and if not throws an error',
    type: 'boolean',
    default: true
  })
  assert_is_bazel_workspace: boolean;

  @GlobalFlag({
    description: 'Base dir that is prefixed to \'path\' to form an absolute path',
    type: 'string',
    default: process.env.BUILD_WORKSPACE_DIRECTORY ?? process.cwd(),
    coerce: arg => {
      return isAbsolute(arg) ? arg :
        process.env.BUILD_WORKSPACE_DIRECTORY ?
          join(process.env.BUILD_WORKSPACE_DIRECTORY, arg) : resolve(process.cwd(), arg);
    },
    requiresArg: true,
  })
  base_dir: string;

  @GlobalFlag({
    description: 'Separator character to use when generating targets',
    type: 'string',
    default: '-',
    requiresArg: true
  })
  suffix_separator: string;

  @GlobalFlag({
    description: 'Additional label mappings in the form ../some/file/path.js=//some/label:target',
    type: 'array',
    default: [],
    requiresArg: true,
    coerce: coerceMappingFlag
  })
  label_mapping: Map<string, string>;

  @GlobalFlag({
    description: 'Additional load sites or overrides for existing rules parsed in the form ts_library=//some/path/to/defs.bzl',
    type: 'array',
    default: [],
    requiresArg: true,
    coerce: coerceMappingFlag
  })
  load_mapping: Map<string, string>;

  @GlobalFlag({
    description:
      'Only calculate a files dependencies and output them as labels to the console. ' +
      'Don\'t generate any BUILD files or buildozer commands',
    type: 'boolean',
    default: false
  })
  only_deps: boolean;

  @GlobalFlag({
    description: 'Create missing BUILD files and invoke buildozer',
    type: 'boolean',
    default: true
  })
  generate_build_files: boolean;

  @GlobalFlag({
    description: 'Name to use for bazel build files, eg BUILD or BUILD.bazel',
    type: 'string',
    default: 'BUILD',
    choices: ['BUILD', 'BUILD.bazel']
  })
  build_file_name: string;

  @GlobalFlag({
    description:
      'When generating best guess dependency labels, treat the dependency labels as though there is a BUILD file for each ' +
      'directory and use the package default label - //my/package:package ' +
      'If false, then the filename is considered to be the target for the dependency label - //my/package:main',
    type: 'boolean',
    default: true
  })
  pkg_default_dep_labels: boolean;

  @GlobalFlag({
    description: 'Ignores spec / test files and does not generate rules for them',
    type: 'boolean',
    default: true,
    deprecated: true
  })
  /**
   * @deprecated
   */
  ignore_spec_files: boolean;

  @GlobalFlag({
    description: 'Default visibility to set on rules',
    type: 'string',
    default: ''
  })
  default_visibility: string;
}

export abstract class ExperimentalFlags {
  @GlobalFlag({
    description: 'Use bazel query to determine a source files label. ' +
      'If the label can\'t be resolved via query, bzlgen will fall back to the best guess. ' +
      'Label mappings will always be resolved first',
    type: 'boolean',
    default: false
  })
  use_bazel_query: boolean;
}

export type Flags<T> =
  Readonly<CommonFlags & InternalFlags & LoggingFlags & ExperimentalFlags & T>;
