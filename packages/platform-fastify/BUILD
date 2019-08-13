load("//tools/internal:index.bzl", "nest_module", "nest_package")

package(default_visibility = ["//visibility:public"])

nest_module(
    name = "platform-fastify",
    srcs = glob(
        include = ["**/*.ts"],
        exclude = ["**/*.spec.ts"],
    ),
    deps = [
        "//packages/common",
        "//packages/core",
        "@npm//fastify",
        "@npm//fastify-cors",
        "@npm//fastify-formbody",
        "@npm//path-to-regexp",
    ],
)

nest_package(
    name = "npm",
    deps = [":platform-fastify"],
)
