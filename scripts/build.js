// 把packages目录下的所有包都进行打包

const fs = require('fs')
// 开启子进程进行打包，最终还是使用rollup来进行打包
const execa = require('execa')

const targets = fs.readdirSync('packages').filter(f => {
  if (!fs.statSync(`packages/${f}`).isDirectory()) {
    return false
  }
  return true
})

async function build(target) {
  // rollup -c --environment TARGET:shared
  await execa('rollup', ['-c', '--environment', `TARGET:${target}`], {
    stdio: 'inherit' // 当子进程打包时的信息共享给父进程
  })
}

function runParallel(targets, iteratorFn) {
  const res = []
  for (const item of targets) {
    const p = iteratorFn(item)
    res.push(p)
  }
  return Promise.all(res)
}

// 对我们目标进行依次打包，并行打包
runParallel(targets, build)
