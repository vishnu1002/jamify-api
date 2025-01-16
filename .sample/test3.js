// spotify.js
require('dotenv').config();
const SpotifyWebApi = require('spotify-web-api-node');

// Initialize the Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// Function to get song details
async function getTrackDetails(trackUrl) {
  const trackId = trackUrl.split('/').pop().split('?')[0];
  const trackData = await spotifyApi.getTrack(trackId);
  const track = trackData.body;

  console.log(`Song Name: ${track.name}`);
  console.log(`Artists: ${track.artists.map(artist => artist.name).join(', ')}`);
  console.log(`Duration: ${track.duration_ms / 1000} seconds`);
  console.log(`Genres: ${track.album.genres.join(', ')}`);
}

// Function to get playlist details
async function getPlaylistDetails(playlistUrl) {
  const playlistId = playlistUrl.split('/').pop().split('?')[0];
  const playlistData = await spotifyApi.getPlaylist(playlistId);
  const playlist = playlistData.body;

  console.log(`Playlist Name: ${playlist.name}`);
  playlist.tracks.items.forEach((item, index) => {
    const track = item.track;
    console.log(`${index + 1}. Song Name: ${track.name}`);
    console.log(`   Artists: ${track.artists.map(artist => artist.name).join(', ')}`);
    console.log(`   Duration: ${track.duration_ms / 1000} seconds`);
    console.log(`   Genres: ${track.album.genres.join(', ')}`);
  });
}

// Function to handle the input URL
async function handleUrl(url) {
  if (url.includes('track')) {
    await getTrackDetails(url);
  } else if (url.includes('playlist')) {
    await getPlaylistDetails(url);
  } else {
    console.log('Invalid URL');
  }
}

// Authenticate and handle the URL
async function main() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);

    const url = process.argv[2];
    if (!url) {
      console.log('Please provide a Spotify URL');
      return;
    }

    await handleUrl(url);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();