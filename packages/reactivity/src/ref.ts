import { hasChanged, isArray, isObject } from '@vue/shared'
import { track, trigger } from './effect'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import { reactive } from './reactive'

export function ref(value) {
  // 将value变成一个响应式对象，可以传对象，但是一般情况下直接用reactive更合理
  return createRef(value)
}

export function shallowRef(value) {
  return createRef(value, true)
}

const convert = val => isObject(val) ? reactive(val) : val

// beta版本的ref实现就是一个对象，由于对象不方便扩展，改成了类
class RefImpl {
  // 表示声明了一个_value属性 但是没有赋值
  public _value
  // 表示是一个ref对象
  public readonly __v_isRef = true
  // 参数前面增加修饰符，表示此属性放到实例上
  constructor(public rawValue, public shallow) {
    // 如果是深度 需要把里面的都变成响应式的
    this._value = shallow ? rawValue : convert(rawValue)
  }
  // 类的属性访问器
  // 获取value值时会帮我们代理到_value上
  // ref和reactive的区别：reactive内部采用proxy，ref内部采用defineProperty
  get value() {
    track(this, TrackOpTypes.GET, 'value')
    return this._value
  }
  set value(newValue) {
    if (hasChanged(newValue, this.rawValue)) {
      this.rawValue = newValue
      this._value = this.shallow ? newValue : convert(newValue)
      trigger(this, TriggerOpTypes.SET, 'value', newValue)
    }
  }
}

function createRef(rawValue, shallow = false) {
  return new RefImpl(rawValue, shallow)
}

export function isRef(r) {
  return Boolean(r && r.__v_isRef === true)
}

class ObjectRefImpl {
  public readonly __v_isRef = true
  constructor(public target, public key) {}
  get value() {
    // 将value代理到target[key]上
    // 如果原对象是响应式的，就会依赖收集
    return this.target[this.key]
  }
  set value(newValue) {
    // 如果原对象是响应式的 那么就会触发更新
    this.target[this.key] = newValue
  }
}

// 可以把一个对象的值转化成ref对象
export function toRef(object, key) {
  return isRef(object[key]) ? object[key] : new ObjectRefImpl(object, key)
}

export function toRefs(object) {
  // object可能传的是数组或对象
  const ret = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  return ret
}
