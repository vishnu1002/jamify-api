const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const getSpotifyInfo = require('./services/spot-info');
const { searchYouTube, searchYouTubeForTracks } = require('./services/yt-search');
const { fetchAudioUrl } = require('./services/yt-info');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Jamify API',
    usage: {
      fetch: '/api/fetch/:spotifyUrl',
    }
  });
});

/**
 * API endpoint to fetch Spotify metadata and YouTube metadata.
 * @param {string} spotifyUrl - Spotify URL (passed as a path parameter).
 */
app.get('/api/fetch/:spotifyUrl(*)', async (req, res) => {
  const { spotifyUrl } = req.params;

  if (!spotifyUrl) {
    return res.status(400).json({ error: 'Spotify URL is required' });
  }

  // Log the received URL for debugging
  // console.log('Received Spotify URL:', spotifyUrl);

  try {
    // Strip any extra parameters if needed
    const cleanUrl = spotifyUrl.split('?')[0]; // Remove everything after '?si='
    console.log('Processing URL:', cleanUrl);

    // Fetch Spotify metadata
    const spotifyData = await getSpotifyInfo(cleanUrl);

    if (spotifyData.type === 'track') {
      // Single track
      const query = `${spotifyData.data.title} ${spotifyData.data.artist}`;
      const youtubeResults = await searchYouTube(query);

      res.json({
        type: 'track',
        spotifyData,
        youtubeResults
      });
    } else if (spotifyData.type === 'playlist') {
      // Playlist
      const tracksInfo = await Promise.all(
        spotifyData.data.tracks.map(async (track) => {
          const query = `${track.title} ${track.artist}`;
          const youtubeResults = await searchYouTube(query);
          return {
            ...track,
            youtubeResults
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
// app.get('/api/stream', async (req, res) => {
//   const { videoId } = req.query;

//   if (!videoId) {
//     return res.status(400).json({ error: 'Video ID is required' });
//   }

//   try {
//     const audioUrl = await fetchAudioUrl(videoId);
//     if (audioUrl) {
//       res.json({ audioUrl });
//     } else {
//       res.status(404).json({ error: 'No stream URL found' });
//     }
//   } catch (error) {
//     console.error('Error fetching stream URL:', error);
//     res.status(500).json({ error: 'An error occurred while fetching the stream URL' });
//   }
// });

// Find an available port

const findAvailablePort = async (startPort) => {
  let port = startPort;
  while (port < startPort + 10) { // Try up to 10 ports
    try {
      await new Promise((resolve, reject) => {
        const server = app.listen(port)
          .once('listening', () => {
            server.close();
            resolve();
          })
          .once('error', reject);
      });
      return port;
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        port++;
        continue;
      }
      throw err;
    }
  }
  throw new Error('No available ports found');
};

// Start the server
const startServer = async () => {
  try {
    const port = await findAvailablePort(PORT);
    app.listen(port, () => {
      console.log(`API server: http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();