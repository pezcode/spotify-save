'use strict'

const SpotifyWebApi = require('spotify-web-api-node')
const http = require('http')
const url = require('url')
const fs = require('fs')
const randomstring = require('randomstring')
const config = require('./config.json')

let authState = null
let authTokens = {}

const uri = 'http://localhost:' + config.callbackPort + config.callbackPath

// https://developer.spotify.com/web-api/using-scopes/
const scopes = ['user-read-currently-playing', 'user-library-modify', 'playlist-read-private', 'playlist-modify-public', 'playlist-modify-private']
const spotifyApi = new SpotifyWebApi({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: uri
})

let authCallback = () => { }

startServer()
// when do we start/close this?

// this server listens to requests on the redirect URI registered with Spotify when logging in
// it gives us an auth code we can pass to spotifyApi to get the tokens needed to access data
function startServer () {
  let server = http.createServer(function (request, response) {
    let status = 200
    if (request.method === 'GET') {
      const parsed = new url.URL(request.url, 'http://localhost:' + config.callbackPort)
      if (parsed.pathname === config.callbackPath) {
        if (parsed.searchParams.get('state') === authState) {
          if (parsed.searchParams.has('code')) {
            onAuthCode(parsed.searchParams.get('code'))
          } else if (parsed.searchParams.has('error')) {
            console.error(parsed.searchParams.get('error'))
          }
          authCallback() // call it here to also catch errors
        }
      }
    }
    // setTimeout(() => { server.close() }, 15000)
    response.writeHead(status, {'Content-Type': 'text/plain'})
    response.end()
  })
  server.listen(config.callbackPort)
  return server
}

function onAuthCode (code) {
  spotifyApi.authorizationCodeGrant(code)
    .then(function (data) {
      onAuthData(data.body)
      saveTokens()
    })
    .catch(function (err) {
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
  return spotifyApi.refreshAccessToken()
    .then(function (data) {
      onAuthData(data.body)
      saveTokens()
      return authTokens.expiresOn
    })
}

function readTokens () {
  try {
    authTokens = JSON.parse(fs.readFileSync('./auth.json', 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') {
      // console.log('No auth file found')
    } else {
      console.error('Failed to read auth file')
    }
    authTokens = { }
  }
}

function saveTokens () {
  fs.writeFile('./auth.json', JSON.stringify(authTokens, null, 2), 'utf-8', function (err) {
    if (err) {
      console.error('Failed to write auth file!', err)
    }
  })
}

exports.setAuthCallback = function (callback) {
  authCallback = callback
}

exports.getAuthUrl = function () {
  // let user login and grant scope privileges
  if (authState === null) {
    authState = randomstring.generate() // very basic security =D
  }
  return spotifyApi.createAuthorizeURL(scopes, authState)
}

exports.loggedIn = function () {
  return (spotifyApi.getAccessToken() != null)
}

class NoAuthError extends Error { }

exports.NoAuthError = NoAuthError
exports.WebApiError = spotifyApi.WebApiError

exports.login = function () {
  readTokens()
  if (!('accessToken' in authTokens)) {
    return Promise.reject(new NoAuthError('No auth data. Log in and grant auth code'))
  }
  spotifyApi.setAccessToken(authTokens.accessToken)
  spotifyApi.setRefreshToken(authTokens.refreshToken)
  console.log('Auth token expires at ' + (new Date(authTokens.expiresOn)).toLocaleString())
  // if the access token expired, get a new one
  if (authTokens.expiresOn < Date.now()) {
    console.log('Auth token expired, requesting new one')
    return refreshAuthData()
  } else {
    console.log('Using existing auth token')
    return Promise.resolve(authTokens.expiresOn)
  }
}

exports.logout = function () {
  spotifyApi.setAccessToken(null)
  spotifyApi.setRefreshToken(null)
  authTokens = { }
  saveTokens()
}

exports.getUser = function () {
  return spotifyApi.getMe()
    .then(function (data) {
      // displayname for facebook accounts (id is a number in that case)
      // id for accounts with email-login (displayname is null)
      const user = {
        name: data.body.displayname || data.body.id,
        image: data.body.images.length > 0 ? data.body.images[0].url : null
      }
      return user
    })
}

exports.getCurrentSong = function (callback) {
  return spotifyApi.getMyCurrentPlayingTrack()
    .then(function (data) {
      const song = {
        id: data.item.id,
        title: data.item.name,
        artist: data.item.artists[0].name,
        album: data.item.album.name,
        image: data.item.album.images.length > 0 ? data.item.album.images[0].url : null
      }
      return song
    })
}

function getPlaylistsRecursive (playlists, offset) {
  // go with default limit
  return spotifyApi.getUserPlaylists(null, {offset: offset})
    .then(function (data) {
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

}
