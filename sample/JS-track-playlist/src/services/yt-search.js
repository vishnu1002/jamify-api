const YouTube = require("youtube-sr").default;
const NodeCache = require('node-cache');

// Create a cache with a TTL of 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Search YouTube for a single track.
 * @param {string} query - The search query.
 * @returns {Promise<object|null>} - YouTube metadata or null if not found.
 */
async function searchYouTube(query) {
  try {
    // Check if the result is already cached
    const cachedResult = cache.get(query);
    if (cachedResult) {
      return cachedResult;
    }

    const results = await YouTube.search(query, { limit: 1 }); // Limit to 1 result
    if (results.length > 0) {
      const firstResult = results[0];
      const youtubeMetadata = {
        id: firstResult.id,
        title: firstResult.title,
        duration: firstResult.durationFormatted,
      };

      // Cache the result
      cache.set(query, youtubeMetadata);
      return youtubeMetadata;
    } else {
      console.log('No results found for query:', query);
      return null;
    }
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return null;
  }
}

/**
 * Search YouTube for multiple tracks in parallel.
 * @param {Array<object>} tracks - Array of track objects (each containing title and artist).
 * @returns {Promise<Array<object>>} - Array of track objects with YouTube metadata.
 */
async function searchYouTubeForTracks(tracks) {
  try {
    const youtubeResults = await Promise.all(
      tracks.map(async (track) => {
        const query = `${track.title} ${track.artist}`;
        const result = await searchYouTube(query);
        return result ? { ...track, youtube: result } : null;
      })
    );

    // Filter out null values (failed queries)
    return youtubeResults.filter((result) => result !== null);
  } catch (error) {
    console.error('Error searching YouTube for tracks:', error);
    return [];
  }
}

module.exports = { searchYouTube, searchYouTubeForTracks };