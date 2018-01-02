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

If you wish to package the app into its own binary you can run the build script which uses [Electron Packager](https://www.npmjs.com/package/electron-packager):

```bash
# Package the app
npm run build
```

You will find the binaries for your current host environment in the bin folder.

## License

[MIT](LICENSE)
