const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const getSpotifyInfo = require('./services/spot-info');
const { searchYouTube, searchYouTubeForTracks } = require('./services/yt-search');
const { fetchAudioUrl } = require('./services/yt-info'); // Import fetchAudioUrl directly

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies

// Serve static files from the "frontend" directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve a welcome message for the root URL
app.get('/', (req, res) => {
  res.send('Welcome to the Spotify to YouTube Integration API!');
});

/**
 * API endpoint to fetch Spotify metadata and YouTube metadata.
 * @param {string} spotifyURL - Spotify URL (passed as a query parameter).
 */
app.get('/api/fetch', async (req, res) => {
  const { spotifyURL } = req.query;

  if (!spotifyURL) {
    return res.status(400).json({ error: 'Spotify URL is required' });
  }

  try {
    // Fetch Spotify metadata
    const spotifyData = await getSpotifyInfo(spotifyURL);

    if (spotifyData.type === 'track') {
      // Single track
      const query = `${spotifyData.data.title} ${spotifyData.data.artist}`;
      const youtubeResults = await searchYouTube(query);

      res.json({
        type: 'track',
        spotifyData,
        youtubeResults,
      });
    } else if (spotifyData.type === 'playlist') {
      // Playlist
      const tracksInfo = await Promise.all(
        spotifyData.data.tracks.map(async (track) => {
          const query = `${track.title} ${track.artist}`;
          const youtubeResults = await searchYouTube(query);
          return {
            ...track,
            youtubeResults,
          };
        })
      );

      res.json({
        type: 'playlist',
        data: {
          title: spotifyData.data.title,
          description: spotifyData.data.description,
          image: spotifyData.data.image,
          link: spotifyData.data.link,
          tracks: tracksInfo,
        },
      });
    }
  } catch (error) {
    console.error('Error in API:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

/**
 * API endpoint to fetch the stream URL for a specific video ID.
 * @param {string} videoId - YouTube video ID (passed as a query parameter).
 */
app.get('/api/stream', async (req, res) => {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  try {
    const audioUrl = await fetchAudioUrl(videoId);
    if (audioUrl) {
      res.json({ audioUrl });
    } else {
      res.status(404).json({ error: 'No stream URL found' });
    }
  } catch (error) {
    console.error('Error fetching stream URL:', error);
    res.status(500).json({ error: 'An error occurred while fetching the stream URL' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});