export const SassGeneratorFlagBuilder = {
  scss_library_suffix: {
    type: 'string',
    description: 'Suffix used for scss_library rule names',
    default: 'scss_library',
    group: 'SCSS Generator'
  },
  scss_binary_suffix: {
    type: 'string',
    description: 'Suffix used for scss_binary rule names',
    default: 'scss',
    group: 'SCSS Generator'
  }
};

export interface SassGeneratorFlags {
  /**
   * Suffix used for scss_library rule names
   */
  scss_library_suffix: string;

  /**
   * Suffix used for scss_binary rule names
   */
  scss_binary_suffix: string;
}
