const webpack = require('webpack');
const {VueLoaderPlugin} = require('vue-loader');
const path = require('path');

module.exports = function(config) {
    config.set({
        logLevel: config.LOG_INFO,
        files: ['./test/index.ts'],
        preprocessors: {
            './test/index.ts': ['webpack', 'sourcemap'],
        },
        webpack: {
            mode: 'development',
            module: {
                rules: [
                    {
                        test: /\.[jt]sx?$/,
                        loader: 'babel-loader',
                        // exclude: [path.resolve(__dirname, 'node_modules/core-js')],
                        exclude: /node_modules/,
                    },
                    {
                        test: /\.css$/,
                        use: ['style-loader', 'css-loader']
                    },
                    {
                        test: /\.vdt$/,
                        loader: 'vdt-loader'
                    },
                    {
                        test: /\.vue$/,
                        loader: 'vue-loader'
                    }
                ]
            },
            devtool: '#inline-source-map',
            resolve: {
                alias: {
                    'vue$': 'vue/dist/vue.esm-bundler.js',
                    'intact$': 'intact/dist/index.esm.dev.js',
                },
                extensions: ['.ts', '.js'],
            },
            plugins: [
                new VueLoaderPlugin(),
            ],
        },
        frameworks: [
            'mocha',
            'sinon-chai',
        ],
        // plugins: [
            // 'karma-mocha',
            // 'karma-webpack',
            // 'karma-sourcemap-loader',
            // 'karma-sinon-chai',
        // ],
        client: {
            mocha: {
                reporter: 'html',
                allowUncaught: true,
            }
        },
        singleRun: true,
        reporters: ['progress'],
    });
}
