import os
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from yt_dlp import YoutubeDL
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Spotify API credentials
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")

# Initialize Spotipy client
sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(client_id=CLIENT_ID, client_secret=CLIENT_SECRET))

# Function to fetch track details
def fetch_track_details(track_url):
    track_id = track_url.split("track/")[1].split("?")[0]
    track = sp.track(track_id)
    artist = sp.artist(track["artists"][0]["id"])

    return {
        "name": track["name"],
        "artists": ", ".join(artist["name"] for artist in track["artists"]),
        "duration": f"{track['duration_ms'] // 60000}:{(track['duration_ms'] % 60000) // 1000:02}",
        "genres": ", ".join(artist["genres"]) or "N/A",
    }

# Function to fetch playlist details
def fetch_playlist_details(playlist_url):
    playlist_id = playlist_url.split("playlist/")[1].split("?")[0]
    playlist = sp.playlist(playlist_id)

    return {
        "name": playlist["name"],
        "tracks": [
            {
                "name": item["track"]["name"],
                "artists": ", ".join(artist["name"] for artist in item["track"]["artists"]),
                "duration": f"{item['track']['duration_ms'] // 60000}:{(item['track']['duration_ms'] % 60000) // 1000:02}",
            }
            for item in playlist["tracks"]["items"]
        ],
    }

# Function to download a song from YouTube
def download_song(song_name, artists):
    query = f"{song_name} {artists} audio"
    ydl_opts = {
        "format": "bestaudio/best",  # Download the best quality audio
        "outtmpl": f"{song_name} - {artists}.mp3",  # Save as MP3
        "noplaylist": True,  # Ensure only a single song is downloaded
    }

    with YoutubeDL(ydl_opts) as ydl:
        ydl.download([f"ytsearch:{query}"])

# Main function
def main():
    url = input("Enter Spotify Track or Playlist URL: ")

    if "track" in url:
        # Fetch track details
        track_details = fetch_track_details(url)
        print("\nTrack Details:")
        print(f"Name: {track_details['name']}")
        print(f"Artists: {track_details['artists']}")
        print(f"Duration: {track_details['duration']}")
        print(f"Genres: {track_details['genres']}")

        # Download the track
        print("\nDownloading...")
        download_song(track_details["name"], track_details["artists"])
        print("Download complete!")

    elif "playlist" in url:
        # Fetch playlist details
        playlist_details = fetch_playlist_details(url)
        print(f"\nPlaylist Name: {playlist_details['name']}")

        for i, track in enumerate(playlist_details["tracks"], start=1):
            print(f"\nTrack {i}:")
            print(f"Name: {track['name']}")
            print(f"Artists: {track['artists']}")
            print(f"Duration: {track['duration']}")

            # Download each track
            print("\nDownloading...")
            download_song(track["name"], track["artists"])
            print("Download complete!")

    else:
        print("Invalid URL. Please provide a valid Spotify Track or Playlist URL.")

# Run the script
if __name__ == "__main__":
    main()