# Buildozer Commands Generator

Tool to generate [buildozer](https://github.com/bazelbuild/buildtools/tree/master/buildozer) commands for
a given rule and source file or directory.

The generator can create rules for the following and can be extended to provide more

* sass_library
* sass_binary
* ng_module

### Generate a BUILD file
The generator is _somewhat_ flexible in the source structure, but does make a number of assumptions in certain cases.
It will try and 'best guess' labels from other packages, label mappings can be added however to either override or augment the 
mapping between a source file and its label. Labels mappings are always the relative path from the root of the workspace
(or in the case of node_modules, simply the module name)

```
--label_mapping path/to/src/component.ts=//some/other:label
```

Generating a BUILD file for an angular component the generator expects the following directory layout:

```
some-component
  |__ some.component.ts
  |__ some.module.ts
  |__ some.component.html (optional)
  |__ some.component.scss (optional)
  |__ some.theme.scss (optional)
```

To generate a BUILD file for the above directory, in the root of the project, run the generator:
```
gen ng ./some-component
```

### .bzlgenrc

bzl-gen has a large number of flags, and can read them from a `.bzlgenrc` file in the root of the repo when to command is run.
As load sites can be customized for all rules, it's recommended that the default load sites are added to the rc file.

Each line should contain one flag, all lines are processed, except those starting with `#`
```
# load mappings
--load_mapping=sass_library=@io_bazel_rules_sass//sass:sass.bzl
--load_mapping=sass_binary=@io_bazel_rules_sass//sass:sass.bzl
--load_mapping=ts_library=@npm_bazel_typescript//:defs.bzl
--load_mapping=ng_module=@npm_angular_bazel//:index.bzl

# label mappings
--label_mapping=rxjs/operators=@npm//rxjs
```