const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const getSpotifyInfo = require('./services/spot-info');
const { searchYouTube, searchYouTubeForTracks } = require('./services/yt-search');
const { fetchYouTubeAudioStreams } = require('./services/yt-info');

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
 * API endpoint to fetch Spotify metadata and YouTube audio streams.
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
      const audioUrls = await fetchYouTubeAudioStreams([youtubeResults.id]);

      res.json({
        type: 'track',
        spotifyData,
        youtubeResults,
        audioUrls,
      });
    } else if (spotifyData.type === 'playlist') {
      // Playlist
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      for (const track of spotifyData.data.tracks) {
        const query = `${track.title} ${track.artist}`;
        const youtubeResults = await searchYouTube(query);

        // Send incremental results
        res.write(
          JSON.stringify({
            type: 'playlist',
            spotifyData: track,
            youtubeResults,
          }) + '\n'
        );
      }

      res.end();
    }
  } catch (error) {
    console.error('Error in API:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});