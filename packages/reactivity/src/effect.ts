import { isArray, isIntegerKey } from '@vue/shared'
import { TriggerOpTypes } from './operations'

export function effect(fn, options: any = {}) {
  // 需要让这个effect变成响应式的effect，可以做到数据变化时重新执行
  const effect = createReactiveEffect(fn, options)

  if (!options.lazy) { // 默认lazy为false
    // 响应式的effect默认会先执行一次
    effect()
  }
  return effect
}

let uid = 0
let activeEffect // 存储当前的effect
const effectStack = []

function createReactiveEffect(fn, options) {
  const effect = function reactiveEffect() {
    // 保证effect没有加入到effectStack中 避免effect(() => state.age++)造成死循环
    if (!effectStack.includes(effect)) {
      try {
        effectStack.push(effect)
        // 当前正在运行的effect
        activeEffect = effect
        // 函数执行时会取值 会执行getter方法
        return fn()
      } finally {
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  }
  // 制作一个effect标识 用于区分effect
  effect.id = uid++
  // 用于标识这个是响应式effect
  effect._isEffect = true
  // 保留effect对应的原函数
  effect.raw = fn
  // 在effect上保存用户的属性
  effect.options = options

  return effect
}

const targetMap = new WeakMap()

// 让某个对象中的属性 收集当前他对应的effect函数
export function track(target, type, key) {
  // 此属性不用收集依赖，因为没在effect中使用
  if (activeEffect === undefined) {
    return
  }
  // WeakMap { target: Map } => Map { key: Set } => Set [effect1, effect2]
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    // Set会对effect进行去重
    depsMap.set(key, (dep = new Set))
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
  }
}

// 找属性对应收集的effect 让其执行
export function trigger(target, type, key?, newValue?, oldValue?) {
  // 如果这个属性没有收集过effect，那不需要做任何操作
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  // 将所有要执行的effect全部存到一个新的集合中，最终一起执行，Set对effect去重了
  const effects = new Set()
  const add = effectsToAdd => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => {
        if (effect !== activeEffect) {
          effects.add(effect)
        }
      })
    }
  }

  // 如果修改数组长度，由于修改长度会影响数组索引的值，需要特殊处理
  if (key === 'length' && isArray(target)) {
    depsMap.forEach((dep, key) => {
      // 如果length属性有依赖收集 需要更新
      // 或者索引有依赖收集，并且原数组的索引超出修改长度时，需要触发effect重新执行
      if (key === 'length' || key >= newValue) {
        add(dep)
      }
    })
  } else {
    // 源码注释：schedule runs for SET | ADD | DELETE
    if (key !== undefined) {
      add(depsMap.get(key))
    }
    switch (type) {
      case TriggerOpTypes.ADD:
        // 如果在数组中添加新的索引，则对length收集到的effect重新执行
        if (isArray(target) && isIntegerKey(key)) {
          add(depsMap.get('length'))
        }
    }
  }

  effects.forEach((effect: Function) => effect())
}

// 函数调用是一个栈结构
// effect(() => { // effect1  [effect1]
//   state.name // effect1
//   effect(() => { // effect2  [effect1, effect2]
//     state.age // effect2
//   })
//   state.address // effect1
// })
