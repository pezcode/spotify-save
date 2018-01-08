'use strict'

const {app, dialog, Menu, Tray, nativeImage, BrowserWindow, ipcMain, session } = require('electron')
const assets = require('./assets.js')
const spotify = require('./spotify.js')
const Hotkey = require('./hotkey.js')

const path = require('path')
const url = require('url')

/*
To fix:
error handling if callback port is in use
(also: gets registered before it checks if app is single instance)
  -> even better, register own protocol -> app.setAsDefaultProtocolClient
  -> requires --protocol=myprotocol and --protocolName=MyProtocol for electron-packager for OSX

To do:
add to autorun -> app.setLoginItemSettings
actually save song
store module
native notification for errors and song being saved
*/

// Keep a global reference of the window objects, if you don't, the windows will
// be closed automatically when the JavaScript object is garbage collected.
let settingsWindow = null
let authWindow = null // eslint-disable-line no-unused-vars
let tray = null // eslint-disable-line no-unused-vars
let hotkey = null

// should probably move this out to a seperate store module
let data = {
  user: null,
  playlists: [],
  selectedPlaylist: '0', // setting
  hotkey: { key: 'MediaNextTrack', modifiers: ['Alt', 'Shift'] } // setting
}

function sendSettings () {
  if (settingsWindow) {
    // don't really have to send data.user
    settingsWindow.webContents.send('settings-changed', data)
  }
}

function login (options, success, error) {
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
      sendSettings()
      success()
      console.log('Loaded user data')
    })
    .catch(function (err) {
      if (err instanceof spotify.NoAuthError) {
        if(options.initiateAuth) {
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

function initialLogin() {
  login({ initiateAuth: false },
    () => { },
    function () {
      console.error('Login failed')
      dialog.showMessageBox({
        type: 'warning',
        title: 'Not logged in',
        message: 'You need to be logged in to Spotify for this app to work. Open the settings window and log in there.'
      })
    })
}

function fullLogin() {
  login({ initiateAuth: true },
    function () {
      if (settingsWindow) {
        settingsWindow.webContents.send('logged-in', data.user)
      }
    }, function () {
      if (settingsWindow) {
        settingsWindow.webContents.send('login-failed')
      }
  })
}

function logout () {
  spotify.logout()
  data.user = null
  // data.playlists = []
  // sendSettings()
  if (settingsWindow) {
    settingsWindow.webContents.send('logged-out')
  }
  console.log('Logged out')
}

function loggedIn() {
  return (data.user !== null)
}

ipcMain.on('settings-changed', function (event, settings) {
  //  Object.assign(data, settings)
  data = settings
})

ipcMain.on('login', fullLogin)
ipcMain.on('logout', logout)
ipcMain.on('close-settings', function (event) {
  settingsWindow.close()
})

function onHotkey () {
  console.log('Hotkey pressed')
  if (!loggedIn()) {
    console.log('Not logged in')
  } else {
    spotify.getCurrentSong()
      .then(function (song) {
        if (!song.playing) {
          console.log("Found a song but it's not playing")
          return Promise.reject()
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
  win.once('ready-to-show', () => { win.show(); sendSettings() })
  win.once('closed', onClosed)
  return win
}

function createAuthWindow (onClosed) {
  // clear cookies so Spotify requires login data
  session.defaultSession.clearStorageData()
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, assets.appIcon),
    show: false
  })
  win.loadURL(spotify.getAuthUrl())
  win.setMenu(null)
  // called when authentication process is over (success, error or window closed)
  let closing = false
  const authClosed = function (success = false) {
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
  win.once('closed', function () {
    closing = true
    authClosed(false)
    onClosed()
  })
  return win
}

function showSettingsWindow () {
  if (settingsWindow === null) {
    settingsWindow = createSettingsWindow(() => { settingsWindow = null }) // Dereference the window object
  } else if (settingsWindow.isMinimized()){
    settingsWindow.restore()
  }
  settingsWindow.focus()
}

function showAuthWindow() {
  if (authWindow === null) {
    authWindow = createAuthWindow(() => { authWindow = null }) // Dereference the window object
  } else if (authWindow.isMinimized()){
    authWindow.restore()
  }
  authWindow.focus()
}

function createTrayMenu () {
  // this randomly fails to resolve the path
  // createFromPath makes sure it turns into an empty image instead of throwing an exception
  let tray = new Tray(nativeImage.createFromPath(path.join(__dirname, assets.trayIcon)))
  tray.setToolTip(app.getName())
  const contextMenu = Menu.buildFromTemplate([
    {label: 'Settings', type: 'normal', click: showSettingsWindow},
    {type: 'separator'},
    {label: 'Close', type: 'normal', click: app.quit}
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', showSettingsWindow)
  return tray
}

// Only allow one instance of the app
// returns true if another instance is already running
function setSingleInstance() {
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  if(setSingleInstance())
    return
  tray = createTrayMenu()
  // Register global shortcut listener
  hotkey = new Hotkey('F10', 'CommandOrControl', onHotkey)
  if (!hotkey.register()) {
    console.error('Shortcut registration failed: ' + hotkey.accelerator)
  }
  initialLogin()
})

// OSX
app.on('activate', showSettingsWindow)

// Subscribe to override default behavior of quitting
app.on('window-all-closed', () => { })
