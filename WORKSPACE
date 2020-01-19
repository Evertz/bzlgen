workspace(
    name = "bzlgen",
    managed_directories = {"@npm": ["node_modules"]},
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "c97bf38546c220fa250ff2cc052c1a9eac977c662c1fc23eda797b0ce8e70a43",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/1.1.0/rules_nodejs-1.1.0.tar.gz"],
)

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories", "yarn_install")

node_repositories(
    node_version = "10.16.0",
    package_json = ["//:package.json"],
    yarn_version = "1.19.1",
)

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")

install_bazel_dependencies()
