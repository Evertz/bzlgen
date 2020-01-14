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
}
