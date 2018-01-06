'use strict'

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require('electron')
// require the vue build with compiler
// just requiring 'vue' would give us the runtime-only version
// you would need webpack/browserify with a vue loader in that case
const Vue = require('vue/dist/vue.js')

// sane default values
let data = {
  loggedIn: false,
  user: null,
  saveToLibrary: false,
  selectedPlaylist: -1,
  playlists: []
}

// eslint-disable-next-line no-new
new Vue({
  el: '#settings',
  data: data,
  updated: function () {
    ipcRenderer.send('settings', data)
  },
  methods: {
    login: function (event) {
      ipcRenderer.send('login')
    },
    logout: function (event) {
      ipcRenderer.send('logout')
    }
  }
})

ipcRenderer.on('settings', function (event, settings) {
  // data = settings
  // copy values instead of replacing object
  Object.assign(data, settings)
})

ipcRenderer.on('logged-in', function (event, user) {
  data.user = user
  data.loggedIn = true
})

ipcRenderer.on('login-failed', function (event) {
  data.loggedIn = false
  data.user = null
})

ipcRenderer.on('logged-out', function (event) {
  data.loggedIn = false
  data.user = null
})
