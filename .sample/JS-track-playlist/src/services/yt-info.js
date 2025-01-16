const axios = require('axios');
const dotenv = require('dotenv');
const NodeCache = require('node-cache'); // Replace cachetools with node-cache

// Load environment variables
dotenv.config();

// Get API and proxy URLs
const API_URLS = process.env.API_URLS.split(',');
const PROXY_URLS = process.env.PROXY_URLS.split(',');

if (!API_URLS || !PROXY_URLS) {
  throw new Error('API_URLS or PROXY_URLS not set in .env file');
}

// Create a cache with a TTL of 1 hour
const cache = new NodeCache({ stdTTL: 3600 }); // TTL in seconds

// Create a session for reusing TCP connections
const session = axios.create();

// Retry limit
const MAX_RETRIES = 3;

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
            // Cache the result
            cache.set(videoId, audioUrl);
            return audioUrl;
          }

          const proxyAudioUrl = await tryProxyUrls(audioUrl);
          if (proxyAudioUrl) {
            // Cache the result
            cache.set(videoId, proxyAudioUrl);
            return proxyAudioUrl;
          }
        }
      } catch (error) {
        console.error(`Error fetching from ${apiUrl}: ${error.message}`);
      }
    }
    console.log(`Retry attempt ${retry + 1} of ${MAX_RETRIES}`);
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 5-second delay between retries
  }
  return null;
}

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

async function checkUrl(url) {
  try {
    const response = await session.head(url, { timeout: 5000 });
    if (response.status === 200 || response.status === 206) {
      return true;
    } else if (response.status === 403) {
      return false;
    }
  } catch (error) {
    console.error('[403 Forbidden error]');
  }
  return false;
}

async function fetchYouTubeAudioStreams(videoIds) {
  const audioUrls = {};
  for (const videoId of videoIds) {
    console.log(`\nVideo ID: ${videoId}`);
    const audioUrl = await fetchAudioUrl(videoId);
    if (audioUrl) {
      audioUrls[videoId] = audioUrl;
      console.log(`Stream URL: ${audioUrl}`);
    } else {
      console.log('No stream URL found');
    }
  }
  return audioUrls;
}

module.exports = { fetchYouTubeAudioStreams };