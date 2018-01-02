# spotify-save

A simple [Electron](https://electronjs.org/) app that runs in the background and saves the currently running song on Spotify to a playlist after the user pressed a hotkey.

## Installation

You'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/pezcode/spotify-save.git
# Go into the repository
cd spotify-save
# Install dependencies
npm install
```

## Usage

To run the app simply:

```bash
# Run the app
npm start
```

## Distribution

If you wish to package the app into its own binary you can follow the [Electron distribution guide](https://electronjs.org/docs/tutorial/application-distribution) or automate it using e.g. [Electron Packager](https://www.npmjs.com/package/electron-packager):

```bash
# Install Electron Packager globally
npm install electron-packager -g
# Package the app to bin for the current host environment
electron-packager . --out=bin
```

## License

[MIT](LICENSE)
