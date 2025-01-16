const axios = require('axios');
const dotenv = require('dotenv');
const NodeCache = require('node-cache');

// Load environment variables
dotenv.config();

// Validate and sanitize environment variables
const API_URLS = process.env.API_URLS?.split(',') || [];
const PROXY_URLS = process.env.PROXY_URLS?.split(',') || [];

if (!API_URLS.length || !PROXY_URLS.length) {
  throw new Error('API_URLS or PROXY_URLS not set in .env file');
}

// Create a cache with a TTL of 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

// Create a session for reusing TCP connections
const session = axios.create();

// Retry limit and delay
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Fetch video data from a specific API URL.
 * @param {string} apiUrl - API URL.
 * @param {string} videoId - YouTube video ID.
 * @returns {Promise<object|null>} - Video data or null if failed.
 */
async function fetchVideoData(apiUrl, videoId) {
  try {
    const response = await session.get(`${apiUrl}/${videoId}`, { timeout: 10000 });
    if (response.status === 200) {
      return response.data;
    }
  } catch (error) {
    console.error(`Error fetching video data: ${error.message}`);
  }
  return null;
}

/**
 * Extract audio URL from video data.
 * @param {object} videoData - Video data.
 * @returns {string|null} - Audio URL or null if not found.
 */
function extractAudioUrl(videoData) {
  const formats = videoData.adaptiveFormats || [];
  for (const format of formats) {
    if (
      format.audioQuality === 'AUDIO_QUALITY_MEDIUM' &&
      format.type === 'audio/mp4; codecs="mp4a.40.2"'
    ) {
      return format.url;
    }
  }
  return null;
}

/**
 * Try proxy URLs for a given audio URL.
 * @param {string} audioUrl - Original audio URL.
 * @returns {Promise<string|null>} - Proxy audio URL or null if failed.
 */
async function tryProxyUrls(audioUrl) {
  for (const proxyUrl of PROXY_URLS) {
    try {
      const proxyDomain = proxyUrl.replace('https://', '');
      const proxyAudioUrl = audioUrl.replace(audioUrl.split('/')[2], proxyDomain);
      if (await checkUrl(proxyAudioUrl)) {
        console.log(`[WORKING-URL]: ${proxyUrl}`);
        return proxyAudioUrl;
      } else {
        console.log(`[403 Forbidden error]: ${proxyUrl}`);
      }
    } catch (error) {
      console.error(`Error with proxy ${proxyUrl}: ${error.message}`);
    }
  }
  return null;
}

/**
 * Check if a URL is accessible.
 * @param {string} url - URL to check.
 * @returns {Promise<boolean>} - True if accessible, false otherwise.
 */
async function checkUrl(url) {
  try {
    const response = await session.head(url, { timeout: 5000 });
    return response.status === 200 || response.status === 206;
  } catch (error) {
    console.error('[403 Forbidden error]');
    return false;
  }
}

/**
 * Fetch audio URL for a video ID with retries.
 * @param {string} videoId - YouTube video ID.
 * @returns {Promise<string|null>} - Audio URL or null if failed.
 */
async function fetchAudioUrl(videoId) {
  // Check if the result is already cached
  const cachedResult = cache.get(videoId);
  if (cachedResult) {
    return cachedResult;
  }

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    for (const apiUrl of API_URLS) {
      try {
        const videoData = await fetchVideoData(apiUrl, videoId);
        if (videoData) {
          const audioUrl = extractAudioUrl(videoData);
          if (audioUrl && (await checkUrl(audioUrl))) {
            console.log(`[working]: ${apiUrl}`);
            cache.set(videoId, audioUrl);
            return audioUrl;
          }

          const proxyAudioUrl = await tryProxyUrls(audioUrl);
          if (proxyAudioUrl) {
            cache.set(videoId, proxyAudioUrl);
            return proxyAudioUrl;
          }
        }
      } catch (error) {
        console.error(`Error fetching from ${apiUrl}: ${error.message}`);
      }
    }
    console.log(`Retry attempt ${retry + 1} of ${MAX_RETRIES}`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  }
  return null;
}

/**
 * Fetch audio streams for multiple video IDs in parallel.
 * @param {Array<string>} videoIds - Array of YouTube video IDs.
 * @returns {Promise<object>} - Object mapping video IDs to audio URLs.
 */
async function fetchYouTubeAudioStreams(videoIds) {
  const audioUrls = {};
  await Promise.all(
    videoIds.map(async (videoId) => {
      const audioUrl = await fetchAudioUrl(videoId);
      if (audioUrl) {
        audioUrls[videoId] = audioUrl;
        console.log(`Stream URL for Video ID ${videoId}: ${audioUrl}`);
      } else {
        console.log(`No stream URL found for Video ID ${videoId}`);
      }
    })
  );
  return audioUrls;
}

module.exports = { fetchYouTubeAudioStreams };