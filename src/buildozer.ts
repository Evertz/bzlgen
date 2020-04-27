import { CommandBatch } from '@bazel/buildozer';
import { Label } from './label';

const DEFAULT_LOAD_SITES = new Map<string, string>([
  ['sass_library', '@io_bazel_rules_sass//sass:sass.bzl'],
  ['sass_binary', '@io_bazel_rules_sass//sass:sass.bzl'],
  ['ts_library', '@npm_bazel_typescript//:defs.bzl'],
  ['ng_module', '@npm_angular_bazel//:index.bzl'],
]);

/**
 * Wrapper around the Buildozer used for creating and manipulating Bazel BUILD files
 * Provides abstractions for creating rules, adding deps etc
 */
export class Buildozer {
  private static readonly PKG = '__pkg__';

  private readonly ruleLoadSites: ReadonlyMap<string, string>;
  private readonly batchedCommands: Map<string, string[]> = new Map<string, string[]>();
  private readonly rules: Set<string> = new Set();

  constructor(loads: Map<string, string> = new Map()) {
    this.ruleLoadSites = this.mergeWithDefaultLoads(loads);
  }

  loadSassLibrary(label: Label) {
    this.loadRule('sass_library', label);
  }

  loadSassBinary(label: Label) {
    this.loadRule('sass_binary', label);
  }

  loadNgModule(label: Label) {
    this.loadRule('ng_module', label);
  }

  loadTsLibrary(label: Label) {
    this.loadRule('ts_library', label);
  }

  loadRule(type: string, label: Label) {
    const from = this.getRuleLoadSite(type);
    if (!from) { return; }

    this.newLoad(from, type, label);
  }

  getRuleLoadSite(type: string): string {
    return this.ruleLoadSites.get(type);
  }

  newSassLibraryRule(label: Label) {
    this.rules.add(label.getTarget());
    this.loadSassLibrary(label);
    this.newRule('sass_library', label);

    const sassRuleHelper = {
      setSrcs: (srcs: string[]) => {
        this.addAttr('srcs', srcs, label);
        return sassRuleHelper;
      },
      setDeps: (deps: Array<string | Label>) => {
        if (deps && deps.length) {
          this.addAttr('deps', deps.map(l => l.toString()), label);
        }
        return sassRuleHelper;
      },
      setVisibility: (visibility: string) => {
        this.setVisibility([visibility], label);
        return sassRuleHelper;
      }
    };

    return sassRuleHelper;
  }

  newSassBinaryRule(label: Label) {
    this.loadSassBinary(label);
    this.newRule('sass_binary', label);

    const sassRuleHelper = {
      setSrc: (src: string) => {
        this.setAttr('src', src, label);
        return sassRuleHelper;
      },
      setDeps: (deps: Array<string | Label>) => {
        if (deps && deps.length) {
          this.addAttr('deps', deps.map(l => l.toString()), label);
        }
        return sassRuleHelper;
      },
      setVisibility: (visibility: string) => {
        this.setVisibility([visibility], label);
        return sassRuleHelper;
      }
    };

    return sassRuleHelper;
  }

  newNgModuleRule(label: Label) {
    this.loadNgModule(label);
    this.newRule('ng_module', label);

    const ngModuleRuleHelper = {
      setSrcs: (srcs: string[]) => {
        this.addAttr('srcs', srcs, label);
        return ngModuleRuleHelper;
      },
      addAssets: (assets: string[]) => {
        if (assets && assets.length) {
          this.addAttr('assets', assets, label);
        }
        return ngModuleRuleHelper;
      },
      setTsconfig: (tsconfig: string) => {
        this.setAttr('tsconfig', tsconfig, label);
        return ngModuleRuleHelper;
      },
      addDeps: (deps: Array<string | Label>) => {
        if (deps && deps.length) {
          this.addDep(deps, label);
        }
        return ngModuleRuleHelper;
      },
      setVisibility: (visibility: string) => {
        if (visibility) {
          this.setVisibility([visibility], label);
        }
        return ngModuleRuleHelper;
      }
    };

    return ngModuleRuleHelper;
  }

  newTsLibraryRule(label: Label) {
    this.loadTsLibrary(label);
    this.newRule('ts_library', label);

    const tsLibraryRuleHelper = {
      setSrcs: (srcs: string[]) => {
        this.addAttr('srcs', srcs, label);
        return tsLibraryRuleHelper;
      },
      setTsconfig: (tsconfig: string) => {
        this.setAttr('tsconfig', tsconfig, label);
        return tsLibraryRuleHelper;
      },
      addDeps: (deps: Array<Label| string>) => {
        if (deps && deps.length) {
          this.addDep(deps, label);
        }
        return tsLibraryRuleHelper;
      },
      setVisibility: (visibility: string) => {
        this.setVisibility([visibility], label);
        return tsLibraryRuleHelper;
      }
    };

    return tsLibraryRuleHelper;
  }

  newFilegroup(label: Label) {
    this.newRule('filegroup', label);

    const fileGroupRuleHelper = {
      setSrcs: (srcs: string[]) => {
        this.addAttr('srcs', srcs, label);
        return fileGroupRuleHelper;
      },
      setVisibility: (visibility: string) => {
        this.setVisibility([visibility], label);
        return fileGroupRuleHelper;
      }
    };
    return fileGroupRuleHelper;
  }

  newRule(rule: string, label: Label) {
    this.rules.add(label.getTarget());
    this.addCommand(`new ${rule} ${label.getTarget()}`, label.withTarget(Buildozer.PKG));
  }

  addSrc(value: string[], label: Label) {
    this.addAttr('srcs', value, label);
  }

  addDep(dep: Array<string | Label>, label: Label) {
    this.addAttr('deps', dep.map(l => l.toString()), label);
  }

  setVisibility(visibility: string[], label: Label) {
    this.addAttr('visibility', visibility, label);
  }

  // lower level
  newLoad(from: string, symbols: string, label: Label) {
    if (!from) { return; }
    this.addCommand(`new_load ${from} ${symbols}`, label.withTarget(Buildozer.PKG));
  }

  addAttr(attr: string, value: string[], label: Label) {
    this.addCommand(`add ${attr} ${value.join(' ')}`, label);
  }

  setAttr(attr: string, value: string, label: Label) {
    this.addCommand(`set ${attr} "${value}"`, label);
  }

  hasRule(name: string): boolean {
    return this.rules.has(name);
  }

  /**
   * Returns a CommandBatch array, suitable for passing to the @bazel/buildozer API
   */
  toCommandBatch(): CommandBatch[] {
    if (!this.batchedCommands.size) { return []; }

    return Array.from(this.batchedCommands.entries())
      .map(entry => {
        const target = entry[0];
        const commands = entry[1];

        return { commands, targets: [target] } as CommandBatch;
      });
  }

  /**
   * Returns an array of stringy commands, suitable for writing to a file and invoking buildozer on
   */
  toCommands(): string[] {
    return this.toCommandBatch()
      .flatMap(batch => batch.commands.map(command => `${command}|${batch.targets[0]}`));
  }

  private addCommand(command: string, label: Label) {
    const stringyLabel = label.toString();
    if (!this.batchedCommands.has(stringyLabel)) {
      this.batchedCommands.set(stringyLabel, []);
    }

    this.batchedCommands.get(stringyLabel).push(command);
  }

  private mergeWithDefaultLoads(source: Map<string, string>): Map<string, string> {
    const result = new Map<string, string>();
    DEFAULT_LOAD_SITES.forEach((value: string, key: string) => {
      if (source.has(key)) {
        result.set(key, source.get(key));
      } else {
        result.set(key, value);
      }
    });

    return result;
  }
}
