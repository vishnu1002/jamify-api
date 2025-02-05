const YouTube = require('youtube-sr').default;
const NodeCache = require('node-cache');

// Create a cache with a TTL of 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Clean and format search query
 * @param {string} query - The search query
 * @returns {string} - Formatted query
 */
function formatSearchQuery(query) {
  // Remove special characters and extra spaces
  return query.replace(/[^\w\s]/gi, ' ').trim();
}

/**
 * Search YouTube for a single track.
 * @param {string} query - The search query.
 * @param {number} [limit=3] - Maximum number of results to search through.
 * @returns {Promise<object|null>} - YouTube metadata or null if not found.
 */
async function searchYouTube(query, limit = 3) {
  try {
    // Format the query
    const formattedQuery = formatSearchQuery(query);
    console.log('Searching YouTube for:', formattedQuery);

    // Check if the result is already cached
    const cacheKey = `search:${formattedQuery}:${limit}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log('Returning cached result for:', formattedQuery);
      return cachedResult;
    }

    // Search with more results to find better matches
    const results = await YouTube.search(formattedQuery, { limit });
    console.log(`Found ${results.length} results for:`, formattedQuery);

    if (results.length > 0) {
      // Always try the first result first
      const firstResult = results[0];
      console.log('Selected first result:', firstResult.title);

      const youtubeMetadata = {
        id: firstResult.id,
        title: firstResult.title,
        duration: firstResult.durationFormatted,
      };

      // Cache the result
      cache.set(cacheKey, youtubeMetadata);
      return youtubeMetadata;
    }

    console.log('No results found for query:', formattedQuery);
    return null;
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