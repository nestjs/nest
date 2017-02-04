const path = require("path");
const webpack = require('webpack');

const excludes = [
    /node_modules/
];

module.exports = {
    watch: true,
    target: "node",
    resolve: {
        extensions: ["", ".webpack.js", ".web.js", ".ts", ".tsx", ".js", ".json"]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': '"test"',
            'global': {},
            'global.GENTLY': false
        }),
        new webpack.ProvidePlugin({
            Reflect: 'core-js/es7/reflect',
            Map: 'core-js/es7/map',
            Set: 'core-js/es7/set'
        })
    ],
    module: {
        loaders: [
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
                exclude: excludes
            },
            {
                test: /\.json$/,
                loader: 'json-loader'
            }
        ]
    }
};