'use strict'

const { globalShortcut } = require('electron')
const assert = require('assert')

class Hotkey {
  constructor (key, mods, callback) {
    if (!Array.isArray(mods)) {
      mods = [mods]
    }
    if (!Hotkey.isValidKey(key)) {
      throw new Error('Invalid key')
    }
    for (const mod of mods) {
      if (!Hotkey.isValidModifier(mod)) {
        throw new Error('Invalid modifier')
      }
    }
    this.key = key
    this.mods = mods
    this.accelerator = mods.join('+') + '+' + key
    this.callback = callback
  }

  register (force = false) {
    if (force || !this.registered) {
      this.registered = globalShortcut.register(this.accelerator, this.callback)
    }
    return this.registered
  }

  unregister (force = false) {
    if (force || this.registered) {
      globalShortcut.unregister(this.accelerator)
    }
  }

  static isValidKey (key) {
    return (Hotkey.keys.find(x => x.id === key) !== undefined)
  }

  static isValidModifier (mod) {
    return (Hotkey.modifiers.find(x => x.id === mod) !== undefined)
  }
}

// https://github.com/electron/electron/blob/master/docs/api/accelerator.md

Hotkey.modifierIds = [
  'CommandOrControl',
  'Shift',
  'Alt'
]

Hotkey.modifierNames = [
  (process.platform === 'darwin') ? 'Command' : 'Control',
  'Shift',
  'Alt'
]

Hotkey.keyIds = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
  'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', ':', '+', '<', '_', '>', '?', '~', '{', '|', '}', '"',
  ';', '=', ',', '\\', '-', '.', '/', '`', '[', ']',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24',
  'Plus', 'Space', 'Tab', 'Backspace', 'Delete', 'Insert', 'Enter',
  'Up', 'Down', 'Left', 'Right',
  'Home', 'End', 'PageUp', 'PageDown',
  'PrintScreen',
  'Escape',
  'VolumeUp', 'VolumeDown', 'VolumeMute',
  'MediaNextTrack', 'MediaPreviousTrack', 'MediaStop', 'MediaPlayPause'
]

Hotkey.keyNames = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
  'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', ':', '+', '<', '_', '>', '?', '~', '{', '|', '}', '"',
  ';', '=', ',', '\\', '-', '.', '/', '`', '[', ']',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24',
  'Plus', 'Space', 'Tab', 'Backspace', 'Delete', 'Insert', 'Enter',
  'Up', 'Down', 'Left', 'Right',
  'Home', 'End', 'Page Up', 'Page Down',
  'Print Screen',
  'Escape',
  'Volume Up', 'Volume Down', 'Mute',
  'Next Track', 'Previous Track', 'Stop', 'Play/Pause'
]

assert.strictEqual(Hotkey.modifierIds.length, Hotkey.modifierNames.length)
assert.strictEqual(Hotkey.keyIds.length, Hotkey.keyNames.length)

Hotkey.modifiers = Hotkey.modifierIds.map((v, i) => ({ id: v, name: Hotkey.modifierNames[i] }))
Hotkey.keys = Hotkey.keyIds.map((v, i) => ({ id: v, name: Hotkey.keyNames[i] }))

module.exports = Hotkey
