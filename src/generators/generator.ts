import { Flags } from '../flags';
import { Workspace } from '../workspace';
import { Buildozer } from '../buildozer';
import { GeneratorType } from './types';
import { Label } from '../label';

export abstract class BuildFileGenerator {
  protected readonly buildozer: Buildozer;

  constructor(protected readonly workspace: Workspace) {
    this.buildozer = workspace.getBuildozer();
  }

  /**
   * Run any validation rules here on the current flags or workspace
   * If an error is thrown then the message is printed to the user and the generator exits with code 1,
   * If false is returned then a generic error is shown and the process exits with code 1.
   */
  public validate(): boolean {
    return true;
  }

  /**
   * Run the generator
   */
  public abstract async generate(): Promise<void>;

  /**
   * Get the type of generator this is
   */
  public abstract getGeneratorType(): GeneratorType | string;

  /**
   * Return if this generator supports directories
   */
  public abstract supportsDirectories(): boolean;

  /**
   * Returns the set of flags associated with this run
   */
  protected getFlags<T>(): Flags<T> {
    return this.workspace.getFlags<T>();
  }

  /**
   * Sets the visibility of the rule at 'label' to the visibility set at the --default_visibility flag
   * @param label
   */
  protected setDefaultVisibilityOn(label: Label) {
    if (this.getFlags().default_visibility) {
      this.buildozer.setVisibility([this.getFlags().default_visibility], label);
    }
  }
}
