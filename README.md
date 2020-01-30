# Buildozer Commands Generator

Tool to generate [buildozer](https://github.com/bazelbuild/buildtools/tree/master/buildozer) commands for
a given rule and source file or directory.

The generator can create rules for the following and can be extended to provide more

* sass_library
* sass_binary
* ng_module
* ts_library

The generator is _somewhat_ flexible in the source structure, but does make a number of assumptions in certain cases.
It will try and 'best guess' labels from other packages. It's currently not expected to generate a 100% correct and working build file,
but will (in most cases) generate a ~80-90% best effort and reduce the boilerplate needed.

#### Running the generator
The generator can be run from source via bazel:

```
bazel run //src:bin -- ts examples/ --base_dir=/usr/workspaces/project
```

To generate BUILD files using bzlgen from source with bazel, set `--base_dir` to the absolute path of the target directory 

There are many option other flags that can be set to customize the output of the generator, see `--help` for more

### Mapping rules to load statements
By default, the generator won't load rules into the build file. However this can be changed by setting `load_mapping` flags 
This tells the generator where to load a given rule from.

This will load `sass_library` from `@io_bazel_rules_sass//sass:sass.bzl`. This allows those with marcos overriding rule definitions to specify
the correct load site
```
--load_mapping=sass_library=@io_bazel_rules_sass//sass:sass.bzl
```

### Mapping sources to labels
Label mappings can be added to either override or augment the 
mapping between a source file and its label. Labels mappings are always the relative path from the root of the workspace
(or in the case of node_modules, simply the module name)

```
--label_mapping path/to/src/component.ts=//some/other:label
```

Imports can be ignored by setting the path to a blank label

#### Bazel Query

The generator has experimental use of `bazel query` to attempt to resolve source files to labels. This can be useful if
BUILD files have already been generated in the repo.
Mappings added via the `--label_mapping` flag will have priority over any query results or best guess label generation.

The `--use_bazel_query` can be set to opt-in to this behaviour

### .bzlgenrc
As bzl-gen has a large number of flags, and can read them from a `.bzlgenrc` file in the root of the repo when to command is run.
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

### ng_bundle
This repo also contains a `ng_module` macro that this generator can generate for by passing the type `ng_bundle`. The macro encapsulates common
rules used together when building Angular modules, such as a `sass_binary` for a style or theme file. The macro can be found in `index.bzl`