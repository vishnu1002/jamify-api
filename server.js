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
const asciiArt = `
     ██╗ █████╗ ███╗   ███╗██╗███████╗██╗   ██╗
     ██║██╔══██╗████╗ ████║██║██╔════╝╚██╗ ██╔╝
     ██║███████║██╔████╔██║██║█████╗   ╚████╔╝ 
██   ██║██╔══██║██║╚██╔╝██║██║██╔══╝    ╚██╔╝  
╚█████╔╝██║  ██║██║ ╚═╝ ██║██║██║        ██║   
 ╚════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝        ╚═╝   
`;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies

// Welcome route
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(asciiArt + '\n/api/fetch/spotify-url');
});

/**
 * API endpoint to fetch Spotify metadata and YouTube metadata.
 * @param {string} spotifyUrl - Spotify URL (passed as a path parameter).
 */
app.get('/api/fetch/:spotifyUrl(*)', async (req, res) => {
  const { spotifyUrl } = req.params;

  if (!spotifyUrl) {
    return res.status(400).json({ message: '404' });
  }

  try {
    // 1. Get Spotify metadata
    const cleanUrl = spotifyUrl.split('?')[0];
    console.log('Processing URL:', cleanUrl);
    const spotifyData = await getSpotifyInfo(cleanUrl);

    // 2. Process based on type
    if (spotifyData.type === 'track') {
      // Single track
      try {
        // Search YouTube using track info
        const query = `${spotifyData.data.title} ${spotifyData.data.artist}`;
        const youtubeResults = await searchYouTube(query);
        
        if (!youtubeResults) {
          return res.status(404).json({ 
            error: 'Track not found',
            message: `Could not find: ${spotifyData.data.title} by ${spotifyData.data.artist}`
          });
        }

        // Get stream URL using video ID
        const streamUrl = await fetchAudioUrl(youtubeResults.id);
        if (!streamUrl) {
          return res.status(404).json({ 
            error: 'Stream not available',
            message: `Stream not available for: ${spotifyData.data.title}`
          });
        }

        console.log('Stream URL:', streamUrl);

        // New simplified response structure
        res.json({
          type: 'track',
          data: {
            title: spotifyData.data.title,
            artist: spotifyData.data.artist,
            date: spotifyData.data.date,
            image: spotifyData.data.image,
            link: spotifyData.data.link,
            duration: youtubeResults.duration,
            youtubeId: youtubeResults.id,
            youtubeTitle: youtubeResults.title,
            youtubeDuration: youtubeResults.duration,
            streamUrl: streamUrl
          }
        });
      } catch (error) {
        console.error('Error processing track:', error);
        res.status(500).json({ 
          error: 'Failed to process track',
          message: 'Unable to process the track. Please try again.'
        });
      }
    } else if (spotifyData.type === 'playlist') {
      // Playlist
      try {
        const tracksPromises = spotifyData.data.tracks.map(async (track) => {
          try {
            // For each track, get YouTube and stream info
            const query = `${track.title} ${track.artist}`;
            const youtubeResults = await searchYouTube(query);
            
            if (!youtubeResults) {
              console.error(`No YouTube results for: ${query}`);
              return null;
            }

            const streamUrl = await fetchAudioUrl(youtubeResults.id);
            if (!streamUrl) {
              console.error(`No stream URL for: ${track.title}`);
              return null;
            }

            console.log(`Stream URL for ${track.title}:`, streamUrl);

            return {
              ...track,
              duration: youtubeResults.duration,
              youtubeId: youtubeResults.id,
              streamUrl: streamUrl,
              youtubeResults: {
                ...youtubeResults,
                streamUrl: streamUrl
              }
            };
          } catch (error) {
            console.error(`Error processing track ${track.title}:`, error);
            return null;
          }
        });

        // Wait for all tracks to be processed
        const tracksInfo = await Promise.all(tracksPromises);

        // Filter out failed tracks
        const validTracks = tracksInfo.filter(track => track !== null);

        if (validTracks.length === 0) {
          return res.status(404).json({ 
            error: 'No tracks found',
            message: 'Could not find any playable tracks in this playlist.'
          });
        }

        res.json({
          type: 'playlist',
          data: {
            title: spotifyData.data.title,
            description: spotifyData.data.description,
            image: spotifyData.data.image,
            link: spotifyData.data.link,
            tracks: validTracks,
            skippedTracks: tracksInfo.length - validTracks.length
          },
        });
      } catch (error) {
        console.error('Error processing playlist:', error);
        res.status(500).json({ 
          error: 'Failed to process playlist',
          message: 'Unable to process the playlist. Please try again.'
        });
      }
    }
  } catch (error) {
    console.error('Error in API:', error);
    res.status(500).json({ 
      error: 'Processing error',
      message: 'An error occurred while processing your request. Please try again.'
    });
  }
});

// Catch-all middleware for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    message: '404'
  });
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
      console.log(`Backend: http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

function formatDuration(duration_ms) {
  const minutes = Math.floor(duration_ms / 60000);
  const seconds = ((duration_ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, '0')}`;
}

startServer();