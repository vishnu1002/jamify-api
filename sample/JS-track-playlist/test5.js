const spotifyUrlInfo = require('spotify-url-info'); // Import Spotify URL Info library
const yts = require('yt-search'); // Import YouTube Search library

// Initialize spotifyUrlInfo with fetch (required)
const { getData } = spotifyUrlInfo(require('isomorphic-unfetch'));

/**
 * Fetch YouTube video ID for a Spotify track.
 * @param {string} spotifyUrl - The Spotify track URL.
 * @returns {string|null} - The YouTube video ID or null if not found.
 */
async function getYoutubeIdFromSpotifyUrl(spotifyUrl) {
  try {
    // Fetch Spotify track details
    const trackData = await getData(spotifyUrl);

    // Extract track title and artist
    const title = trackData.name;
    const artist = trackData.artists[0].name;

    // Search YouTube for the track
    const query = `${title} ${artist}`;
    const { videos } = await yts(query);

    if (videos.length > 0) {
      // Return the ID of the first search result
      return videos[0].videoId;
    } else {
      console.log('No YouTube video found for the track.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching YouTube ID:', error);
    return null;
  }
}

// Example usage
const spotifyLink = "https://open.spotify.com/track/4y4spB9m0Q6026KfkAvy9Q?si=344041f783bc4c28"; // Replace with a valid Spotify track URL

getYoutubeIdFromSpotifyUrl(spotifyLink)
  .then(id => console.log("YouTube Video ID:", id))
  .catch(error => console.error("Error:", error));