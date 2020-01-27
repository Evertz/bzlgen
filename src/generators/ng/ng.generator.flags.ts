import { setupGeneratorCommand as setupTsGeneratorCommand } from '../ts/ts.generator.flags';

export function setupGeneratorCommand(y) {
  setupTsGeneratorCommand(y);

  return y.option('ng_generate_theme_binary', {
    type: 'boolean',
    description: 'Generate sass_binary rules for .theme.scss files',
    default: true,
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
   * Generate sass_binary rules for .theme.scss files
   */
  ng_generate_theme_binary: boolean;

  /**
   * The package from which to load the macro for ng_module_bundle
   */
  ng_module_bundle_load: string;
}
