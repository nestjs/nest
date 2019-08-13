load("//tools/internal:index.bzl", "nest_module", "nest_package")

package(default_visibility = ["//visibility:public"])

nest_module(
    name = "core",
    srcs = glob(
        include = ["**/*.ts"],
        exclude = ["**/*.spec.ts"],
    ),
    deps = [
        "//packages/common",
        "@npm//fast-safe-stringify",
        "@npm//iterare",
        "@npm//object-hash",
        "@npm//optional",
    ],
)

nest_package(
    name = "npm",
    deps = [":core"],
)
