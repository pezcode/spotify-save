'use strict'

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require('electron')
const root = require('app-root-path')
const config = require(root + '/config.json')
// require the vue build with compiler
// just requiring 'vue' would give us the runtime-only version
// you would need webpack/browserify with a vue loader in that case
const Vue = require('vue/dist/vue.js')

// Vue watches for changes on these
let data = {
  clientId: null,
  clientSecret: null
}

// eslint-disable-next-line no-new
new Vue({
  el: '#credential-prompt',
  data: data,
  computed: {
    redirectUri: function () {
      return 'http://localhost:' + config.callbackPort + config.callbackPath
    }
  },
  methods: {
    save: function (event) {
      ipcRenderer.send('credentials-changed', data)
      ipcRenderer.send('close-credential-prompt')
    },
    cancel: function (event) {
      ipcRenderer.send('close-credential-prompt')
    }
  }
})
