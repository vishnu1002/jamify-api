const YouTube = require("youtube-sr").default;

const searchSingleSong = async (songName) => {
  try {
    const results = await YouTube.search(songName, { limit: 1 });
    if (results.length > 0) {
      const video = results[0];
      console.log({
        id: video.id,
        title: video.title,
        duration: video.durationFormatted,
      });
    } else {
      console.log(`No results found for the song: ${songName}`);
    }
  } catch (err) {
    console.error(`Error fetching metadata for ${songName}:`, err);
  }
};

const searchMultipleSongs = async (songNames) => {
  for (const songName of songNames) {
    await searchSingleSong(songName);
  }
};

const singleSong = "Die With A Smile";
const multipleSongs = [
  "Die With A Smile",
  "Shape of You",
  "Blinding Lights",
  "Levitating",
];

searchMultipleSongs(multipleSongs);