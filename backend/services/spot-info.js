const fetch = require('isomorphic-unfetch');
const { getDetails, getPreview } = require('spotify-url-info')(fetch);

/**
 * Fetch track details from Spotify.
 * @param {string} trackUri - Spotify track URI.
 * @returns {Promise<object|null>} - Track details or null if failed.
 */
async function fetchTrackDetails(trackUri) {
  try {
    const trackDetails = await getPreview(trackUri);
    return {
      title: trackDetails.title,
      artist: trackDetails.artist,
      date: trackDetails.date,
      image: trackDetails.image,
      link: trackDetails.link,
    };
  } catch (error) {
    console.error(`Error fetching track details for ${trackUri}:`, error);
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
    const details = await getDetails(spotifyURL);

    switch (details.preview.type) {
      case 'track': {
        const trackDetails = await fetchTrackDetails(spotifyURL);
        return {
          type: 'track',
          data: trackDetails,
        };
      }
      case 'playlist': {
        const tracksInfo = await Promise.all(
          details.tracks.map((track) => fetchTrackDetails(track.uri))
        );
        const filteredTracksInfo = tracksInfo.filter((track) => track !== null);

        return {
          type: 'playlist',
          data: {
            title: details.preview.title,
            description: details.preview.description,
            image: details.preview.image,
            link: details.preview.link,
            tracks: filteredTracksInfo,
          },
        };
      }
      default:
        throw new Error('Unsupported Spotify URL type');
    }
  } catch (error) {
    console.error('Error fetching Spotify data:', error);
    throw error;
  }
}

module.exports = getSpotifyInfo;