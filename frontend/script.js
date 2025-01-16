let currentlyPlayingAudio = null; // Track the currently playing audio

document.getElementById('spotifyForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const spotifyURL = document.getElementById('spotifyURL').value;
  const resultsDiv = document.getElementById('results');

  // Clear previous results
  resultsDiv.innerHTML = '<p>Loading...</p>';

  try {
    // Fetch metadata from the backend
    const response = await fetch(`/api/fetch?spotifyURL=${encodeURIComponent(spotifyURL)}`);
    const data = await response.json();

    // Display metadata
    if (data.type === 'track') {
      resultsDiv.innerHTML = `
        <div class="music-player">
          <div class="cover-art">
            <img src="${data.spotifyData.data.image}" alt="Cover Art">
          </div>
          <div class="track-details">
            <h2>${data.spotifyData.data.title}</h2>
            <p>${data.spotifyData.data.artist}</p>
            <p>Duration: ${data.youtubeResults.duration}</p>
          </div>
          <div class="controls">
            <button class="playPauseBtn" data-video-id="${data.youtubeResults.id}">
              <svg class="playIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M8 5v14l11-7z"/>
              </svg>
              <svg class="pauseIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" style="display: none;">
                <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    } else if (data.type === 'playlist') {
      resultsDiv.innerHTML = '<h2>Playlist Tracks</h2>';
      data.data.tracks.forEach((track) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'music-player';
        trackDiv.innerHTML = `
          <div class="cover-art">
            <img src="${track.image}" alt="Cover Art">
          </div>
          <div class="track-details">
            <h2>${track.title}</h2>
            <p>${track.artist}</p>
            <p>Duration: ${track.youtubeResults.duration}</p>
          </div>
          <div class="controls">
            <button class="playPauseBtn" data-video-id="${track.youtubeResults.id}">
              <svg class="playIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M8 5v14l11-7z"/>
              </svg>
              <svg class="pauseIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" style="display: none;">
                <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>
          </div>
        `;
        resultsDiv.appendChild(trackDiv);
      });
    }

    // Add event listeners to play buttons
    document.querySelectorAll('.playPauseBtn').forEach((button) => {
      button.addEventListener('click', async () => {
        const videoId = button.getAttribute('data-video-id');
        const playIcon = button.querySelector('.playIcon');
        const pauseIcon = button.querySelector('.pauseIcon');

        // Show loading spinner
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'none';
        button.innerHTML = '<div class="spinner"></div>';

        // Fetch stream URL
        try {
          const streamResponse = await fetch(`/api/stream?videoId=${videoId}`);
          const streamData = await streamResponse.json();

          if (streamData.audioUrl) {
            // Pause the currently playing audio
            if (currentlyPlayingAudio) {
              currentlyPlayingAudio.pause();
            }

            // Play the new audio
            const audio = new Audio(streamData.audioUrl);
            audio.play();
            currentlyPlayingAudio = audio;

            // Toggle play/pause icons
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';

            // Update button to pause
            button.innerHTML = '';
            button.appendChild(pauseIcon);

            // Add pause functionality
            button.addEventListener('click', () => {
              if (audio.paused) {
                audio.play();
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
              } else {
                audio.pause();
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
              }
            });
          } else {
            console.error('No stream URL found');
          }
        } catch (error) {
          console.error('Error fetching stream URL:', error);
        } finally {
          // Remove loading spinner
          button.innerHTML = '';
          button.appendChild(playIcon);
        }
      });
    });
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
  }
});