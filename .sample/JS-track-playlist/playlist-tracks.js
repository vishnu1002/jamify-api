const fetch = require('isomorphic-unfetch');
const { getDetails, getPreview } = require('spotify-url-info')(fetch);
const { searchYouTube, searchYouTubeForPlaylist } = require('./yt-search');

async function getSpotifyInfo(spotifyURL) {
  try {
    // Step 1: Get details using getDetails
    const details = await getDetails(spotifyURL);

    // Step 2: Check if the URL is for a track or playlist
    if (details.preview.type === 'track') {
      // For track URLs
      const trackDetails = await getPreview(spotifyURL);
      const youtubeResult = await searchYouTube(`${trackDetails.title} ${trackDetails.artist}`);

      if (youtubeResult) {
        console.dir({
          spotify: {
            title: trackDetails.title,
            artist: trackDetails.artist,
            date: trackDetails.date,
            image: trackDetails.image,
            link: trackDetails.link,
          },
          youtube: youtubeResult,
        }, { depth: null, colors: true });
      } else {
        console.log('No YouTube results found for the track.');
      }
    } else if (details.preview.type === 'playlist') {
      // For playlist URLs
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
            return null; // Skip problematic tracks
          }
        })
      );

      // Filter out null values (skipped tracks)
      const filteredTracksInfo = tracksInfo.filter((track) => track !== null);

      // Search YouTube for each track in the playlist
      const youtubeResults = await searchYouTubeForPlaylist(filteredTracksInfo);

      console.dir({
        playlist: {
          title: details.preview.title,
          description: details.preview.description,
          image: details.preview.image,
          link: details.preview.link,
        },
        tracks: youtubeResults,
      }, { depth: null, colors: true });
    } else {
      throw new Error('Unsupported Spotify URL type');
    }
  } catch (error) {
    console.error('Error fetching Spotify data:', error);
    throw error;
  }
}

// Example usage
const spotifyURL = 'https://open.spotify.com/playlist/0dvrubvw5wnorsoI3v5jwp?si=e7f2f4f367694913';

getSpotifyInfo(spotifyURL);