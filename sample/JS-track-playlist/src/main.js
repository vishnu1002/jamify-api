const getSpotifyInfo = require('./services/spot-info');
const { searchYouTube, searchYouTubeForTracks } = require('./services/yt-search');
const { fetchYouTubeAudioStreams } = require('./services/yt-info');

/**
 * Print Spotify metadata.
 * @param {object} spotifyData - Spotify metadata.
 */
function printSpotifyMetadata(spotifyData) {
  console.log('Spotify Metadata:');
  console.log(JSON.stringify(spotifyData, null, 2));
}

/**
 * Print YouTube metadata.
 * @param {Array<object>|object} youtubeResults - YouTube results for all tracks or a single track.
 */
function printYouTubeMetadata(youtubeResults) {
  console.log('YouTube Metadata:');
  if (Array.isArray(youtubeResults)) {
    const youtubeOnlyMetadata = youtubeResults.map((result) => ({
      youtube: result.youtube,
    }));
    console.log(JSON.stringify(youtubeOnlyMetadata, null, 2));
  } else {
    console.log(JSON.stringify({ youtube: youtubeResults }, null, 2));
  }
}

/**
 * Print video ID and stream URL.
 * @param {string} videoId - YouTube video ID.
 * @param {string} audioUrl - YouTube audio stream URL.
 */
function printStreamInfo(videoId, audioUrl) {
  console.log(`Video ID: ${videoId}`);
  console.log(`Stream URL: ${audioUrl}`);
}

async function main(spotifyURL) {
  try {
    // Step 1: Fetch Spotify metadata
    console.log('Fetching Spotify metadata...');
    const spotifyData = await getSpotifyInfo(spotifyURL);
    printSpotifyMetadata(spotifyData);

    // Step 2: Search YouTube for the corresponding videos
    let youtubeResults;
    if (spotifyData.type === 'track') {
      console.log('Searching YouTube for the track...');
      const query = `${spotifyData.data.title} ${spotifyData.data.artist}`;
      youtubeResults = await searchYouTube(query);
    } else if (spotifyData.type === 'playlist') {
      console.log('Searching YouTube for playlist tracks...');
      youtubeResults = await searchYouTubeForTracks(spotifyData.data.tracks);
    }

    // Step 3: Print YouTube metadata (only YouTube data)
    printYouTubeMetadata(youtubeResults);

    // Step 4: Fetch and print video IDs and stream URLs
    console.log('\nFetching audio streams...');
    if (spotifyData.type === 'track') {
      // Single track
      const videoId = youtubeResults.id;
      const audioUrl = await fetchYouTubeAudioStreams([videoId]);
      if (audioUrl[videoId]) {
        printStreamInfo(videoId, audioUrl[videoId]);
      } else {
        console.log(`Video ID: ${videoId} - No stream URL found`);
      }
    } else if (spotifyData.type === 'playlist') {
      // Playlist
      const videoIds = youtubeResults.map((result) => result.youtube.id);
      const audioUrls = await fetchYouTubeAudioStreams(videoIds);
      for (const videoId of videoIds) {
        if (audioUrls[videoId]) {
          printStreamInfo(videoId, audioUrls[videoId]);
        } else {
          console.log(`Video ID: ${videoId} - No stream URL found`);
        }
      }
    }
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    console.log('Process completed. Exiting...');
    process.exit(0); // Exit the program gracefully
  }
}

// Example usage
// const spotifyURL = 'https://open.spotify.com/track/4xqrdfXkTW4T0RauPLv3WA?si=a2b3e4cb4e1f4321';
const spotifyURL = "https://open.spotify.com/playlist/0dvrubvw5wnorsoI3v5jwp?si=ca865c1fe77542b9";
main(spotifyURL);