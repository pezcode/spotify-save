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

You will need a Spotify App to interact with the web API. Go to the [Spotify Developer website](https://developer.spotify.com/my-applications/) and create a new app.

Rename _config.json.template_ to _config.json_, open it with a text editor and replace `clientId` and `clientSecret` with the values shown for your Spotify App.
**Don't share these values with other people!**

You also need to add a redirect URI to your app. It has to match the local callback URL, by default it's `http://localhost:8888/spotify-auth`. You can change the port and path in _config.json_, but make sure you add the correct URI to your app.

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
