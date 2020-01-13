import { inspect } from 'util';

import { setupAndParseArgs, Flags, GeneratorType } from './flags';
import { BuildFileGenerator } from './generators/generator';
import { NgGenerator } from './generators/ng/ng.generator';
import { SassGenerator } from './generators/sass/sass.generator';
import { debug, error, fatal, isDebugEnabled, lb, log, warn } from './logger';
import { snapshot, wrap, writeTracingProfile, TRACER_PATH } from './tracing';
import { Workspace } from './workspace';

function printFlags(flags: Flags) {
  log('Canonicalized Flags:');
  log(`type=${inspect(flags.type)}`);
  log(`path=${inspect(flags.path)}`);

  Object.entries(flags).sort().forEach(value => {
    const flag = value[0];
    if (flag === '_' || flag === '$0' || flag === 'path' || flag === 'type') { return; }
    const flagValue = value[1];
    log(`\t--${flag}=${inspect(flagValue)}`);
  });
  lb();
}

function getGenerator(type: GeneratorType, workspace: Workspace): BuildFileGenerator {
  switch (type)  {
    case GeneratorType.SASS:
      return new SassGenerator(workspace);
    case GeneratorType.NG:
    case GeneratorType.NG_BUNDLE:
      return new NgGenerator(workspace);
    default:
      fatal(`No generator found for type ${type}`);
  }
}

async function run() {
  const flags: Flags = setupAndParseArgs(process.argv);

  if (flags.debug) {
    debug(`Writing tracer profile to '${TRACER_PATH}'`);
  }

  if (flags.canonicalize_flags || flags.debug) {
    printFlags(flags);
    snapshot('flags', flags);
  }

  log(`Generating ${flags.build_file_name} file with type '${flags.type}' for '${flags.path}'`);

  const workspace = new Workspace(flags);

  if (flags.assert_is_bazel_workspace) {
    wrap(
      'testBaseDirSupportsBazel',
      () => workspace.testBaseDirSupportsBazel()
    );
  }

  if (flags.nuke_build_file && workspace.hasBuildFileAtPath()) {
    warn('--nuke_build_file');
    warn(`This will result in a loss of any manual edits to ${flags.build_file_name} file at ${workspace.getBuildFilePath()}`);
  }

  const generator = getGenerator(flags.type, workspace);

  if (workspace.isDirectory() && !generator.supportsDirectories()) {
    fatal(`${generator.getGeneratorType()} generator does not support generating for directory paths, please pass a single file`);
  }

  const isValid = generator.validate();
  if (isValid) {
    await wrap('generate', async () => await generator.generate());

    wrap('buildozer', () => workspace.invokeBuildozer());

    // TODO: we should know the labels that were generated, output them to stdout
    // so that we can do something like bazel build $(gen ng foo)
    // flags.output_bzl_labels
  } else {
    throw new Error('Invalid configuration or flags found');
  }
}

run()
  .catch(err => {
    error(err.message);

  })
  .then(() => {
    if (isDebugEnabled) { writeTracingProfile(); }
  })
  .catch(err => {
    error(err.message);
  });
