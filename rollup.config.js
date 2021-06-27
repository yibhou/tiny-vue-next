// rollup的配置

import path from 'path'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import ts from 'rollup-plugin-typescript2'

// 根据环境变量中的target属性 获取对应模块中的package.json

// 找到packages
const packagesDir = path.resolve(__dirname, 'packages')
// 找到要打包的某个包
const packageDir = path.resolve(packagesDir, process.env.TARGET)

const resolve = p => path.resolve(packageDir, p)
const name = path.basename(packageDir) // 取文件名

const pkg = require(resolve('package.json'))

// 对打包类型先做一个映射表，根据你提供的formats来格式化需要打包的内容
const outputConfig = {
  'esm-bundler': {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: 'es'
  },
  'cjs': {
    file: resolve(`dist/${name}.cjs.js`),
    format: 'cjs'
  },
  'global': {
    file: resolve(`dist/${name}.global.js`),
    format: 'iife' // 立即执行函数
  }
}

// 自己在package.json中定义的选项
const options = pkg.buildOptions
// rollup最终需要导出配置
export default options.formats.map(format => createConfig(format, outputConfig[format]))

function createConfig(format, output) {
  output.name = options.name
  output.sourcemap = true // 生成source map

  // 生成rollup配置
  return {
    input: resolve('src/index.ts'),
    output,
    plugins: [
      json(),
      ts({ // ts插件
        tsconfig: path.resolve(__dirname, 'tsconfig.json')
      }),
      nodeResolve() // 解析第三方模块插件
    ]
  }
}
