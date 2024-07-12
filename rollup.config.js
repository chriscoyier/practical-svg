const builtins = require('@erquhart/rollup-plugin-node-builtins');
const commonjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');
const json = require('rollup-plugin-json');

export default {
  input: 'admin/util',
  output: {
    file: '_site/admin/util.js',
    format: 'iife',
    name: 'previewUtil',
  },
  plugins: [
    builtins(),
    nodeResolve(),
    commonjs(),
    json(),
  ]
};
