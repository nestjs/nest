load("//tools/internal:index.bzl", "nest_module", "nest_package")

package(default_visibility = ["//visibility:public"])

nest_module(
    name = "common",
    srcs = glob(
        include = ["**/*.ts"],
        exclude = ["**/*.spec.ts"],
    ),
    deps = [
        "@npm//axios",
        "@npm//cli-color",
        "@npm//uuid",
    ],
)

nest_package(
    name = "npm",
    deps = [":common"],
)
