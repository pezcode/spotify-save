// Application icons
// Let Windows pick appropriate sizes from .ico
exports.appIcon  = 'assets/icons/' + (process.platform === 'win32' ? 'win/icon.ico' : 'png/1024x1024.png')
exports.trayIcon = 'assets/icons/' + (process.platform === 'win32' ? 'win/icon.ico' : 'png/64x64.png')
