const webpack = require('webpack');
const {VueLoaderPlugin} = require('vue-loader');
const path = require('path');

const isDebug = !(process.env.COVER || process.env.CI);

module.exports = function(config) {
    config.set({
        browsers: !isDebug ? ['ChromeHeadless'] : undefined,
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
                        test: /\.ts$/,
                        include: /src\/.*\.ts$/,
                        enforce: 'post',
                        use: {
                            loader: 'istanbul-instrumenter-loader',
                            options: {esModules: true}
                        }
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
        singleRun: !isDebug,
        // reporters: ['progress'],
        reporters: ['coverage-istanbul'],
        coverageIstanbulReporter: {
            reports: ['html', 'text-summary', 'lcovonly'],
            dir: path.resolve(__dirname, './coverage/'),
            fixWebpackSourcePaths: true,
        },
    });
}
