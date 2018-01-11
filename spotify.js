'use strict'

const SpotifyWebApi = require('spotify-web-api-node')
const http = require('http')
const url = require('url')
const randomstring = require('randomstring')

const config = require('./config.json')

const uri = 'http://localhost:' + config.callbackPort + config.callbackPath
// https://developer.spotify.com/web-api/using-scopes/
const scopes = ['user-read-currently-playing', 'user-library-modify', 'playlist-read-private', 'playlist-modify-public', 'playlist-modify-private']
const state = randomstring.generate()

let spotifyApi = new SpotifyWebApi({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: uri
})

let authCallback = () => { }
let authTokens = { }

// exceptions
class NoAuthError extends Error { }
class NoCurrentSongError extends Error { }
exports.NoAuthError = NoAuthError
exports.NoCurrentSongError = NoCurrentSongError

// playlist id of 'Your Music'
const savedTracksId = '0'
exports.savedTracksId = savedTracksId

// this server listens to requests on the redirect URI registered with Spotify when logging in
// it gives us an auth code we can pass to spotifyApi to get the tokens needed to access data
function startAuthServer (port, path) {
  console.log('Starting auth callback server at' + uri)
  let server = http.createServer((req, res) => {
    if (req.method === 'GET') {
      const parsed = new url.URL(req.url, 'http://localhost:' + port)
      if (parsed.pathname === path) {
        if (parsed.searchParams.get('state') === state) {
          if (parsed.searchParams.has('code')) {
            onAuthCode(parsed.searchParams.get('code'))
            // call authcallback later, so auth data is available
          } else if (parsed.searchParams.has('error')) {
            console.error(parsed.searchParams.get('error'))
            authCallback(false)
          }
        }
      }
    }
    res.writeHead(200, {'Content-Type': 'text/plain'})
    res.end()
  })
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error('Port ' + port + ' already in use')
    }
    console.error('Failed to start server')
  })
  server.listen(port)
  return server
}

function onAuthCode (code) {
  spotifyApi.authorizationCodeGrant(code)
    .then(data => {
      onAuthData(data.body)
      authCallback(true)
    })
    .catch(err => {
      console.error('Failed to authorize with code!', err)
    })
}

function onAuthData (data) {
  authTokens.expiresOn = Date.now() + (data.expires_in * 1000)
  setTimeout(refreshAuthData, data.expires_in * 1000)
  if ('refresh_token' in data) {
    authTokens.refreshToken = data.refresh_token
    spotifyApi.setRefreshToken(authTokens.refreshToken)
  }
  authTokens.accessToken = data.access_token
  spotifyApi.setAccessToken(authTokens.accessToken)
}

function refreshAuthData () {
  console.log('Attempting to refresh auth token')
  return spotifyApi.refreshAccessToken()
    .then(data => {
      onAuthData(data.body)
      return authTokens.expiresOn
    })
}

exports.init = function () {
  startAuthServer(config.callbackPort, config.callbackPath)
}

exports.setAuthCallback = function (callback) {
  authCallback = callback
}

exports.getAuthData = function () {
  return authTokens
}

exports.setAuthData = function (newTokens) {
  authTokens = newTokens
}

exports.getAuthUrl = function () {
  // let user login and grant scope privileges
  return spotifyApi.createAuthorizeURL(scopes, state)
}

exports.login = function () {
  if (!('accessToken' in authTokens && 'refreshToken' in authTokens)) {
    return Promise.reject(new NoAuthError('No auth data. Log in and grant auth code'))
  }
  spotifyApi.setAccessToken(authTokens.accessToken)
  spotifyApi.setRefreshToken(authTokens.refreshToken)
  // if the access token expired, get a new one
  if (!('expiresOn' in authTokens) || authTokens.expiresOn < Date.now()) {
    console.log('Auth token expired, requesting new one')
    return refreshAuthData()
  } else {
    console.log('Auth token still valid until ' + (new Date(authTokens.expiresOn)).toLocaleString())
    return Promise.resolve(authTokens.expiresOn)
  }
}

exports.logout = function () {
  spotifyApi.setAccessToken(null)
  spotifyApi.setRefreshToken(null)
  authTokens = { }
}

exports.getUser = function () {
  return spotifyApi.getMe()
    .then(data => {
      const user = data.body
      return {
        // displayname for facebook accounts (id is a number in that case)
        // id for accounts with email-login (displayname is null)
        name: user.displayname || user.id,
        image: user.images.length > 0 ? user.images[0].url : null
      }
    })
}

exports.getCurrentSong = function () {
  return spotifyApi.getMyCurrentPlayingTrack()
    .then(data => {
      if (!('item' in data.body)) {
        throw new NoCurrentSongError()
      }
      const song = data.body.item
      const album = song.album
      return {
        playing: data.body.is_playing,
        id: song.id,
        title: song.name,
        artist: song.artists[0].name,
        album: album.name,
        image: album.images.length > 0 ? album.images[0].url : null
      }
    })
}

function getPlaylistsRecursive (playlists, offset) {
  // go with default limit
  return spotifyApi.getUserPlaylists(null, {offset: offset})
    .then(data => {
      // only extract id and name from new playlist objects
      const newlist = playlists.concat(data.body.items.map(pl => ({id: pl.id, name: pl.name})))
      const newoffset = data.body.offset + data.body.items.length
      if (newoffset < data.body.total) { // more items to get
        return getPlaylistsRecursive(newlist, newoffset)
      } else {
        return newlist
      }
    })
}

exports.getPlaylists = function () {
  return getPlaylistsRecursive([], 0)
}

exports.saveSong = function (song, playlist) {
  if (playlist === savedTracksId) {
    return spotifyApi.addToMySavedTracks([ song ])
  } else {
    return spotifyApi.addTracksToPlaylist(null, playlist, [ song ])
  }
}
