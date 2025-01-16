const SpotifyWebApi = require('spotify-web-api-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});

/**
 * Authenticate with Spotify and get an access token.
 */
async function authenticate() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body.access_token);
  } catch (error) {
    console.error('Error authenticating with Spotify:', error);
    throw error;
  }
}

/**
 * Fetch track details from Spotify.
 * @param {string} trackId - Spotify track ID.
 * @returns {Promise<object|null>} - Track details or null if failed.
 */
async function fetchTrackDetails(trackId) {
  try {
    const trackData = await spotifyApi.getTrack(trackId);
    return {
      title: trackData.body.name,
      artist: trackData.body.artists.map((artist) => artist.name).join(', '),
      date: trackData.body.album.release_date,
      image: trackData.body.album.images[0].url,
      link: trackData.body.external_urls.spotify,
    };
  } catch (error) {
    console.error(`Error fetching track details for ${trackId}:`, error);
    return null;
  }
}

/**
 * Fetch Spotify metadata for a track or playlist.
 * @param {string} spotifyURL - Spotify URL.
 * @returns {Promise<object>} - Spotify metadata.
 */
async function getSpotifyInfo(spotifyURL) {
  try {
    // Authenticate with Spotify
    await authenticate();

    // Extract ID from URL
    const id = spotifyURL.split('/').pop().split('?')[0];

    if (spotifyURL.includes('track')) {
      // Fetch track details
      const trackDetails = await fetchTrackDetails(id);
      if (!trackDetails) {
        throw new Error('Failed to fetch track details');
      }
      return {
        type: 'track',
        data: trackDetails,
      };
    } else if (spotifyURL.includes('playlist')) {
      // Fetch playlist details
      const playlistData = await spotifyApi.getPlaylist(id);
      const tracksInfo = await Promise.all(
        playlistData.body.tracks.items.map((item) =>
          fetchTrackDetails(item.track.id)
        )
      );
      const filteredTracksInfo = tracksInfo.filter((track) => track !== null);

      if (filteredTracksInfo.length === 0) {
        throw new Error('No valid tracks found in the playlist');
      }

      return {
        type: 'playlist',
        data: {
          title: playlistData.body.name,
          description: playlistData.body.description,
          image: playlistData.body.images[0].url,
          link: playlistData.body.external_urls.spotify,
          tracks: filteredTracksInfo,
        },
      };
    } else {
      throw new Error('Unsupported Spotify URL type');
    }
  } catch (error) {
    console.error('Error fetching Spotify data:', error);
    throw error;
  }
}

module.exports = getSpotifyInfo;