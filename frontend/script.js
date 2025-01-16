document.getElementById("spotifyForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const spotifyURL = document.getElementById("spotifyURL").value;
  const resultsDiv = document.getElementById("results");
  const loadingDiv = document.getElementById("loading");

  // Clear previous results
  resultsDiv.innerHTML = "";
  loadingDiv.style.display = "flex"; // Show loading spinner

  try {
    const response = await fetch(
      `/api/fetch?spotifyURL=${encodeURIComponent(spotifyURL)}`
    );
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process each line of data
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Save incomplete line for next iteration

      for (const line of lines) {
        if (!line.trim()) continue;

        const data = JSON.parse(line);

        if (data.type === "track") {
          // Single track
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
                  <button class="playPauseBtn">
                    <svg class="playIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor" d="M8 5v14l11-7z"/>
                    </svg>
                    <svg class="pauseIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" style="display: none;">
                      <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress"></div>
                </div>
                <div class="timeline">
                  <span class="currentTime">0:00</span>
                  <span class="totalTime">${data.youtubeResults.duration}</span>
                </div>
              </div>
            `;

          // Add audio player functionality
          const audio = new Audio(data.audioUrls[data.youtubeResults.id]);
          const playPauseBtn = document.querySelector(".playPauseBtn");
          const playIcon = document.querySelector(".playIcon");
          const pauseIcon = document.querySelector(".pauseIcon");
          const progressBar = document.querySelector(".progress");
          const currentTime = document.querySelector(".currentTime");
          const totalTime = document.querySelector(".totalTime");

          // Update progress bar and current time
          audio.addEventListener("timeupdate", () => {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = `${progress}%`;

            // Format current time
            const minutes = Math.floor(audio.currentTime / 60);
            const seconds = Math.floor(audio.currentTime % 60);
            currentTime.textContent = `${minutes}:${seconds
              .toString()
              .padStart(2, "0")}`;
          });

          // Play/pause functionality
          playPauseBtn.addEventListener("click", () => {
            if (audio.paused) {
              audio.play();
              playIcon.style.display = "none";
              pauseIcon.style.display = "block";
            } else {
              audio.pause();
              playIcon.style.display = "block";
              pauseIcon.style.display = "none";
            }
          });

          // Update total time
          audio.addEventListener("loadedmetadata", () => {
            const minutes = Math.floor(audio.duration / 60);
            const seconds = Math.floor(audio.duration % 60);
            totalTime.textContent = `${minutes}:${seconds
              .toString()
              .padStart(2, "0")}`;
          });
        } else if (data.type === "playlist") {
          // Playlist track
          const trackDiv = document.createElement("div");
          trackDiv.className = "music-player";
          trackDiv.innerHTML = `
              <div class="cover-art">
                <img src="${data.spotifyData.image}" alt="Cover Art">
              </div>
              <div class="track-details">
                <h2>${data.spotifyData.title}</h2>
                <p>${data.spotifyData.artist}</p>
                <p>Duration: ${data.youtubeResults.duration}</p>
              </div>
              <div class="controls">
                <button class="playPauseBtn">
                  <svg class="playIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M8 5v14l11-7z"/>
                  </svg>
                  <svg class="pauseIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" style="display: none;">
                    <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                </button>
              </div>
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress"></div>
                </div>
                <div class="timeline">
                  <span class="currentTime">0:00</span>
                  <span class="totalTime">${data.youtubeResults.duration}</span>
                </div>
              </div>
            `;
          resultsDiv.appendChild(trackDiv);

          // Lazy load stream URL when play button is clicked
          const playPauseBtn = trackDiv.querySelector(".playPauseBtn");
          playPauseBtn.addEventListener("click", async () => {
            const audio = new Audio();
            const playIcon = trackDiv.querySelector(".playIcon");
            const pauseIcon = trackDiv.querySelector(".pauseIcon");
            const progressBar = trackDiv.querySelector(".progress");
            const currentTime = trackDiv.querySelector(".currentTime");
            const totalTime = trackDiv.querySelector(".totalTime");

            // Fetch stream URL
            const streamResponse = await fetch(
              `/api/stream?videoId=${data.youtubeResults.id}`
            );
            const streamData = await streamResponse.json();
            audio.src = streamData.audioUrl;

            // Play/pause functionality
            if (audio.paused) {
              audio.play();
              playIcon.style.display = "none";
              pauseIcon.style.display = "block";
            } else {
              audio.pause();
              playIcon.style.display = "block";
              pauseIcon.style.display = "none";
            }

            // Update progress bar and current time
            audio.addEventListener("timeupdate", () => {
              const progress = (audio.currentTime / audio.duration) * 100;
              progressBar.style.width = `${progress}%`;

              // Format current time
              const minutes = Math.floor(audio.currentTime / 60);
              const seconds = Math.floor(audio.currentTime % 60);
              currentTime.textContent = `${minutes}:${seconds
                .toString()
                .padStart(2, "0")}`;
            });

            // Update total time
            audio.addEventListener("loadedmetadata", () => {
              const minutes = Math.floor(audio.duration / 60);
              const seconds = Math.floor(audio.duration % 60);
              totalTime.textContent = `${minutes}:${seconds
                .toString()
                .padStart(2, "0")}`;
            });
          });
        }
      }
    }
  } catch (error) {
    loadingDiv.style.display = "none";
    resultsDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
  }
});
