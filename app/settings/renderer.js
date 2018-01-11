'use strict'

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require('electron')
const root = require('app-root-path')
const Hotkey = require(root + '/hotkey.js')
const spotify = require(root + '/spotify.js')
// require the vue build with compiler
// just requiring 'vue' would give us the runtime-only version
// you would need webpack/browserify with a vue loader in that case
const Vue = require('vue/dist/vue.js')

// Vue watches for changes on these
let data = {
  state: { // input
    user: null,
    playlists: []
  },
  settings: { // input/output
    selectedPlaylist: null,
    hotkey: { key: null, modifiers: [] },
    autostart: false
  }
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
    },
    savedTracksId: function () {
      return spotify.savedTracksId
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
      ipcRenderer.send('settings-changed', this.settings)
      ipcRenderer.send('close-settings')
    },
    cancel: function (event) {
      ipcRenderer.send('close-settings')
    }
  }
})

ipcRenderer.on('settings-changed', function (event, newSettings) {
  data.settings = newSettings
  if (!data.settings.hotkey) {
    data.settings.hotkey = { key: null, modifiers: [] }
  }
})

ipcRenderer.on('logged-in', function (event, newState) {
  data.state = newState
})

ipcRenderer.on('login-failed', function (event) {
  data.state.user = null
  data.state.playlists = []
})

ipcRenderer.on('logged-out', function (event) {
  data.state.user = null
  data.state.playlists = []
})
