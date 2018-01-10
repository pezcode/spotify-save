'use strict'

const path = require('path')
const is = require('electron-is')

const assetPath = 'assets/'
const iconPath = assetPath + 'icons/'

const app = {
  image: {
    source: path.join(__dirname, iconPath + 'png/1024x1024.png'),
    small: path.join(__dirname, iconPath + 'png/16x16.png'),
    medium: path.join(__dirname, iconPath + 'png/64x64.png'),
    large: path.join(__dirname, iconPath + 'png/256x256.png')
  },
  icon: {
    // Application icons
    // Let Windows pick appropriate sizes from .ico
    windows: path.join(__dirname, iconPath + 'win/icon.ico'),
    source: null, // defined further below
    tray: null
  }
}

if (is.windows()) {
  app.icon.source = app.icon.windows
  app.icon.tray = app.icon.windows
} else {
  app.icon.source = app.image.source
  app.icon.tray = app.image.medium
}

exports.app = app
