const { fetchSpotifyTrackPreview } = require('./spotify-info');
const { searchYouTube } = require('./yt-search');
const { fetchYouTubeAudioStream } = require('./yt-info');
const NodeCache = require('node-cache');

// Create a cache instance with a TTL (Time-To-Live) of 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

async function main() {
  try {
    // Step 1: Fetch Spotify track details
    const spotifyUrl = 'https://open.spotify.com/track/2kJwzbxV2ppxnQoYw4GLBZ?si=c59f90b27c3d4f3e'; // Replace with your track URL

    // Check cache for Spotify data
    let spotifyData = cache.get(spotifyUrl);
    if (!spotifyData) {
      console.log('Fetching Spotify track details...');
      spotifyData = await fetchSpotifyTrackPreview(spotifyUrl);
      if (!spotifyData) {
        console.log('Failed to fetch Spotify track details.');
        process.exit(1);
      }
      // Cache Spotify data
      cache.set(spotifyUrl, spotifyData);
    } else {
      console.log('Using cached Spotify track details.');
    }

    // Display Spotify track details
    console.log('Spotify Track Details:');
    console.log('Title  :', spotifyData.title);
    console.log('Artist :', spotifyData.artist);
    console.log('Image  :', spotifyData.image);
    console.log('Date   :', spotifyData.date);
    console.log('Link   :', spotifyData.link);
    console.log('----------------------------------------');

    // Step 2: Search YouTube for the track
    const searchQuery = `${spotifyData.title} ${spotifyData.artist} audio`;

    // Check cache for YouTube search result
    let youtubeSearchResult = cache.get(searchQuery);
    if (!youtubeSearchResult) {
      console.log('Searching YouTube for the track...');
      youtubeSearchResult = await searchYouTube(searchQuery);
      if (!youtubeSearchResult) {
        console.log('Failed to find a matching YouTube video.');
        process.exit(1);
      }
      // Cache YouTube search result
      cache.set(searchQuery, youtubeSearchResult);
    } else {
      console.log('Using cached YouTube search result.');
    }

    // Display YouTube search result
    console.log('YouTube Search Result:');
    console.log('Video ID:', youtubeSearchResult.id);
    console.log('Duration:', youtubeSearchResult.duration);
    console.log('----------------------------------------');

    // Step 3: Fetch YouTube audio stream URL
    const youtubeVideoId = youtubeSearchResult.id;

    // Check cache for YouTube audio stream details
    let youtubeAudioStream = cache.get(youtubeVideoId);
    if (!youtubeAudioStream) {
      console.log('Fetching YouTube audio stream details...');
      youtubeAudioStream = await fetchYouTubeAudioStream(youtubeVideoId);
      if (!youtubeAudioStream) {
        console.log('Failed to fetch YouTube audio stream.');
        process.exit(1);
      }
      // Cache YouTube audio stream details
      cache.set(youtubeVideoId, youtubeAudioStream);
    } else {
      console.log('Using cached YouTube audio stream details.');
    }

    // Display YouTube audio stream details
    console.log('YouTube Audio Stream Details:');
    console.log('MIME Type:', youtubeAudioStream.mimeType);
    console.log('Video URL:', youtubeAudioStream.videoUrl);
    console.log('Stream URL:', youtubeAudioStream.streamUrl);

    // Combine all details into a single object for JSON output
    const result = {
      spotify: {
        title: spotifyData.title,
        artist: spotifyData.artist,
        image: spotifyData.image,
        date: spotifyData.date,
        link: spotifyData.link,
      },
      youtube: {
        videoId: youtubeSearchResult.id,
        duration: youtubeSearchResult.duration,
        mimeType: youtubeAudioStream.mimeType,
        videoUrl: youtubeAudioStream.videoUrl,
        streamUrl: youtubeAudioStream.streamUrl,
      },
    };

    // Display the result in JSON format
    console.log('\nJSON Output:');
    console.log(JSON.stringify(result, null, 2));

    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

// Run the main function
main();