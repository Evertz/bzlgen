## Changelog

#### 0.0.0-PLACEHOLDER

#### 0.5.1

* **fix**: Remove @angular/core, @angular/common and rxjs dependencies when generating with the ng_bundle generator as these deps are already included by default
* **fix**: Handle double quotes when resolving imports within Typescript files

#### 0.5.0

* **fix**: Don't evict unknown rule loads from load mappings
* **refactor**: Split generator resolution and types into separate files [#40](https://github.com/Evertz/bzlgen/issues/40)
* **feat**: Support generating `bzl_library` rules [#53](https://github.com/Evertz/bzlgen/pull/53)
* **chore**: Updated npm dependencies
* **chore**: Updated bazel dependencies [#55](https://github.com/Evertz/bzlgen/pull/55)

#### 0.4.1

* **fix**: Add `--pkg_default_dep_labels` defaulting to `true`. This causes generated dep labels to use the package default label (`//my/package`)
rather than the file label of the imported dependency (`//my/package:foo`). bzlgen will generate targets with the package name when generating a directory [#20](https://github.com/Evertz/bzlgen/issues/20)

#### 0.4.0

* **feat**: Support generating `nodejs_binary` target. The `data` attr will be set to `entry_points` generating rule [#36](https://github.com/Evertz/bzlgen/pull/36)
* **feat**: Use the buildozer API via the NodeJS bindings rather than invoking directly in a shell on a text file [#34](https://github.com/Evertz/bzlgen/pull/34)
* **feat**: Support generating `ts_library` targets for a single file [#35](https://github.com/Evertz/bzlgen/pull/35)
* **feat**: Support simple generation of `container_layer` targets, adding files at `path` to the `files` attribute [#38](https://github.com/Evertz/bzlgen/pull/38)
* **feat**: Add `--pattern` flag. When `path` represents a directory, `pattern` is used as a glob for filtering files [#38](https://github.com/Evertz/bzlgen/pull/38)
* **fix**: Handle NodeJS builtins, adding `@types/node` as a dep [#37](https://github.com/Evertz/bzlgen/pull/37)
