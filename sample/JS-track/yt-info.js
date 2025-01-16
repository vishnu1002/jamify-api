const ytstream = require('yt-stream');

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
      videoUrl: stream.video_url,
      mimeType: stream.mimeType,
      duration: stream.duration,
      streamUrl: stream.url,
    };
  } catch (error) {
    console.error('Error fetching YouTube audio stream:', error);
    return null;
  }
}

module.exports = { fetchYouTubeAudioStream };
