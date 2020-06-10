# Bazel BUILD file generator

Tool to generate [Bazel](https://bazel.build) for a number of different rule sets and languages. Generation is done via [buildozer](https://github.com/bazelbuild/buildtools/tree/master/buildozer) commands for a given rule and source file or directory.

The generator can create rules for the following and can be extended to provide more

* sass_library
* sass_binary
* ng_module
* ts_library
* nodejs_binary
* container_layer
* filegroup

The generator is _somewhat_ flexible in the source structure, but does make a number of assumptions in certain cases.
It will try and 'best guess' labels from other packages. It's currently not expected to generate a 100% correct and working build file,
but will (in most cases) generate a ~80-90% best effort and reduce the boilerplate needed.

#### Running the generator
bzlgen can be installed from npm
```
npm i -g @evertz/bzlgen
```

Then run the generator, passing the type to generate and the path or file to generate for (not all generators support single files or directories)

```
bzlgen ng ./home
```

There are many option other flags that can be set to customize the output of the generator, see `--help` for more

The generator can also be run from source if needed:
```
bazel run //src:bin -- --help
```

### Mapping rules to load statements
By default, the generator will load rules from the workspace. However this can be changed by setting `load_mapping` flags 
This tells the generator where to load a given rule from.

This will load `sass_library` from `//tools/defaults.bzl`. This allows those with marcos overriding rule definitions to specify
the correct load site
```
--load_mapping=sass_library=//tools/defaults.bzl
```

### Mapping sources to labels
Label mappings can be added to either override or augment the 
mapping between a source file and its label. Labels mappings are always the relative path from the root of the workspace
(or in the case of node_modules, simply the module name)

```
--label_mapping path/to/src/component.ts=//some/other:label
```

Mappings can also contain glob patterns, allowing many paths or subpaths to be mapped to a specific label.
The example below will map all files in the `path/to` subdirectory to the label `//:foo`

```
--label_mapping path/to/**/*=//:foo
```

Imports can be ignored by setting the path to a blank label

#### Bazel Query

The generator has experimental use of `bazel query` to attempt to resolve source files to labels. This can be useful if
BUILD files have already been generated in the repo.
Mappings added via the `--label_mapping` flag will have priority over any query results or best guess label generation.

The `--use_bazel_query` can be set to opt-in to this behaviour

### .bzlgenrc
As bzlgen has a large number of flags, it can read them from a `.bzlgenrc` file in the root of the repo when to command is run.

Each line should contain one flag, all lines are processed, except those starting with `#`
```
# load mappings
--load_mapping=sass_library=//tools/defaults.bzl
--load_mapping=sass_binary=//tools/defaults.bzl

# label mappings
--label_mapping=rxjs/operators=@npm//rxjs
```
