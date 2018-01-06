'use strict'

const {app, Menu, Tray, nativeImage, globalShortcut, BrowserWindow, ipcMain, session} = require('electron')
const assets = require('./assets.js')
const spotify = require('./spotify.js')

const path = require('path')
const url = require('url')

// Keep a global reference of the window objects, if you don't, the windows will
// be closed automatically when the JavaScript object is garbage collected.
let settingsWindow = null

let data = {
  loggedIn: false,
  user: null,
  saveToLibrary: false,
  selectedPlaylist: -1,
  playlists: []
}

function settingsChanged () {
  if (settingsWindow) {
    settingsWindow.webContents.send('settings', data)
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
      data.loggedIn = true
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
        createAuthWindow()
      } else {
        console.error('Failed to log in and read user data!', err)
        error()
      }
    })
}

function logout () {
  // should probably move this out to a seperate store module
  spotify.logout()
  data.loggedIn = false
  data.user = null
  data.selectedPlaylist = -1
  data.playlists = []
  settingsChanged()
  // clear cookies so auth URL requires login  data
  session.defaultSession.clearStorageData()
  console.log('Logged out')
}

ipcMain.on('settings', function (event, settings) {
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

function createSettingsWindow (onClosed) {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    title: app.getName(),
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
  // win.setMenu(null)
  win.once('ready-to-show', () => { win.show(); settingsChanged() })
  win.once('closed', onClosed)
  return win
}

function createAuthWindow () {
  let authWin = new BrowserWindow({
    width: 800,
    height: 600,
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
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  createTrayMenu()
  // Register global shortcut listener
  const accelerator = 'CommandOrControl+F10'
  const ret = globalShortcut.register(accelerator, () => { console.log('Current song: ' + spotify.getCurrentSong()) })
  if (!ret) {
    console.error('Shortcut registration failed: ' + accelerator)
  }

  login(() => { }, () => { })
})

app.on('quit', function () {
  // Clear all storages (cookies, cache, etc)
  session.defaultSession.clearStorageData()
})

// OSX
app.on('activate', showSettings)

// Subscribe to override default behavior of quitting
app.on('window-all-closed', () => { })
