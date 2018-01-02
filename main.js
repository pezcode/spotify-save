const {app, Menu, Tray, globalShortcut, BrowserWindow} = require('electron')

const path = require('path')
const url = require('url')

// Keep a global reference of the window objects, if you don't, the windows will
// be closed automatically when the JavaScript object is garbage collected.
let settingsWindow = null
let tray = null

// Application icons
// Let Windows pick appropriate sizes from .ico
let appIcon  = 'assets/icons/' + process.platform === 'win32' ? 'win/icon.ico' : 'png/1024x1024.png';
let trayIcon = 'assets/icons/' + process.platform === 'win32' ? 'win/icon.ico' : 'png/64x64.png';

function createSettingsWindow (onClosed) {
  // Create the browser window.
  var win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'assets/icons/win/icon.ico') // taskbar and handle icon
  })
  // and load the html of the window.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'app/settings/index.html'),
    protocol: 'file:',
    slashes: true
  }))
  // Don't show an application menu
  win.setMenu(null)
  // Dereference the window object
  win.on('closed', onClosed)
  return win
}

function onShowSettings () {
  if (settingsWindow === null) {
    settingsWindow = createSettingsWindow(() => { settingsWindow = null })
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
  tray = new Tray(path.join(__dirname, 'assets/icons/win/icon.ico'))
  tray.setToolTip('spotify-save')
  const contextMenu = Menu.buildFromTemplate([
    {label: 'Settings', type: 'normal', click: onShowSettings},
    {type: 'separator'},
    {label: 'Close', type: 'normal', click: app.quit}
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', onShowSettings)
  // Register global shortcut listener
  const accelerator = 'CommandOrControl+F10'
  const ret = globalShortcut.register(accelerator, () => { console.log('Shortcut pressed: ' + accelerator) })
  if (!ret) {
    console.error('Shortcut registration failed: ' + accelerator)
  }
})

// OSX
app.on('activate', onShowSettings)

// Subscribe to override default behavior of quitting
app.on('window-all-closed', () => { })
