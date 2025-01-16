const getSpotifyInfo = require('./services/spot-info');
const { searchYouTube, searchYouTubeForTracks } = require('./services/yt-search');
const { fetchYouTubeAudioStreams } = require('./services/yt-info');
const { printSpotifyMetadata, printYouTubeMetadata, printStreamInfo } = require('./utils/print');

/**
 * Validate Spotify URL.
 * @param {string} url - Spotify URL.
 * @returns {boolean} - True if valid, false otherwise.
 */
function validateSpotifyURL(url) {
  return url.startsWith('https://open.spotify.com/');
}

/**
 * Main function to fetch Spotify metadata, search YouTube, and fetch audio streams.
 * @param {string} spotifyURL - Spotify track or playlist URL.
 */
async function main(spotifyURL) {
  try {
    // Validate Spotify URL
    if (!validateSpotifyURL(spotifyURL)) {
      throw new Error('Invalid Spotify URL');
    }

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
      // Playlist (batch processing)
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

// const spotifyURL = 'https://open.spotify.com/track/1J14CdDAvBTE1AJYUOwl6C?si=d3ec6bafe4f04b61';
const spotifyURL = 'https://open.spotify.com/playlist/0dvrubvw5wnorsoI3v5jwp?si=ca865c1fe77542b9';
main(spotifyURL);