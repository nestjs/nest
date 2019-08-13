load("//tools/internal:index.bzl", "nest_module", "nest_package")

package(default_visibility = ["//visibility:public"])

nest_module(
    name = "platform-express",
    srcs = glob(
        include = ["**/*.ts"],
        exclude = ["**/*.spec.ts"],
    ),
    deps = [
        "//packages/common",
        "//packages/core",
        "@npm//body-parser",
        "@npm//cors",
        "@npm//express",
        "@npm//multer",
    ],
)

nest_package(
    name = "npm",
    deps = [":platform-express"],
)
