// spotify-playlist-simple.js

const CLIENT_ID = '6c158ccfc57945e791fde27277c5f084';
const REDIRECT_URI = 'http://localhost:8000';
const PLAYLIST_ID = '37i9dQZF1DXdfOcg1fm0VG';

// Check if we're returning from auth
const params = new URLSearchParams(window.location.hash.substring(1));
const accessToken = params.get('access_token');

if (!accessToken) {
    // Redirect to Spotify auth if we don't have a token
    const scopes = 'playlist-read-private playlist-read-collaborative';
    window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;
} else {
    // Function to get playlist details
    async function getPlaylistDetails() {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const playlist = await response.json();

        console.log(`Playlist Name: ${playlist.name}\n`);

        playlist.tracks.items.forEach((item, index) => {
            const track = item.track;
            const artists = track.artists.map(artist => artist.name).join(', ');
            const duration = new Date(track.duration_ms).toISOString().substr(14, 5);

            console.log(`${index + 1}. Song: ${track.name}`);
            console.log(`   Artists: ${artists}`);
            console.log(`   Duration: ${duration}`);
            console.log(`   Album: ${track.album.name}`);
            console.log('');
        });
    }

    getPlaylistDetails().catch(console.error);
}