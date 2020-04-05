export function setupGeneratorCommand(y) {
  return y.option('npm_workspace_name', {
    type: 'string',
    description: 'The name of the npm bazel workspace',
    default: 'npm',
    requiresArg: true,
    group: 'TS Generator'
  }).option('ts_config_label', {
    type: 'string',
    description: 'The label used for any tsconfig attrs',
    requiresArg: true,
    group: 'TS Generator'
  }).option('ts_config', {
    type: 'string',
    description: 'Path to a tsconfig.json file that is used to attempt to resolve path mappings',
    requiresArg: true,
    group: 'TS Generator'
  });
}

export interface TsGeneratorFlags {
  /**
   * The name of the npm bazel workspace
   */
  npm_workspace_name: string;

  /**
   * The label used for any tsconfig attrs
   */
  ts_config_label: string;

  /**
   * Path (relative to base_dir) to a tsconfig.json file that is used to attempt to resolve path mappings
   */
  ts_config: string;
}
