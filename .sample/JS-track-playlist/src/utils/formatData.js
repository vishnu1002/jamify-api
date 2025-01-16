/**
 * Format Spotify and YouTube data into the desired JSON structure.
 * @param {object} spotifyData - Raw Spotify metadata.
 * @param {Array} youtubeResults - Raw YouTube search results.
 * @param {Array} audioStreams - Raw YouTube audio stream details.
 * @returns {object} - Formatted JSON data.
 */
function formatData(spotifyData, youtubeResults, audioStreams) {
    if (spotifyData.type === 'track') {
      return {
        type: 'track',
        data: {
          title: spotifyData.data.title,
          artist: spotifyData.data.artist,
          date: spotifyData.data.date,
          image: spotifyData.data.image,
          youtube: {
            id: youtubeResults.id,
            title: youtubeResults.title,
            duration: youtubeResults.duration,
            views: youtubeResults.views,
            stream: {
              mimeType: audioStreams.mimeType,
              url: audioStreams.streamUrl,
            },
          },
        },
      };
    } else if (spotifyData.type === 'playlist') {
      return {
        type: 'playlist',
        data: {
          title: spotifyData.data.title,
          description: spotifyData.data.description || '',
          image: spotifyData.data.image,
          link: spotifyData.data.link,
          tracks: spotifyData.data.tracks.map((track, index) => ({
            title: track.title,
            artist: track.artist,
            date: track.date,
            image: track.image,
            youtube: {
              id: youtubeResults[index].id,
              title: youtubeResults[index].title,
              duration: youtubeResults[index].duration,
              views: youtubeResults[index].views,
              stream: {
                mimeType: audioStreams[index].mimeType,
                url: audioStreams[index].streamUrl,
              },
            },
          })),
        },
      };
    }
  }
  
  module.exports = formatData;