const spotifyUrlInfo = require('spotify-url-info'); // Import Spotify URL Info library
const yts = require('yt-search'); // Import YouTube Search library
const ytstream = require('yt-stream'); // Import YouTube Stream library

// Initialize spotifyUrlInfo with fetch (required)
const { getData } = spotifyUrlInfo(require('isomorphic-unfetch'));

/**
 * Fetch YouTube video ID and audio stream URL for a Spotify track.
 * @param {string} spotifyUrl - The Spotify track URL.
 * @returns {object|null} - Object containing YouTube video ID and audio stream URL, or null if an error occurs.
 */
async function getYoutubeMetadata(spotifyUrl) {
  try {
    // Step 1: Fetch Spotify track details
    const trackData = await getData(spotifyUrl);
    const query = `${trackData.name} ${trackData.artists[0].name}`;

    // Step 2: Search YouTube for the track
    const { videos } = await yts(query);
    if (!videos.length) {
      console.log('No YouTube video found for the track.');
      return null;
    }

    const youtubeId = videos[0].videoId;

    // Step 3: Fetch audio stream URL for the YouTube video
    const stream = await ytstream.stream(`https://www.youtube.com/watch?v=${youtubeId}`, {
      quality: 'highestaudio',
    });

    return {
      youtubeId,
      audioStreamUrl: stream.url,
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return null;
  }
}

// Example usage
const spotifyLink = "https://open.spotify.com/track/4y4spB9m0Q6026KfkAvy9Q?si=344041f783bc4c28"; // Replace with a valid Spotify track URL

getYoutubeMetadata(spotifyLink)
  .then(metadata => {
    if (metadata) {
      console.log('YouTube Video ID:', metadata.youtubeId);
      console.log('Audio Stream URL:', metadata.audioStreamUrl);
    } else {
      console.log('Failed to fetch metadata.');
    }
  })
  .catch(error => console.error('Error:', error));