load("@build_bazel_rules_nodejs//:defs.bzl", "npm_package")

# TODO: Figure out why filegroups doesn't get copied as deps
def nest_package(name, deps, srcs = []):
    npm_package(
        name = name,
        srcs = srcs + ["package.json"],
        deps = deps,
    )