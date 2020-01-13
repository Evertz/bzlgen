export function setupGeneratorCommand(y) {
  return y.option('ng_npm_workspace_name', {
    type: 'string',
    description: 'The name of the npm bazel workspace',
    default: 'npm',
    requiresArg: true,
    group: 'Ng Generator'
  }).option('ng_generate_theme_binary', {
    type: 'boolean',
    description: 'Generate sass_binary rules for .theme.scss files',
    default: false,
    group: 'Ng Generator'
  }).option('ng_module_bundle_load', {
    type: 'string',
    requiresArg: true,
    description: 'The package from which to load the macro for ng_module_bundle',
    group: 'Ng Generator'
  });
}

export interface NgGeneratorFlags {
  /**
   * The name of the npm bazel workspace
   */
  ng_npm_workspace_name: string;

  /**
   * Generate sass_binary rules for .theme.scss files
   */
  ng_generate_theme_binary: boolean;

  /**
   * The package from which to load the macro for ng_module_bundle
   */
  ng_module_bundle_load: string;
}
