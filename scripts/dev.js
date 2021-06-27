// 只针对具体的某个包打包

const fs = require('fs')
// 开启子进程进行打包，最终还是使用rollup来进行打包
const execa = require('execa')

const target = 'reactivity'

async function build(target) {
  // rollup -cw --environment TARGET:shared
  await execa('rollup', ['-cw', '--environment', `TARGET:${target}`], {
    stdio: 'inherit' // 当子进程打包时的信息共享给父进程
  })
}

build(target)
