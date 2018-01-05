const {app, Menu, Tray, nativeImage, globalShortcut, BrowserWindow, ipcMain} = require('electron')
const assets = require('./assets.js')

const path = require('path')
const url = require('url')

// Keep a global reference of the window objects, if you don't, the windows will
// be closed automatically when the JavaScript object is garbage collected.
let settingsWindow = null
let trayMenu = null

let data = {}

function settingsChanged () {
  settingsWindow.webContents.send('settings', data)
}

ipcMain.on('settings', function(event, settings) {
  data = settings
})

ipcMain.on('login', function(event) {
  data.loggedIn = true
  settingsChanged()
})

ipcMain.on('logout', function(event) {
  data.loggedIn = false
  settingsChanged()
})

function createSettingsWindow (onClosed) {
  // Create the browser window.
  var win = new BrowserWindow({
    width: 800,
    height: 600,
    title: app.getName(),
    icon: path.join(__dirname, assets.appIcon), // taskbar and handle icon
    show: false
  })
  win.once('ready-to-show', win.show)
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
  // Dereference the window object
  win.on('closed', onClosed)
  win.once('did-finish-load', settingsChanged)
  return win
}

function showSettings () {
  if (settingsWindow === null) {
    settingsWindow = createSettingsWindow(() => { settingsWindow = null })
  }
}

function createTrayMenu () {
  // this randomly fails to resolve the path
  // createFromPath makes sure it turns into an empty image instead of throwing an exception
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, assets.trayIcon)))
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
app.on('ready', function() {
  trayMenu = createTrayMenu()
  // Register global shortcut listener
  const accelerator = 'CommandOrControl+F10'
  const ret = globalShortcut.register(accelerator, () => { console.log('Shortcut pressed: ' + accelerator) })
  if (!ret) {
    console.error('Shortcut registration failed: ' + accelerator)
  }
})

// OSX
app.on('activate', showSettings)

// Subscribe to override default behavior of quitting
app.on('window-all-closed', () => { })
