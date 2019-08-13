load("@npm_bazel_typescript//:index.bzl", "ts_library")

def nest_module(name, deps, srcs = []):
    deps += [
        "@npm//tslib",
        "@npm//reflect-metadata",
        "@npm//rxjs",
        "@npm//@types",
    ]

    ts_library(
        name = name,
        module_name = "@nestjs/" + name,
        srcs = srcs,
        deps = deps,
    )
