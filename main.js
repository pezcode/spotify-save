'use strict'

const {app, Menu, Tray, nativeImage, BrowserWindow, ipcMain, session} = require('electron')
const assets = require('./assets.js')
const spotify = require('./spotify.js')
const Hotkey = require('./hotkey.js')

const path = require('path')
const url = require('url')

/*
To fix:
error dialog when login fails (don't have to close, just keep existing in tray)
don't open auth url when there is no login data (let the user do it manually from the settings dialog)
auth url gets called a few times because of recursion in login -> authWindow -> login ...
error handling if callback port is in use

To do:
hotkey module
store module
refactor data
clean up login/settings transfer
only allow one instance
native notification for errors and song being saved
*/

// Keep a global reference of the window objects, if you don't, the windows will
// be closed automatically when the JavaScript object is garbage collected.
let settingsWindow = null
let authWindow = null // eslint-disable-line no-unused-vars
let tray = null // eslint-disable-line no-unused-vars
let hotkey = null

let data = {
  user: null,
  playlists: [],
  selectedPlaylist: '0', // setting
  hotkey: { key: 'MediaNextTrack', modifiers: ['Alt', 'Shift'] } // setting
}

function settingsChanged () {
  if (settingsWindow) {
    settingsWindow.webContents.send('settings-changed', data)
  }
}

function login (success, error) {
  spotify.login()
    .then(function (expiresOn) {
      console.log('Logged in, expires at ' + (new Date(expiresOn)).toLocaleTimeString())
      return spotify.getUser()
    })
    .then(function (user) {
      data.user = user
      return spotify.getPlaylists()
    })
    .then(function (playlists) {
      data.playlists = playlists
      settingsChanged()
      success()
      console.log('Loaded user data')
    })
    .catch(function (err) {
      // spotify.WebApiError
      if (err instanceof spotify.NoAuthError) {
        console.log('Opening auth URL')
        authWindow = createAuthWindow()
      } else {
        console.error('Failed to log in and read user data!', err)
        error()
      }
    })
}

function logout () {
  // should probably move this out to a seperate store module
  spotify.logout()
  data.user = null
  data.playlists = []
  settingsChanged()
  console.log('Logged out')
}

ipcMain.on('settings-changed', function (event, settings) {
  //  Object.assign(data, settings)
  data = settings
})

ipcMain.on('login', function (event) {
  login(function () {
    event.sender.send('logged-in', data.user)
  }, function () {
    event.sender.send('login-failed')
  })
})

ipcMain.on('logout', function (event) {
  logout()
  event.sender.send('logged-out')
})

ipcMain.on('close-settings', function (event) {
  settingsWindow.close()
})

function onHotkey () {
  console.log('Hotkey pressed')
  spotify.getCurrentSong()
    .then(function (song) {
      if (!song.playing) {
        console.log('No song playing')
      } else {
        console.log('Currently playing song: ' + song.title + ' by ' + song.artist)
        // return spotify.saveSong(song.id, data.selectedPlaylist)
        return data.selectedPlaylist
      }
    })
    .then(function (playlist) {
      console.log('Song saved to ' + playlist)
    })
    .catch(function (err) {
      if (err instanceof spotify.NoCurrentSongError) {
        console.log('No song playing')
      } else {
        console.error('Failed to save currently playing song', err)
      }
    })
}

function createSettingsWindow (onClosed) {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    title: app.getName() + ' Settings',
    icon: path.join(__dirname, assets.appIcon), // taskbar and handle icon
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
  win.once('ready-to-show', () => { win.show(); settingsChanged() })
  win.once('closed', onClosed)
  return win
}

function createAuthWindow () {
  // clear cookies so Spotify requires login data
  session.defaultSession.clearStorageData()
  let authWin = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, assets.appIcon),
    show: false
  })
  spotify.setAuthCallback(function () {
    console.log('Auth closed!')
    // recursive :/
    // this opens more auth windows until the auth data actually arrived
    login(() => { }, () => { })
    authWin.close()
  })
  authWin.loadURL(spotify.getAuthUrl())
  authWin.setMenu(null)
  authWin.once('ready-to-show', authWin.show)
  return authWin
}

function showSettings () {
  if (settingsWindow === null) {
    settingsWindow = createSettingsWindow(() => { settingsWindow = null }) // Dereference the window object
  }
}

function createTrayMenu () {
  // this randomly fails to resolve the path
  // createFromPath makes sure it turns into an empty image instead of throwing an exception
  let tray = new Tray(nativeImage.createFromPath(path.join(__dirname, assets.trayIcon)))
  tray.setToolTip(app.getName())
  const contextMenu = Menu.buildFromTemplate([
    {label: 'Settings', type: 'normal', click: showSettings},
    {type: 'separator'},
    {label: 'Close', type: 'normal', click: app.quit}
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', showSettings)
  return tray
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  tray = createTrayMenu()
  // Register global shortcut listener
  hotkey = new Hotkey('F10', 'CommandOrControl', onHotkey)
  if (!hotkey.register()) {
    console.error('Shortcut registration failed: ' + hotkey.accelerator)
  }

  login(() => { }, () => { })
})

// OSX
app.on('activate', showSettings)

// Subscribe to override default behavior of quitting
app.on('window-all-closed', () => { })
