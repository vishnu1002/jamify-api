const ytstream = require('yt-stream');

// Helper function to introduce a delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchYouTubeAudioStream(videoId) {
  try {
    // Construct the full YouTube URL
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Fetch the audio stream
    const stream = await ytstream.stream(youtubeUrl, {
      quality: 'high',
      type: 'audio',
      highWaterMark: 1048576 * 32,
      download: true,
    });

    return {
      mimeType: stream.mimeType,
      streamUrl: stream.url,
    };
  } catch (error) {
    console.error(`Error fetching audio stream for video ${videoId}:`, error);
    return null;
  }
}

async function fetchYouTubeAudioStreams(videoIds) {
  const audioStreams = [];

  // Fetch streams one by one with a delay
  for (const videoId of videoIds) {
    try {
      const stream = await fetchYouTubeAudioStream(videoId);

      if (stream) {
        audioStreams.push({ videoId, ...stream });
      }

      // Introduce a delay of 3-5 seconds between fetches
      await delay(3000 + Math.random() * 2000); // Random delay between 3-5 seconds
    } catch (error) {
      console.error(`Error processing video ${videoId}:`, error);
    }
  }

  return audioStreams;
}

module.exports = { fetchYouTubeAudioStream, fetchYouTubeAudioStreams };