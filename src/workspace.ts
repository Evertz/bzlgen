import { lstatSync, readdirSync, readFileSync } from 'fs';
import kebabCase from 'lodash.kebabcase';
import { isAbsolute, join, normalize, parse, sep, ParsedPath } from 'path';
import * as shell from 'shelljs';
import * as util from 'util';
import minimatch from 'minimatch';
import * as BazelBuildozer from '@bazel/buildozer';

import { Buildozer } from './buildozer';
import { Flags } from './flags';
import { Label } from './label';
import { debug, fatal, isDebugEnabled, lb, log, warn } from './logger';

export class Workspace {
  private static readonly QUERY_FLAGS = `--output label --order_output=no`;

  private readonly buildozer: Buildozer;

  private readonly staticLabels: Map<string, RegExp>;
  private readonly resolvedStaticLabelsCache: Map<string, Label> = new Map<string, Label>();

  private readonly fileQueryResultCache: Map<string, Label> = new Map<string, Label>();

  private listing: Readonly<string[]>;

  constructor(private readonly flags: Flags<any>) {
    this.buildozer = new Buildozer(this.flags.load_mapping);

    const regexLabels: Array<[string, RegExp]> = Array.from(this.flags.label_mapping.entries())
      .map(pair => [pair[1], minimatch.makeRe(pair[0])]);

    this.staticLabels = new Map(regexLabels);
    
    if (isDebugEnabled) {
      debug('Rule load sites loaded:');
      debug(util.inspect(this.flags.load_mapping));
      lb();
      debug('Static label mappings loaded:');
      debug(util.inspect(this.staticLabels));
      lb();
    }
  }

  getFlags<T>(): Flags<T> {
    return this.flags;
  }

  getPath(): string {
    return this.flags.path;
  }

  getAbsolutePath() {
    return join(this.flags.base_dir, this.flags.path);
  }

  isDirectory(): boolean {
    return lstatSync(this.getAbsolutePath()).isDirectory();
  }

  isFile(): boolean {
    return lstatSync(this.getAbsolutePath()).isFile();
  }

  /**
   * Resolve a list of files in the path if the path represents a directory, otherwise return an empty array
   * The file paths are rooted at the workspace relative path
   */
  readDirectory(): string[] {
    if (!this.isDirectory()) { return []; }

    const files = readdirSync(this.getAbsolutePath())
      .map(file => this.resolveRelativeToWorkspace(file))
      .filter(file => !file.endsWith(this.flags.build_file_name));

    if (this.flags.pattern) {
      return minimatch.match(files, join(this.flags.path, this.flags.pattern));
    }

    return files;
  }

  /**
   * Reads the file at path if the path represents a file, otherwise return an empty undefined
   */
  readFileAtPath(): string {
    if (this.isDirectory()) { return; }
    return this.readFile(this.getPath());
  }

  /**
   * Reads the file at the given path and returns the content as a string
   * @param path
   */
  readFile(path: string): string {
    return readFileSync(this.resolveAbsolute(path), { encoding: 'utf-8' });
  }

  /**
   * Return the parsed path info about the current path (workspace relative)
   */
  getPathInfo(): ParsedPath {
    return parse(this.getPathFromBaseDir());
  }

  /**
   * Returns the workspaces buildozer instance with the ability to add commands to it
   */
  getBuildozer(): Buildozer {
    return this.buildozer;
  }

  /**
   * Returns the directory that contains the current path if path represents a file, otherwise returns path
   */
  getPathAsDirectory(): string {
    return this.isFile() ? parse(this.getPathFromBaseDir()).dir : this.getPathFromBaseDir();
  }

  /**
   * Returns a normalized relative path segment that is rooted at the at the workspace root
   * eg:
   *  base_dir=/home/workspace/foo
   *  path=../src/component
   *
   *  = src/component
   */
  getPathFromBaseDir(): string {
    return normalize(this.getPath());
  }

  /**
   * Return a bazel label that represents the default target for the path
   */
  getLabelForPath(): Label {
    return this.getLabelFor(this.flags.path);
  }

  /**
   * Returns a bazel label for the given path for the default target (eg where last package segment = target)
   * Optionally adding the target to the label
   *
   * If the path is a file, then the file is assumed to be part of the default label for the package.
   * See getLabelForFile to attempt a best guess at the file label
   *
   * All paths are considered relative to path, not the workspace root
   */
  getLabelFor(path: string, target?: string): Label {
    path = this.resolveRelativeToWorkspace(path);

    const staticLabel = this.tryResolveLabelFromStaticMapping(path);
    if (staticLabel) {
      return staticLabel;
    }

    let label = lstatSync(this.resolveAbsolute(path)).isFile() ? parse(path).dir : path;

    if (target) {
      label = `${label}:${target}`;
    }

    return Label.parseAbsolute(`//${label}`);
  }

  /**
   * Returns a best guess attempt at the label for the rule that the given file is a part of.
   *
   * Allows adding an optional suffix and stripping the file extension,
   * note that the suffix is added after stripping the extension
   */
  getLabelForFile(path: string, suffix?: string, stripFileExt = true): Label {
    path = this.resolveRelativeToWorkspace(path);

    const staticLabel = this.tryResolveLabelFromStaticMapping(path);
    if (staticLabel) {
      return staticLabel;
    }

    if (this.flags.use_bazel_query) {
      const queryLabel = this.queryForFile(path);
      if (queryLabel) {
        return queryLabel;
      }
    }

    const parsed = parse(path);
    let snake = kebabCase(stripFileExt ? parsed.name : parsed.base);

    if (this.flags.suffix_separator !== '-') {
      snake = snake.replace(/-/g, this.flags.suffix_separator);
    }

    if (suffix) {
      snake = `${snake}${this.flags.suffix_separator}${suffix}`;
    }

    return this.getLabelFor(parsed.dir, snake);
  }

  /**
   * Returns a best guess label for the given file
   *
   * Note: This does not take into account BUILD file location, so the label may cross a package boundary
   *
   * Unlike getLabelForFile, this method returns the label for the file itself, not the rule in which it resides
   * @param file
   */
  getFileLabel(file: string): Label {
    if (this.flags.use_bazel_query) {
      debug(`Query for file ${file}`);

      const result = shell.exec(
        `${this.flags.bzl_binary} query ${Workspace.QUERY_FLAGS} '${file}'`,
        { cwd: this.getFlags().base_dir, silent: !this.flags.debug }
      );

      if (result.code === 0) {
        const rule = result.stdout.trim();
        if (rule.length) {
          return Label.parseAbsolute(rule);
        }
      }
    }

    const parsed = parse(file);
    return Label.parseAbsolute(`//${parsed.dir}:${parsed.base}`);
  }

  /**
   * Attempts to calculate the rule name for a file
   *
   * This is similar to 'getLabelForFile' but only returns the target part of the label
   * This can be helpful for passing as the name attr for rules
   */
  calculateRuleName(file: string, suffix?: string, stripFileExt = true): string {
    return this.getLabelForFile(file, suffix, stripFileExt).getTarget();
  }

  /**
   * Parses a label into its component parts
   */
  parseLabel(label: string): Label {
    return Label.parseAbsolute(label);
  }

  /**
   * Resolves the passed path (directory or file) to a relative path rooted at the workspace (base_dir)
   * @param path The path to resolve
   */
  resolveRelativeToWorkspace(path: string): string {
    if (this.isWorkspaceRelative(path)) { return path; }
    return join(this.getPathAsDirectory(), path);
  }

  /**
   * Determines if this path is relative to the workspace root
   * @param path
   */
  isWorkspaceRelative(path: string): boolean {
    if (!this.listing) {
      this.listing = readdirSync(this.flags.base_dir);
    }

    const firstSegment = normalize(path).split(sep)[0];
    return this.listing.includes(firstSegment);
  }

  /**
   * Returns the absolute path for the given path based on base_dir
   * @param path
   */
  resolveAbsolute(path: string): string {
    if (isAbsolute(path)) { return path; }

    if (this.isWorkspaceRelative(path)) {
      return join(this.flags.base_dir, path);
    } else {
      return this.resolveAbsolute(this.resolveRelativeToWorkspace(path));
    }
  }

  /**
   * Tests if the base dir is a bazel workspace
   * More specifically, tests that a root BUILD and WORKSPACE file exists (taking name overrides into account)
   *
   * Returns true if the both a root BUILD and WORKSPACE file exist and they are files, false if BUILD or WORKSPACE are not files
   * or throws if BUILD or WORKSPACE are missing
   */
  testBaseDirSupportsBazel(): boolean {
    const base = this.flags.base_dir;
    const rootBuildFile = join(base, this.flags.build_file_name);

    const errorMessage = `The workspace at ${base} does not appear to be a bazel workspace.`;
    let hasRootBuildFile = true;
    try {
      hasRootBuildFile = lstatSync(rootBuildFile).isFile();
    } catch (e) {
      fatal(`${errorMessage} Missing root ${this.flags.build_file_name} file`);
    }

    if (!hasRootBuildFile) {
      fatal(`${errorMessage} Root ${this.flags.build_file_name} file is not a file`);
    }

    const workspaceFile = join(base, 'WORKSPACE');
    let hasWorkspaceFile = true;
    try {
      hasWorkspaceFile = lstatSync(workspaceFile).isFile();
    } catch (e) {
      fatal(`${errorMessage} Missing WORKSPACE file`);
    }

    if (!hasWorkspaceFile) {
      fatal(`${errorMessage} WORKSPACE file is not a file`);
    }

    return hasRootBuildFile && hasWorkspaceFile;
  }

  /**
   * Return a path to the BUILD file in the current path
   */
  getBuildFilePath(): string {
    return this.isDirectory() ?
      join(this.getAbsolutePath(), this.flags.build_file_name) :
      join(this.getAbsolutePath(), '..', this.flags.build_file_name);
  }

  /**
   * Checks if a BUILD file exists at path and that it is a file
   */
  hasBuildFileAtPath(): boolean {
    const buildFilePath = this.getBuildFilePath();

    try {
      return lstatSync(buildFilePath).isFile();
    } catch (e) {
      return false;
    }
  }

  /**
   * Returns the label for an import where a static mapping exists,
   * otherwise returns undefined.
   */
  tryResolveLabelFromStaticMapping(imp: string, defaultValue?: string, relativePrefix?: string): Label | undefined {
    // convert to a workspace relative path, this call is a noop if the path is already workspace relative
    if (relativePrefix && imp.startsWith(relativePrefix)) {
      imp = this.resolveRelativeToWorkspace(imp);
    }

    if (this.resolvedStaticLabelsCache.has(imp)) {
      return this.resolvedStaticLabelsCache.get(imp);
    }

    // find returns the first found truthy match, so there _may_ be a more specific glob in the map
    // but we won't find it - room for improvement, but the consumer can move them up the list
    const result = Array.from(this.staticLabels.entries())
      .find(([_, value]) => !!value.exec(imp));

    if (!result) {
      return defaultValue ? Label.parseAbsolute(defaultValue) : undefined;
    }

    const staticMapped = result[0];
    const label = Label.parseAbsolute(staticMapped);

    this.resolvedStaticLabelsCache.set(imp, label);

    return label;
  }

  /**
   * Invokes a buildozer class in the base directory
   */
  invokeBuildozer() {
    if (!this.flags.generate_build_files && !this.flags.output_buildozer_to_console) {
      log(`--no-generate_build_files set, not generating ${this.flags.build_file_name} files`);
      return;
    }

    if (this.flags.output_buildozer_to_console) {
      log('\n' + this.buildozer.toCommands());
      return;
    }

    const commands = this.buildozer.toCommandBatch();
    if (!commands.length) {
      warn('No buildozer commands were generated');
      return;
    }

    const hasBuildFileAtPath = this.hasBuildFileAtPath();
    if (hasBuildFileAtPath && this.flags.nuke_build_file) {
      shell.rm(this.getBuildFilePath());
      shell.touch(this.getBuildFilePath());
    } else if (!hasBuildFileAtPath) {
      shell.touch(this.getBuildFilePath());
    }

    debug('Invoking buildozer');

    try {
      BazelBuildozer.runWithOptions(commands, { cwd: this.flags.base_dir }, ['-shorten_labels', '-eol-comments=true', '-k']);
      log(`Generated ${this.flags.build_file_name} files`);
    } catch (e) {
      fatal(`Error generating ${this.flags.build_file_name} files`);
    }
  }

  private queryForFile(file: string): Label {
    if (this.fileQueryResultCache.has(file)) {
      return this.fileQueryResultCache.get(file);
    }

    const parts = file.split('/');
    const name = parts.pop();

    const label = `//${parts.join('/')}:${name}`;

    debug(`Query for containing rule with for file ${file}`);

    const term = `"attr('src', ${label}, //...)"`;
    const term2 = `"attr('srcs', ${label}, //...)"`;

    const result = shell.exec(
      `${this.flags.bzl_binary} query ${Workspace.QUERY_FLAGS} ${term} + ${term2}`,
      { cwd: this.getFlags().base_dir, silent: !this.flags.debug }
    );

    if (result.code === 0) {
      const rule = result.stdout.trim();

      if (rule.length) {
        const label = Label.parseAbsolute(rule);
        this.fileQueryResultCache.set(file, label);

        return label;
      }
    }
  }

}
