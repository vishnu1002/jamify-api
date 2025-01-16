const fetch = require('isomorphic-unfetch');
const { getPreview } = require('spotify-url-info')(fetch);

async function fetchSpotifyTrackPreview(url) {
  try {
    const data = await getPreview(url, {
      headers: {
        'user-agent': 'googlebot',
      },
    });
    return data; // Return the Spotify track data
  } catch (error) {
    console.error('Error fetching Spotify track preview:', error);
    return null;
  }
}



module.exports = { fetchSpotifyTrackPreview };
