java_library(
    name = "ij_sdk",
    neverlink = True,
    exports = [
        "@intellij_ce_2019_3//:sdk",
    ],
)

java_binary(
    name = "bzlgen_plugin",
    srcs = glob(["src/**/*.java"]),
    create_executable = False,
    resource_strip_prefix = "plugin/resources",
    resources = glob(["resources/**"]),
    deps = [":ij_sdk"],
)
