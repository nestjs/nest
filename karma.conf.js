const webpack = require('webpack');
const webpackConfig = require('./webpack.config.test');

module.exports = function (config) {
    config.set({
        browsers: [ 'Chrome' ],
        colors: true,
        reporters: [ 'mocha' ],
        frameworks: [ 'mocha', 'chai', 'sinon' ],
        files: [
            'tests.webpack.js'
        ],
        preprocessors: {
            'tests.webpack.js': [ 'webpack' ]
        },
        webpack: webpackConfig,
    });
};