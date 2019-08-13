load("//tools/internal:index.bzl", "nest_module", "nest_package")

package(default_visibility = ["//visibility:public"])

nest_module(
    name = "platform-ws",
    srcs = glob(
        include = ["**/*.ts"],
        exclude = ["**/*.spec.ts"],
    ),
    deps = [
        "//packages/common",
        "//packages/websockets",
        "@npm//ws",
    ],
)

nest_package(
    name = "npm",
    deps = [":platform-ws"],
)
