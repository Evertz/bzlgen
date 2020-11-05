import { CommandBatch } from '@bazel/buildozer';
import { Label } from './label';
import { Rule } from './rules';

export const DEFAULT_LOAD_SITES = new Map<string, string>([
  ['sass_library', '@io_bazel_rules_sass//sass:sass.bzl'],
  ['sass_binary', '@io_bazel_rules_sass//sass:sass.bzl'],
  ['ts_library', '@npm//bazel/typescript:index.bzl'],
  ['ng_module', '@npm//angular/bazel:index.bzl'],
  ['nodejs_binary', '@build_bazel_rules_nodejs//:index.bzl'],
  ['container_layer', '@io_bazel_rules_docker//container:container.bzl'],
  ['bzl_library', '@bazel_skylib//:bzl_library.bzl']
]);

/**
 * Wrapper around the Buildozer used for creating and manipulating Bazel BUILD files
 * Provides abstractions for creating rules, adding deps etc
 */
export class Buildozer {
  private static readonly PKG = '__pkg__';

  private readonly ruleLoadSites: ReadonlyMap<string, string>;
  private readonly batchedCommands: Map<string, string[]> = new Map<string, string[]>();
  private readonly rules: Map<string, Rule> = new Map();

  constructor(loads: Map<string, string> = new Map()) {
    this.ruleLoadSites = this.mergeWithDefaultLoads(loads);
  }

  loadRule(type: string, label: Label) {
    const from = this.getRuleLoadSite(type);
    if (!from) { return; }

    this.newLoad(from, type, label);
  }

  addRule(rule: Rule) {
    this.rules.set(rule.label.toString(), rule);
    rule.toCommands(this);
  }

  newRule(rule: string, label: Label) {
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

  addAttr(attr: string, value: Array<string | Label>, label: Label) {
    this.addCommand(`add ${attr} ${value.join(' ')}`, label);
  }

  setAttr(attr: string, value: string | Label, label: Label) {
    this.addCommand(`set ${attr} "${value}"`, label);
  }

  removeAttr(attr: string, label: Label) {
    this.addCommand(`remove ${attr}`, label);
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

  /**
   * Merges an existing buildozer instance to this one
   * @param buildozer
   */
  merge(buildozer: Buildozer): Buildozer {
    buildozer.batchedCommands.forEach((value, key) => {
      if (!this.batchedCommands.has(key)) {
        this.batchedCommands.set(key, []);
      }
      this.batchedCommands.get(key).push(...value);
    });

    buildozer.rules.forEach((value, key) => {
      this.rules.set(key, value);
    });

    return this;
  }

  /**
   * Returns an added rule contained within this buildozer instance
   * @param label
   */
  getRule(label: Label | string): Rule {
    return this.rules.get(label.toString());
  }

  getRuleLoadSite(type: string): string {
    return this.ruleLoadSites.get(type);
  }

  private addCommand(command: string, label: Label) {
    const stringyLabel = label.toString();
    if (!this.batchedCommands.has(stringyLabel)) {
      this.batchedCommands.set(stringyLabel, []);
    }

    this.batchedCommands.get(stringyLabel).push(command);
  }

  private mergeWithDefaultLoads(source: Map<string, string>): Map<string, string> {
    const result = new Map<string, string>(source);
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
