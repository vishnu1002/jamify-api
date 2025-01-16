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

module.exports = { searchYouTube };
