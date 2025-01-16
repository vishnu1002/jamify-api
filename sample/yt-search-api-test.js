const youtubesearchapi = require("youtube-search-api");

const searchSingleSong = async (songName) => {
  try {
    const result = await youtubesearchapi.GetListByKeyword(songName, false, 1);
    if (result.items.length > 0) {
      const video = result.items[0];
      console.log({
        id: video.id,
        title: video.title,
        duration: video.length.simpleText,
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