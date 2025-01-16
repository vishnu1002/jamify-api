const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');
const ytdl = require('ytdl-core');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());

// Configure cache
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// Spotify API credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

// Get API and proxy URLs from environment variables
const API_URLS = process.env.API_URLS.split(',');
const PROXY_URLS = process.env.PROXY_URLS.split(',');

// Validate environment variables
if (!API_URLS || !PROXY_URLS) {
    throw new Error("API_URLS or PROXY_URLS not set in .env file");
}

// Route to serve the homepage
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Route to fetch Spotify track details and YouTube audio URL
app.post('/search', async (req, res) => {
    const spotifyUrl = req.body.spotify_url;
    const result = await fetchAllData(spotifyUrl);
    res.json(result);
});

// Function to fetch all data
async function fetchAllData(spotifyUrl) {
    const spotifyDetails = await fetchSpotifyTrackDetails(spotifyUrl);
    const videoId = await fetchYoutubeVideoId(spotifyUrl);

    if (!spotifyDetails || !videoId) {
        return { success: false, error: "Failed to fetch Spotify details or YouTube video ID." };
    }

    const audioUrl = await fetchAudioUrl(videoId);
    if (!audioUrl) {
        return { success: false, error: "Could not fetch audio stream URL." };
    }

    spotifyDetails.audio_url = audioUrl;
    return { success: true, track_details: spotifyDetails };
}

// Function to fetch Spotify track details
async function fetchSpotifyTrackDetails(spotifyUrl) {
    try {
        const trackId = spotifyUrl.split('track/')[1].split('?')[0];
        const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: {
                'Authorization': `Bearer ${await getSpotifyAccessToken()}`
            }
        });
        const track = response.data;
        const artistResponse = await axios.get(track.artists[0].href, {
            headers: {
                'Authorization': `Bearer ${await getSpotifyAccessToken()}`
            }
        });
        const artist = artistResponse.data;
        return {
            name: track.name,
            artists: track.artists.map(artist => artist.name).join(', '),
            duration: `${Math.floor(track.duration_ms / 60000)}:${((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}`,
            genre: artist.genres.join(', ') || 'N/A',
            cover_image: track.album.images[0].url,
        };
    } catch (error) {
        console.error('Error fetching Spotify track details:', error);
        return null;
    }
}

// Function to fetch YouTube video ID
async function fetchYoutubeVideoId(spotifyUrl) {
    try {
        const trackId = spotifyUrl.split('track/')[1].split('?')[0];
        const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: {
                'Authorization': `Bearer ${await getSpotifyAccessToken()}`
            }
        });
        const track = response.data;
        const query = `${track.name} ${track.artists[0].name}`;
        const videoInfo = await ytdl.getInfo(`ytsearch:${query}`);
        return videoInfo.videoDetails.videoId;
    } catch (error) {
        console.error('Error fetching YouTube video ID:', error);
        return null;
    }
}

// Function to fetch YouTube audio stream URL
async function fetchAudioUrl(videoId) {
    let retries = 0;
    while (retries < MAX_RETRIES) {
        for (const apiUrl of API_URLS) {
            try {
                const videoData = await fetchVideoData(apiUrl, videoId);
                if (videoData) {
                    const audioUrl = extractAudioUrl(videoData);
                    if (audioUrl && await checkUrl(audioUrl)) {
                        console.log(`Using API URL: ${apiUrl}`);
                        return audioUrl;
                    }
                    const proxyAudioUrl = await tryProxyUrls(audioUrl);
                    if (proxyAudioUrl) {
                        return proxyAudioUrl;
                    }
                }
            } catch (error) {
                console.error(`Error fetching from ${apiUrl}:`, error);
            }
        }
        retries++;
        console.log(`Retry attempt ${retries} of ${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5-second delay between retries
    }
    return null;
}

async function fetchVideoData(apiUrl, videoId) {
    const response = await axios.get(`${apiUrl}/${videoId}`, { timeout: 10000 });
    if (response.status === 200) {
        return response.data;
    }
    return null;
}

function extractAudioUrl(videoData) {
    for (const format of videoData.adaptiveFormats || []) {
        if (format.audioQuality === 'AUDIO_QUALITY_MEDIUM' && format.type === 'audio/mp4; codecs="mp4a.40.2"') {
            return format.url;
        }
    }
    return null;
}

async function tryProxyUrls(audioUrl) {
    for (const proxyUrl of PROXY_URLS) {
        try {
            const proxyDomain = proxyUrl.replace('https://', '');
            const proxyAudioUrl = audioUrl.replace(new URL(audioUrl).host, proxyDomain);
            if (await checkUrl(proxyAudioUrl)) {
                console.log(`Using Proxy URL: ${proxyUrl}`);
                return proxyAudioUrl;
            }
        } catch (error) {
            console.error(`Error with proxy ${proxyUrl}:`, error);
        }
    }
    return null;
}

async function checkUrl(url) {
    try {
        const response = await axios.head(url, { timeout: 5000 });
        if (response.status === 200 || response.status === 206) {
            return true;
        } else if (response.status === 403) {
            console.warn(`403 Forbidden error for URL: ${url}`);
            return false;
        }
    } catch (error) {
        console.error(`Error checking URL ${url}:`, error);
    }
    return false;
}

// Function to get Spotify access token
async function getSpotifyAccessToken() {
    const response = await axios.post('https://accounts.spotify.com/api/token', null, {
        params: {
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    return response.data.access_token;
}

// Run the Express app
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});