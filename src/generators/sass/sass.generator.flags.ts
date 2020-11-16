import { Flag } from '../../flags';

export abstract class SassGeneratorFlags {
  @Flag({
    description: 'Suffix used for scss_library rule names',
    type: 'string',
    default: 'scss_library'
  })
  scss_library_suffix: string;

  @Flag({
    description: 'Suffix used for scss_binary rule names',
    type: 'string',
    default: 'scss'
  })
  scss_binary_suffix: string;
}
