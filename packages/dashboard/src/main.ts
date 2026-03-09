import { mount } from './core/dom.js'
import { App } from './app.js'

const root = document.getElementById('app')
if (root) {
  mount(root, App())
}
