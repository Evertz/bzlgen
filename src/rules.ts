import { Buildozer, DEFAULT_LOAD_SITES } from './buildozer';
import { Label } from './label';

export type SingleAttrValue = string | Label;
export type ArrayAttrValue = string[] | Label[];
export type AttrValue = SingleAttrValue | ArrayAttrValue;

/**
 * Helper for creating new rule instances and transforming them into a Buildozer instance
 */
export class Rule {
  protected attrs = new Map<string, AttrValue>();
  protected pAttrs = new Map<string, AttrValue>();

  protected readonly location: Label;

  static fromKindAndName(kind: string, pathTo: string, name: string, load?: string): Rule {
    return new Rule(
      kind,
      Label.parseAbsolute(`//${pathTo}:${name}`),
      load ?? DEFAULT_LOAD_SITES.get(kind)
    );
  }

  constructor(public readonly kind: string,
              public readonly label: Label,
              public readonly load?: string) {
    this.location = this.label.withTarget('__pkg__');
  }

  setAttr(name: string, value: AttrValue): this {
    if (!value || Array.isArray(value) && value.length === 0) { return this; }

    this.attrs.set(name, value);
    return this;
  }

  getAttr(name: string): AttrValue {
    return this.attrs.get(name);
  }

  setVisibility(visibility: ArrayAttrValue): this {
    this.setAttr('visibility', visibility);
    return this;
  }

  setSrcs(value: ArrayAttrValue): this {
    this.setAttr('srcs', value);
    return this;
  }

  setSrc(value: SingleAttrValue): this {
    this.setAttr('src', value);
    return this;
  }

  setDeps(value: ArrayAttrValue): this {
    this.setAttr('deps', value);
    return this;
  }

  setData(value: ArrayAttrValue): this {
    this.setAttr('data', value);
    return this;
  }

  setTags(value: string[]): this {
    this.setAttr('tags', value);
    return this;
  }

  getVisibility(): SingleAttrValue {
    return this.attrs.get('visibility') as SingleAttrValue;
  }

  setPrivateAttr(name: string, value: AttrValue): this {
    this.pAttrs.set(name, value);
    return this;
  }

  getPrivateAttr(name: string): AttrValue {
    return this.pAttrs.get(name);
  }

  toCommands(buildozer: Buildozer = new Buildozer()): Buildozer {
    if (this.load) {
      buildozer.newLoad(this.load, this.kind, this.location);
    } else {
      buildozer.loadRule(this.kind, this.location);
    }

    buildozer.newRule(this.kind, this.label);

    this.attrs.forEach((value, attr) => {
      if (Array.isArray(value)) {
        buildozer.addAttr(attr, value, this.label);
      } else {
        buildozer.setAttr(attr, value, this.label);
      }
    });

    return buildozer;
  }
}
