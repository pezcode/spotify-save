// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require('electron')
// require the vue build with compiler
// just requiring 'vue' would give us the runtime-only version
// you would need webpack/browserify with a vue loader in that case
const Vue = require('vue/dist/vue.js')

// default values
let data = {
  loggedIn: false,
  user: 'hui',
  saveToLibrary: false,
  selectedPlaylist: -1,
  playlists: [{id: 1, name:'Playlist 1'}, {id: 2, name: 'Playlist 2'}]
}

var vm = new Vue({
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

ipcRenderer.on('settings', function(event, settings) {
  //data = settings
  // copy values instead of replacing object
  Object.assign(data, settings)
})
