'use strict'

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require('electron')
const Hotkey = require('electron').remote.require('./hotkey.js')
// require the vue build with compiler
// just requiring 'vue' would give us the runtime-only version
// you would need webpack/browserify with a vue loader in that case
const Vue = require('vue/dist/vue.js')

// data sent by main process
// Vue watches for changes on these
let data = {
  user: null, // input
  playlists: [], // input
  selectedPlaylist: null, // input/output
  hotkey: { key: null, modifiers: [] } // input/output
}

// eslint-disable-next-line no-new
new Vue({
  el: '#settings',
  data: data,
  computed: {
    // these are constants
    // this makes sure we generate an error on accidental write
    keys: function () {
      return Hotkey.keys
    },
    modifiers: function () {
      return Hotkey.modifiers
    }
  },
  methods: {
    login: function (event) {
      ipcRenderer.send('login')
    },
    logout: function (event) {
      ipcRenderer.send('logout')
    },
    save: function (event) {
      ipcRenderer.send('settings-changed', data)
      ipcRenderer.send('close-settings')
    },
    cancel: function (event) {
      ipcRenderer.send('close-settings')
    }
  }
})

ipcRenderer.on('settings-changed', function (event, settings) {
  // data = settings
  // copy values instead of replacing object
  Object.assign(data, settings)
})

ipcRenderer.on('logged-in', function (event, user) {
  data.user = user
})

ipcRenderer.on('login-failed', function (event) {
  data.user = null
})

ipcRenderer.on('logged-out', function (event) {
  data.user = null
})
