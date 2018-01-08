'use strict'

const is = require('electron-is')

// Application icons
// Let Windows pick appropriate sizes from .ico
exports.appIcon = 'assets/icons/' + (is.windows() ? 'win/icon.ico' : 'png/1024x1024.png')
exports.trayIcon = 'assets/icons/' + (is.windows() ? 'win/icon.ico' : 'png/64x64.png')
