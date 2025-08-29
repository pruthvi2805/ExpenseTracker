import { emit, Events } from './bus.js'

export function showToast(opts){
  emit(Events.Toast, opts)
}

