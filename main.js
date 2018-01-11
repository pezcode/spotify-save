'use strict'

const { app, dialog, Notification, Menu, Tray, nativeImage, BrowserWindow, ipcMain, session } = require('electron')
const settings = require('electron-settings')
const is = require('electron-is')
const assets = require('./assets.js')
const spotify = require('./spotify.js')
const Hotkey = require('./hotkey.js')

const path = require('path')
const url = require('url')

// Keep a global reference of the window objects, if you don't, the windows will
// be closed automatically when the JavaScript object is garbage collected.
let settingsWindow = null
let authWindow = null // eslint-disable-line no-unused-vars
let tray = null // eslint-disable-line no-unused-vars
let hotkey = null

let state = {
  user: null,
  playlists: []
}

function sendSettings () {
  if (settingsWindow) {
    settingsWindow.webContents.send('settings-changed', settings.getAll())
  }
}

function sendState () {
  if (settingsWindow) {
    if (state.user) {
      settingsWindow.webContents.send('logged-in', state)
    } else {
      settingsWindow.webContents.send('logged-out')
    }
  }
}

function login (options, success, error) {
  spotify.login()
    .then(user => {
      state.user = user
      return spotify.getPlaylists()
    })
    .then(playlists => {
      state.playlists = playlists
      settings.set('login', spotify.getAuthData())
      success()
      console.log('Loaded playlists')
    })
    .catch(err => {
      state.user = null
      if (err instanceof spotify.NoAuthError) {
        if (options.initiateAuth) {
          console.log('Opening auth URL')
          showAuthWindow()
        } else {
          error()
        }
      } else {
        console.error('Failed to log in and read user data!', err)
        error()
      }
    })
}

function initialLogin () {
  login({ initiateAuth: false },
    () => { },
    () => {
      console.error('Login failed')
      notify({
        type: 'warning',
        title: 'Not logged in',
        message: 'You need to be logged in to Spotify for this app to work. Open the settings window and log in there.'
      })
    })
}

function fullLogin () {
  login({ initiateAuth: true },
    function () {
      if (settingsWindow) {
        settingsWindow.webContents.send('logged-in', state)
      }
    }, function () {
      if (settingsWindow) {
        settingsWindow.webContents.send('login-failed')
      }
    })
}

function logout () {
  spotify.logout()
  state.user = null
  state.playlists = []
  settings.delete('selectedPlaylist')
  settings.delete('login')
  if (settingsWindow) {
    settingsWindow.webContents.send('logged-out')
  }
  console.log('Logged out')
}

function loggedIn () {
  return (state.user !== null)
}

ipcMain.on('settings-changed', function (event, newSettings) {
  const merged = Object.assign(settings.getAll(), newSettings)
  settings.setAll(merged)
  // console.log('New settings', merged)
  applySettings()
})

ipcMain.on('login', fullLogin)
ipcMain.on('logout', logout)
ipcMain.on('close-settings', event => { settingsWindow.close() })

function notify (options) {
  console.log('Notification: ' + options.title)
  console.log(options.message)
  if (is.windows()) {
    // notifications don't work properly on Win 10 Creator's Update
    // requires electron-builder installer and a call to app.setAppUserModelId
    // https://github.com/electron/electron/issues/10864
    tray.displayBalloon({
      icon: assets.app.image.medium,
      title: options.title,
      content: options.message
    })
  } else if (Notification.isSupported()) {
    let notification = new Notification({
      title: options.title,
      body: options.message
    })
    notification.on('click', event => { showSettingsWindow() })
    notification.show()
  } else if (options.force || options.type in ['warning', 'error']) {
    dialog.showMessageBox(options)
  }
}

function onHotkey () {
  console.log('Hotkey pressed')
  const playlist = settings.get('selectedPlaylist', null)
  if (!loggedIn()) {
    // console.error('Not logged in')
    notify({
      type: 'warning',
      title: 'Not logged in',
      message: 'Log in to Spotify'
    })
  } else if (!playlist) {
    notify({
      type: 'warning',
      title: 'No playlist selected',
      message: 'Select a playlist in the settings to save the current song to'
    })
  } else {
    spotify.getCurrentSong()
      .then(song => saveSong(song, playlist))
      .then(song => {
        notify({
          title: 'Song saved',
          message: song.title + ' by ' + song.artist + ' saved to ' + getPlaylistName(playlist)
        })
      })
      .catch(function (err) {
        if (err instanceof spotify.NoCurrentSongError) {
          console.log('No song playing')
        } else {
          console.error('Failed to save currently playing song', err)
        }
      })
  }
}

function getPlaylistName (id) {
  // get name for id
  let name = '[Unknown]'
  if (id === spotify.savedTracksId) {
    name = 'My Songs'
  } else if (state.playlists) {
    const found = state.playlists.find(pl => pl.id === id)
    if (found) {
      name = found.name
    }
  }
  return name
}

function saveSong (song, playlist) {
  // return Promise.resolve(playlistName)
  return spotify.saveSong(song, playlist)
    .then(() => song)
}

function createSettingsWindow (onClosed) {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    title: app.getName(),
    icon: assets.app.icon.source, // taskbar and handle icon
    show: false
  })
  // and load the html of the window.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'app/settings/index.html'),
    protocol: 'file:',
    slashes: true
  }))
  // show Chromium dev tools
  // win.openDevTools()
  // Don't show an application menu
  win.setMenu(null)
  win.once('ready-to-show', () => {
    sendState()
    sendSettings()
    win.show()
  })
  win.once('closed', onClosed)
  return win
}

function createAuthWindow (onClosed) {
  // clear cookies so Spotify requires login data
  session.defaultSession.clearStorageData()
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: assets.app.icon.source,
    show: false
  })
  win.loadURL(spotify.getAuthUrl())
  win.setMenu(null)
  // called when authentication process is over (success, error or window closed)
  let closing = false
  const authClosed = success => {
    if (success) { // called from the spotify module after successful authorization
      console.log('Auth process completed')
      fullLogin()
      win.close()
    } else {
      if (closing) { // called from the electron on-closed handler
        console.log('Auth window was closed')
      } else { // called from the spotify module after failed authorization
        console.error('Auth process failed')
        win.close()
      }
    }
  }
  spotify.setAuthCallback(authClosed)
  win.once('ready-to-show', win.show)
  win.once('closed', () => {
    closing = true
    authClosed(false)
    onClosed()
  })
  return win
}

function showSettingsWindow () {
  if (settingsWindow === null) {
    settingsWindow = createSettingsWindow(() => { settingsWindow = null }) // Dereference the window object
  } else if (settingsWindow.isMinimized()) {
    settingsWindow.restore()
  }
  settingsWindow.focus()
}

function showAuthWindow () {
  if (authWindow === null) {
    authWindow = createAuthWindow(() => { authWindow = null }) // Dereference the window object
  } else if (authWindow.isMinimized()) {
    authWindow.restore()
  }
  authWindow.focus()
}

function createTrayMenu () {
  // this randomly fails to resolve the path
  // createFromPath makes sure it turns into an empty image instead of throwing an exception
  let tray = new Tray(nativeImage.createFromPath(assets.app.icon.tray))
  tray.setToolTip(app.getName())
  const contextMenu = Menu.buildFromTemplate([
    {label: 'Settings', type: 'normal', click: showSettingsWindow},
    {type: 'separator'},
    {label: 'Close', type: 'normal', click: app.quit}
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', showSettingsWindow)
  tray.on('balloon-click', showSettingsWindow) // Windows
  return tray
}

// Only allow one instance of the app
// returns true if another instance is already running
function setSingleInstance () {
  const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    showSettingsWindow()
  })
  if (isSecondInstance) {
    console.log('Another instance is already running, closing this one')
    app.quit()
    process.exitCode = 1
  }
  return isSecondInstance
}

// Register global shortcut listener
function setHotkey (newHotkey, callback) {
  if (hotkey) {
    hotkey.unregister()
  }
  hotkey = new Hotkey(newHotkey.key, newHotkey.modifiers, callback)
  if (!hotkey.register()) {
    console.error('Shortcut registration failed: ' + hotkey.accelerator)
  }
}

function applySettings () {
  // set global hotkey
  const key = settings.get('hotkey', null)
  if (key) {
    setHotkey(key, onHotkey)
  }
  // register autostart
  const autostart = settings.get('autostart', false)
  if (is.production()) {
    app.setLoginItemSettings({ openAtLogin: autostart })
  } else if (autostart) {
    console.log('Autostart is disabled on the dev build, run the build step first and start that binary')
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  if (setSingleInstance()) {
    return
  }
  tray = createTrayMenu()
  console.log('Settings loaded from ' + settings.file())
  applySettings()
  spotify.setAuthData(settings.get('login', {}))
  spotify.init() // starts the auth server
  initialLogin()
})

// OSX
app.on('activate', showSettingsWindow)

// Subscribe to override default behavior of quitting
app.on('window-all-closed', () => { })
