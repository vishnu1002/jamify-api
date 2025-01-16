function printSpotifyMetadata(spotifyData) {
  console.log("Spotify Metadata:");
  console.log(JSON.stringify(spotifyData, null, 2));
}

function printYouTubeMetadata(youtubeResults) {
  console.log("YouTube Metadata:");
  if (Array.isArray(youtubeResults)) {
    const youtubeOnlyMetadata = youtubeResults.map((result) => ({
      youtube: result.youtube,
    }));
    console.log(JSON.stringify(youtubeOnlyMetadata, null, 2));
  } else {
    console.log(JSON.stringify({ youtube: youtubeResults }, null, 2));
  }
}

function printStreamInfo(videoId, audioUrl) {
  console.log(`Video ID: ${videoId}`);
  console.log(`Stream URL: ${audioUrl}`);
}

module.exports = {
  printSpotifyMetadata,
  printYouTubeMetadata,
  printStreamInfo,
};
