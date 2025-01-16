const ytstream = require('yt-stream');

async function searchYouTube(query) {
  try {
    const results = await ytstream.search(query);

    if (results.length > 0) {
      const firstResult = results[0];
      return {
        id: firstResult.id,
        title: firstResult.title,
        duration: firstResult.length_text,
        views: firstResult.views_text,
      };
    } else {
      console.log('No results found.');
      return null;
    }
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return null;
  }
}

async function searchYouTubeForTracks(tracks) {
  try {
    const youtubeResults = await Promise.all(
      tracks.map(async (track) => {
        const query = `${track.title} ${track.artist}`;
        const result = await searchYouTube(query);
        return result; // Return only the YouTube result
      })
    );

    // Filter out null values (skipped tracks)
    return youtubeResults.filter((result) => result !== null);
  } catch (error) {
    console.error('Error searching YouTube for tracks:', error);
    return [];
  }
}

module.exports = { searchYouTube, searchYouTubeForTracks };