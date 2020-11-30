load("@npm//@angular/bazel:index.bzl", _ng_module = "ng_module")
load("@io_bazel_rules_sass//sass:sass.bzl", _sass_binary = "sass_binary", _sass_library = "sass_library")

def ng_module(
        # name used for this rule
        name,
        # typescript sources
        srcs,
        # dependencies for the typescript files
        deps = [],
        # scss files used by the component
        style = None,
        # any dependencies needed for the scss style
        style_deps = [],
        # assets, eg html files etc
        assets = [],
        # theme file if required
        theme = None,
        # dependencies for the theme
        theme_deps = [],
        # the visibility of the ng_module
        visibility = ["//:__subpackages__"],
        **kwargs):
    if theme != None:
        _sass_binary(
            name = "%s_theme" % name,
            src = theme,
            deps = theme_deps,
            visibility = ["//:__subpackages__"],
        )

    ng_module_assets = assets

    if style != None:
        _sass_binary(
            name = "%s_styles" % name,
            src = style,
            deps = style_deps,
            visibility = visibility,
        )

        ng_module_assets = ng_module_assets + [":%s_styles" % name]

    _ng_module(
        name = name,
        srcs = srcs,
        assets = ng_module_assets,
        visibility = visibility,
        deps = [
            "@npm//@angular/common",
            "@npm//@angular/core",
            "@npm//rxjs",
        ] + deps,
        **kwargs
    )
