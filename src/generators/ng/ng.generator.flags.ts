import { Flag } from '../../flags';

export abstract class NgGeneratorFlags {
  @Flag({
    description: 'Generate sass_binary rules for .theme.scss files',
    type: 'boolean',
    default: true
  })
  ng_generate_theme_binary: boolean;

  @Flag({
    description: 'The package from which to load the macro for ng_module_bundle',
    type: 'string',
    requiresArg: true
  })
  ng_module_bundle_load: string;
}
