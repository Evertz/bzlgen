## Changelog

#### 0.0.0-PLACEHOLDER

* **feat**: Support generating `nodejs_binary` target. The `data` attr will be set to `entry_points` generating rule [#36](https://github.com/Evertz/bzlgen/pull/36)
* **feat**: Use the buildozer API via the NodeJS bindings rather than invoking directly in a shell on a text file [#35](https://github.com/Evertz/bzlgen/pull/35)
* **fix**: Handle NodeJS builtins, adding `@types/node` as a dep
