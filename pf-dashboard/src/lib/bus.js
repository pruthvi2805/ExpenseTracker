const listeners = new Map()

export function on(event, fn) {
  const arr = listeners.get(event) || []
  arr.push(fn)
  listeners.set(event, arr)
  return () => off(event, fn)
}

export function off(event, fn) {
  const arr = listeners.get(event) || []
  listeners.set(event, arr.filter((f) => f !== fn))
}

export function emit(event, payload) {
  const arr = listeners.get(event) || []
  for (const fn of arr) fn(payload)
}

export const Events = {
  DataChanged: 'data:changed',
  SettingsChanged: 'settings:changed',
  Toast: 'toast:show'
}
