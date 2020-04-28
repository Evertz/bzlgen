## Changelog

#### 0.0.0-PLACEHOLDER

* **feat**: Support generating `nodejs_binary` target. The `data` attr will be set to `entry_points` generating rule [#36](https://github.com/Evertz/bzlgen/pull/36)
* **feat**: Use the buildozer API via the NodeJS bindings rather than invoking directly in a shell on a text file [#34](https://github.com/Evertz/bzlgen/pull/34)
* **feat**: Support generating `ts_library` targets for a single file [#35](https://github.com/Evertz/bzlgen/pull/35)
* **feat**: Support simple generation of `container_layer` targets, adding files at `path` to the `files` attribute [#38](https://github.com/Evertz/bzlgen/pull/38)
* **feat**: Add `--pattern` flag. When `path` represents a directory, `pattern` is used as a glob for filtering files [#38](https://github.com/Evertz/bzlgen/pull/38)
* **fix**: Handle NodeJS builtins, adding `@types/node` as a dep [#37](https://github.com/Evertz/bzlgen/pull/37)
