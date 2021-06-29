// 实现new Proxy(target, handler)

import { extend, hasChanged, hasOwn, isArray, isIntegerKey, isObject } from '@vue/shared'
import { track, trigger } from './effect'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import { reactive, readonly } from './reactive'

const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

const set = createSetter()
const shallowSet = createSetter(true)

export const mutableHandlers = {
  get,
  set
}

export const shallowReactiveHandlers = {
  get: shallowGet,
  set: shallowSet
}

// 是不是仅读的，仅读的属性set时会报异常
let readonlyObj = {
  set: (target, key) => {
    console.warn(`set on key ${key} failed`)
  }
}

export const readonlyHandlers = extend({
  get: readonlyGet
}, readonlyObj)

export const shallowReadonlyHandlers = extend({
  get: shallowReadonlyGet
}, readonlyObj)

function createGetter(isReadonly = false, shallow = false) { // 拦截获取功能
  return function get(target, key, receiver) {
    // proxy + reflect

    // 后续Object上的方法会被迁移到Reflect
    // 以前target[key] = value 方式设置值可能会失败，并不会报异常，也没有返回值标识
    // Reflect方法具备返回值 Reflect也可以单独使用 不用搭配Proxy来使用
    const res = Reflect.get(target, key, receiver) // target[key]

    if (!isReadonly) {
      // 收集依赖，等会数据变化后更新对应的视图
      console.log(key, '执行effect时会取值，收集effect')
      track(target, TrackOpTypes.GET, key)
    }
    if (shallow) {
      return res
    }
    // vue2是一上来就递归，vue3是当取值时会进行代理
    // vue3的代理模式是懒代理
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }
    return res
  }
}

function createSetter(shallow = false) { // 拦截设置功能
  return function set(target, key, value, receiver) {
    // 获取旧值
    const oldValue = target[key]
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver) // target[key] = value

    // vue2里无法监控更改索引，无法监控数组的长度变化 vue3使用hack的方式，需要特殊处理
    // 当数据更新时，通知对应属性的effect重新执行

    if (!hadKey) {
      // 新增
      trigger(target, TriggerOpTypes.ADD, key, value)
    } else if (hasChanged(oldValue, value)) {
      // 修改
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
    return result
  }
}
