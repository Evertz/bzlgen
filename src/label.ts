export class Label {
  static readonly WORKSPACE_MARKER = '@';
  static readonly PKG_ROOT_MARKER = '//';
  static readonly PKG_SEP = '/';
  static readonly TARGET_ROOT_MARKER = ':';

  static SHORTEN_LABELS = false;

  private constructor(private readonly workspace: string,
                      private readonly pkg: string,
                      private readonly target: string) {}

  static isAbsolute(label: string): boolean {
    if (!label) { return false; }
    return label.startsWith(Label.PKG_ROOT_MARKER) || label.startsWith(Label.WORKSPACE_MARKER);
  }

  static parseAbsolute(label: string): Label {
    if (!Label.isAbsolute(label)) { throw new Error(`Label '${label}' is not absolute`); }
    let workspace, pkg, target;

    const hasWorkspace = label.startsWith(Label.WORKSPACE_MARKER);
    const workspaceEnd = label.indexOf(Label.PKG_ROOT_MARKER);
    const pkgEnd = label.indexOf(Label.TARGET_ROOT_MARKER);

    if (hasWorkspace) {
      if (workspaceEnd < 0 && pkgEnd > -1) {
        // invalid label?
        throw new Error(`Label '${label}' is not valid`);
      }

      workspace = label.substring(Label.WORKSPACE_MARKER.length, workspaceEnd);
    } else {
      workspace = '';
    }

    pkg = label.substring(workspaceEnd + Label.PKG_ROOT_MARKER.length, pkgEnd === -1 ? label.length : pkgEnd);
    target = pkgEnd === -1 ? pkg.split(Label.PKG_SEP).pop() : label.substring(pkgEnd + 1, label.length);

    return new Label(workspace, pkg, target);
  }

  getTarget(withMarker = false): string {
    return withMarker ? Label.TARGET_ROOT_MARKER + this.target : this.target;
  }

  getPackage(withMarker = false): string {
    return withMarker ? Label.PKG_ROOT_MARKER + this.pkg : this.pkg;
  }

  getWorkspace(withMarker = false): string {
    return this.workspace ? (withMarker ? Label.WORKSPACE_MARKER + this.workspace : this.workspace) : '';
  }

  asDefaultLabel(): Label {
    return this.withTarget(this.getPackage().split(Label.PKG_SEP).pop());
  }

  withTarget(target: string): Label {
    return Label.parseAbsolute(
      (this.workspace.length ? this.getWorkspace(true) : '') +
        this.getPackage(true) +
        Label.TARGET_ROOT_MARKER + target
    );
  }

  toString() {
    const str = [];
    if (this.workspace.length) {
      str.push(this.getWorkspace(true));
    }

    str.push(this.getPackage(true));

    if (!this.pkg.endsWith(this.target) || !Label.SHORTEN_LABELS) {
      str.push(this.getTarget(true));
    }

    return str.join('');
  }
}
