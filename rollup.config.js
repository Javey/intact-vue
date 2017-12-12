const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');

module.exports = {
    entry: 'src/index.js',
    dest: 'dist/intact.vue.js',
    format: 'umd',
    moduleName: 'Intact',
    legacy: true,
    plugins: [
        babel({
            exclude: 'node_modules/**',
            presets: [
                ['env', {modules: false, loose: true}],
                'stage-0',
            ],
            plugins: [
                'external-helpers'
            ],
            babelrc: false
        }),
        commonjs(),
    ]
}
