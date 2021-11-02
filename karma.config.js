const webpack = require('webpack');
const {VueLoaderPlugin} = require('vue-loader');
const path = require('path');

module.exports = function(config) {
    config.set({
        logLevel: config.LOG_INFO,
        files: ['./test/index.js'],
        preprocessors: {
            './test/index.js': ['webpack', 'sourcemap'],
        },
        webpack: {
            mode: 'development',
            module: {
                rules: [
                    {
                        test: /\.js$/,
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
                    },
                    {
                        test: /\.(woff2?|eot|ttf|otf|svg|jpg|png)(\?.*)?$/,
                        loader: 'file-loader',
                    }
                ]
            },
            devtool: '#inline-source-map',
            resolve: {
                alias: {
                    'vue$': 'vue/dist/vue.esm-bundler.js',
                    'intact-vue$': path.resolve(__dirname, './src/index.js'),
                }
            },
            plugins: [
                new VueLoaderPlugin(),
            ],
        },
        frameworks: [
            'mocha',
            'sinon-chai',
        ],
        plugins: [
            'karma-mocha',
            'karma-webpack',
            'karma-sourcemap-loader',
            'karma-sinon-chai',
        ],
        client: {
            mocha: {
                reporter: 'html'
            }
        },
        singleRun: true,
        reporters: ['progress'],
    });
}
