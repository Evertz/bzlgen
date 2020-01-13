/**
 * Wrapper around the Buildozer CLI used for creating and manipulating Bazel BUILD files
 * Provides abstractions for creating rules, adding deps etc
 */
import { Label } from './label';

export class Buildozer {
  private static readonly PKG = '__pkg__';

  private readonly commands: Set<string> = new Set<string>();
  private readonly rules: Set<string> = new Set();

  constructor(private readonly ruleLoadSites: Map<string, string>) {}

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
    if (!this.ruleLoadSites.has(type)) { return; }
    const from = this.ruleLoadSites.get(type);
    this.newLoad(from, type, label);
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
    this.commands.add(`new ${rule} ${label.getTarget()}|${label.withTarget(Buildozer.PKG)}`);
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
    this.commands.add(`new_load ${from} ${symbols}|${label.withTarget(Buildozer.PKG)}`);
  }

  addAttr(attr: string, value: string[], label: Label) {
    this.commands.add(`add ${attr} ${value.join(' ')}|${label}`);
  }

  setAttr(attr: string, value: string, label: Label) {
    this.commands.add(`set ${attr} "${value}"|${label}`);
  }

  toCommands(): string[] {
    return Array.from(this.commands);
  }

  hasRule(name: string): boolean {
    return this.rules.has(name);
  }
}
