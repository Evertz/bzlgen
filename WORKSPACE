workspace(
    name = "bzlgen",
    managed_directories = {"@npm": ["node_modules"]},
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "6a67a8a1bf6fddc9113f73471029b819eef4575c3a936a4a01d57e411894d692",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/2.0.2/rules_nodejs-2.0.2.tar.gz"],
)

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories", "yarn_install")

node_repositories(
    node_version = "12.13.0",
    package_json = ["//:package.json"],
    yarn_version = "1.19.1",
)

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)
