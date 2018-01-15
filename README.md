# spotify-save

A simple [Electron](https://electronjs.org/) app that runs in the background and saves the currently running song on Spotify to a playlist after the user pressed a hotkey.

## Installation

You can find binaries and setup files for Windows and Linux in the [Github release section](https://github.com/pezcode/spotify-save/releases/).

**You will still need to configure the app with your Spotify key**. See *Configuration* below.

## From source

If you wish to use the source to build and run the app yourself:

You'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org) installed on your computer. From your command line:
```bash
# Clone this repository
git clone https://github.com/pezcode/spotify-save.git
# Go into the repository
cd spotify-save
# Install dependencies
npm install
```
#### Usage

To run the app simply:
```bash
# Run the app
npm start
```

#### Distribution

To package binaries and installers from source, run the build script which uses [electron-builder](https://www.electron.build/):

```bash
# Package the app
npm run build
```

**Note:** Unless you're on MacOS, this will give you an error since building MacOS targets on a non-MacOS host is not possible.
In that case, run `build` for your desired target OS:
```bash
# Windows
npm run build:win32
# Linux
npm run build:linux
# MacOS
npm run build:darwin
```

Built binaries can be found in the *dist* folder.

## Configuration

You will need a Spotify App to interact with the web API. Go to the [Spotify Developer website](https://developer.spotify.com/my-applications/) and create a new app.

Rename _config.json.template_ to _config.json_, open it with a text editor and replace `clientId` and `clientSecret` with the values shown for your Spotify App.
**Don't share these values with other people!**

You also need to add a redirect URI to your app. It has to match the local callback URL, by default it's `http://localhost:8888/spotify-auth`. You can change the port and path in _config.json_, but make sure you add the correct URI to your app.



## License

[MIT](LICENSE)
