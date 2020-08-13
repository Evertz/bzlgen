load("@npm//@bazel/typescript:index.bzl", "ts_library")
load("@npm//@bazel/jasmine:index.bzl", "jasmine_node_test")

ts_library(
    name = "test_srcs",
    testonly = 1,
    srcs = glob(["**/*.spec.ts"]),
    tsconfig = "//:tsconfig",
    deps = [
        "//src",
        "@npm//@types/jasmine",
        "@npm//@types/node",
        "@npm//jasmine",
        "@npm//mock-fs",
        "@npm//@types/mock-fs",
    ],
)

jasmine_node_test(
    name = "test",
    srcs = [":test_srcs"],
    data = [
        "//src",
        "@npm//mock-fs",
    ],
)
