import { Label } from '../src/label';

describe('labels', () => {
  it('can parse label with workspace, pkg and target', () => {
    const label = Label.parseAbsolute('@bzl//some/package/here:bin');
    expect(label.getWorkspace()).toBe('bzl');
    expect(label.getPackage()).toBe('some/package/here');
    expect(label.getTarget()).toBe('bin');
  });

  it('can parse label with pkg and target', () => {
    const label = Label.parseAbsolute('//some/package/here:bin');
    expect(label.getWorkspace()).toBe('');
    expect(label.getPackage()).toBe('some/package/here');
    expect(label.getTarget()).toBe('bin');
  });

  it('can parse label with workspace and target at root', () => {
    const label = Label.parseAbsolute('@foo//:bin');
    expect(label.getWorkspace()).toBe('foo');
    expect(label.getTarget()).toBe('bin');
  });

  it('can parse label with workspace and pkg', () => {
    const label = Label.parseAbsolute('@foo//bar');
    expect(label.getWorkspace()).toBe('foo');
    expect(label.getPackage()).toBe('bar');
    expect(label.getTarget()).toBe('bar');
    expect(label.toString()).toBe('@foo//bar:bar');
  });

  it('can parse label and return same string', () => {
    const label = Label.parseAbsolute('@bzl//some/package/here:bin');
    expect(label.toString()).toBe('@bzl//some/package/here:bin');
  });

  it('can change target for label', () => {
    const label = Label.parseAbsolute('@bzl//some/package/here:bin');
    expect(label.withTarget('foo').toString()).toBe('@bzl//some/package/here:foo');
  });

  it('can get default label', () => {
    const label = Label.parseAbsolute('@bzl//some/package/here:bin');
    expect(label.asDefaultLabel().toString()).toBe('@bzl//some/package/here:here');
  });

  it('throws when parsing a non absolute label', () => {
    expect(() => Label.parseAbsolute(':bin')).toThrow();
  });
});
