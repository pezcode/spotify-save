// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// require the vue build with compiler
// just requiring 'vue' would give us the runtime-only version
// you would need webpack/browserify with a vue loader in that case
const Vue = require('vue/dist/vue.js')

var data = {
  loggedIn: true,
  user: 'hui',
  saveToLibrary: false,
  selectedPlaylist: -1,
  playlists: [{id: 1, name:'Playlist 1'}, {id: 2, name: 'Playlist 2'}]
}

var vm = new Vue({
  el: '#settings',
  data: data
})
