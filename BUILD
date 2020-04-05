load("@npm_bazel_typescript//:index.bzl", "ts_config")
load("@build_bazel_rules_nodejs//:index.bzl", "pkg_npm")

exports_files(
    [".bzlgenrc"],
    visibility = ["//:__subpackages__"],
)

ts_config(
    name = "tsconfig",
    src = "tsconfig.json",
    visibility = ["//:__subpackages__"],
    deps = [],
)

NPM_BUILD_FILE_CONTENT = """"""

genrule(
    name = "gen_build",
    srcs = [],
    outs = ["_BUILD"],
    cmd = """echo '%s' >$@""" % NPM_BUILD_FILE_CONTENT,
)

pkg_npm(
    name = "pkg",
    srcs = [
        "package.json",
        ".bzlgenrc",
        "README.md",
        "LICENSE",
        "index.bzl",
        "//patches:@bazel+buildozer+2.2.1.patch",
    ],
    deps = [
         "//src",
         ":gen_build",
    ],
)
