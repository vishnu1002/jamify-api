const fetch = require('isomorphic-unfetch');
const { getDetails, getPreview } = require('spotify-url-info')(fetch);

async function getSpotifyInfo(spotifyURL) {
  try {
    const details = await getDetails(spotifyURL);

    if (details.preview.type === 'track') {
      const trackDetails = await getPreview(spotifyURL);
      return {
        type: 'track',
        data: {
          title: trackDetails.title,
          artist: trackDetails.artist,
          date: trackDetails.date,
          image: trackDetails.image,
          link: trackDetails.link,
        },
      };
    } else if (details.preview.type === 'playlist') {
      const tracksInfo = await Promise.all(
        details.tracks.map(async (track) => {
          try {
            const trackDetails = await getPreview(track.uri);
            return {
              title: track.name,
              artist: track.artist,
              date: trackDetails.date,
              image: trackDetails.image,
              link: trackDetails.link,
            };
          } catch (error) {
            console.error(`Error fetching track details for ${track.uri}:`, error);
            return null;
          }
        })
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
    } else {
      throw new Error('Unsupported Spotify URL type');
    }
  } catch (error) {
    console.error('Error fetching Spotify data:', error);
    throw error;
  }
}

module.exports = getSpotifyInfo;