const ytdl = require('ytdl-core');

async function fetchVideoMetadata(videoId) {
  try {
    // Fetch video info
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);

    // Print all metadata
    console.log('Video Metadata:');
    console.log('Title:', info.videoDetails.title);
    console.log('Description:', info.videoDetails.description);
    console.log('Duration:', info.videoDetails.lengthSeconds, 'seconds');
    console.log('Upload Date:', info.videoDetails.uploadDate);
    console.log('View Count:', info.videoDetails.viewCount);
    console.log('Likes:', info.videoDetails.likes);
    console.log('Dislikes:', info.videoDetails.dislikes);
    console.log('Author:', info.videoDetails.author.name);
    console.log('Thumbnail:', info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url); // Highest resolution thumbnail
    console.log('Formats:');
    info.formats.forEach((format, index) => {
      console.log(`  ${index + 1}. Quality: ${format.qualityLabel}, MIME Type: ${format.mimeType}, URL: ${format.url}`);
    });
  } catch (error) {
    if (error.statusCode === 410) {
      console.error('Error: The video is unavailable or has been removed (HTTP 410).');
    } else {
      console.error('Error fetching video metadata:', error);
    }
  }
}

// Test function
async function test() {
  // Test with a sample YouTube video ID
  const videoId = 'dQw4w9WgXcQ'; // Replace with a valid YouTube video ID
  console.log('Fetching metadata for video ID:', videoId);

  await fetchVideoMetadata(videoId);
}

// Run the test
test();