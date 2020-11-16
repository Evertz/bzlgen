import { Flag } from '../../flags';

export abstract class TsGeneratorFlags {
  @Flag({
    description: 'The name of the npm bazel workspace',
    type: 'string',
    default: 'npm',
    requiresArg: true
  })
  npm_workspace_name: string;

  @Flag({
    description: 'The label used for any tsconfig attrs',
    type: 'string',
    requiresArg: true
  })
  ts_config_label: string;

  @Flag({
    description: 'Path to a tsconfig.json file that is used to attempt to resolve path mappings',
    type: 'string',
    requiresArg: true
  })
  ts_config: string;
}
