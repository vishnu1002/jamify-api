const axios = require("axios");
require("dotenv").config();

// Function to get access token
async function getAccessToken() {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64")}`,
      },
    }
  );
  return response.data.access_token;
}

// Function to fetch track details
async function fetchTrackDetails(trackId, accessToken) {
  const trackResponse = await axios.get(
    `https://api.spotify.com/v1/tracks/${trackId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const track = trackResponse.data;

  const artistResponse = await axios.get(
    `https://api.spotify.com/v1/artists/${track.artists[0].id}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const artist = artistResponse.data;

  return {
    song: track.name,
    artists: track.artists.map((artist) => artist.name).join(", "),
    duration: `${Math.floor(track.duration_ms / 60000)}:${(
      (track.duration_ms % 60000) / 1000
    )
      .toFixed(0)
      .padStart(2, "0")}`,
    genres: artist.genres.join(", ") || "N/A",
  };
}

// Function to fetch playlist details
async function fetchPlaylistDetails(playlistId, accessToken) {
  const playlistResponse = await axios.get(
    `https://api.spotify.com/v1/playlists/${playlistId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const playlist = playlistResponse.data;

  const playlistName = playlist.name;
  const tracks = playlist.tracks.items;

  console.log("Playlist Name:", playlistName);

  for (let i = 0; i < tracks.length; i++) {
    const trackId = tracks[i].track.id;
    const trackDetails = await fetchTrackDetails(trackId, accessToken);

    console.log(`${i + 1}. Song: ${trackDetails.song}`);
    console.log(`   Artists: ${trackDetails.artists}`);
    console.log(`   Duration: ${trackDetails.duration}`);
    console.log(`   Genres: ${trackDetails.genres}`);
    console.log("-------------------------");
  }
}

// Function to fetch song or playlist details
async function fetchDetails(url) {
  try {
    const accessToken = await getAccessToken();

    if (url.includes("track")) {
      // Handle track URL
      const trackId = url.split("track/")[1].split("?")[0];
      const trackDetails = await fetchTrackDetails(trackId, accessToken);

      console.log("Song    :", trackDetails.song);
      console.log("Artists :", trackDetails.artists);
      console.log("Duration:", trackDetails.duration);
      console.log("Genres  :", trackDetails.genres);
    } else if (url.includes("playlist")) {
      // Handle playlist URL
      const playlistId = url.split("playlist/")[1].split("?")[0];
      await fetchPlaylistDetails(playlistId, accessToken);
    } else {
      console.error("Invalid URL. Please provide a valid track or playlist URL.");
    }
  } catch (error) {
    console.error("Error fetching details:", error.response ? error.response.data : error.message);
  }
}

const spotifyURL = "https://open.spotify.com/playlist/37i9dQZF1DXdfOcg1fm0VG?si=3630aac408c14ba9";

fetchDetails(spotifyURL);