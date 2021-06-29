import { isObject } from '@vue/shared'
import {
  mutableHandlers,
  shallowReactiveHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers
} from './baseHandlers'

// 是不是仅读 是不是深度，柯里化

export function reactive(target) {
  return createReactiveObject(target, false, mutableHandlers)
}

export function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveHandlers)
}

export function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers)
}

export function shallowReadonly(target) {
  return createReactiveObject(target, true, shallowReadonlyHandlers)
}

// 会自动垃圾回收，不会造成内存泄露，存储的key只能是对象
const reactiveMap = new WeakMap()
const readonlyMap = new WeakMap()

export function createReactiveObject(target, isReadonly, baseHandlers) {
  // 如果目标不是对象 没法拦截了，reactive这个api只能拦截对象类型
  if (!isObject(target)) {
    return target
  }

  // 可能一个对象同时被深度代理 又被只读代理
  const proxyMap = isReadonly ? readonlyMap : reactiveMap
  const existProxy = proxyMap.get(target)
  // 如果某个对象已经被代理过了 就不要再次代理了
  if (existProxy) {
    // 如果已经被代理了 直接返回即可
    return existProxy
  }

  const proxy = new Proxy(target, baseHandlers)
  // 将要代理的对象和对应代理结果缓存起来
  proxyMap.set(target, proxy)

  return proxy
}
