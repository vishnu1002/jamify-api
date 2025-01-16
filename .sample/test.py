import os
import time
import logging
import asyncio
import aiohttp
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from cachetools import cached, TTLCache
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from yt_dlp import YoutubeDL

load_dotenv()
app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Spotify API credentials
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")

# Initialize Spotipy client
sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(client_id=CLIENT_ID, client_secret=CLIENT_SECRET))

# Get API and proxy URLs from environment variables
API_URLS = os.getenv("API_URLS", "").split(",")
PROXY_URLS = os.getenv("PROXY_URLS", "").split(",")

# Validate environment variables
if not API_URLS or not PROXY_URLS:
    raise ValueError("API_URLS or PROXY_URLS not set in .env file")

# Cache with a time-to-live (TTL) of 1 hour
cache = TTLCache(maxsize=100, ttl=3600)

# Retry limit
MAX_RETRIES = 3

# Route to serve the homepage
@app.route("/")
def home():
    return render_template("index.html")

# Route to fetch Spotify track details and YouTube audio URL
@app.route("/search", methods=["POST"])
def search():
    data = request.json
    spotify_url = data.get("spotify_url")

    # Run the async task
    result = asyncio.run(fetch_all_data(spotify_url))
    return jsonify(result)

# Async function to fetch all data
async def fetch_all_data(spotify_url):
    async with aiohttp.ClientSession() as session:
        # Fetch Spotify track details and YouTube video ID in parallel
        spotify_task = asyncio.create_task(fetch_spotify_track_details(spotify_url))
        youtube_task = asyncio.create_task(fetch_youtube_video_id(spotify_url))

        # Wait for both tasks to complete
        spotify_details, video_id = await asyncio.gather(spotify_task, youtube_task)

        if not spotify_details or not video_id:
            return {"success": False, "error": "Failed to fetch Spotify details or YouTube video ID."}

        # Fetch YouTube audio stream URL
        audio_url = await fetch_audio_url(video_id, session)
        if not audio_url:
            return {"success": False, "error": "Could not fetch audio stream URL."}

        # Add audio URL to track details
        spotify_details["audio_url"] = audio_url
        return {"success": True, "track_details": spotify_details}

# Async function to fetch Spotify track details
async def fetch_spotify_track_details(spotify_url):
    try:
        track_id = spotify_url.split("track/")[1].split("?")[0]
        track = sp.track(track_id)
        artist = sp.artist(track["artists"][0]["id"])
        return {
            "name": track["name"],
            "artists": ", ".join(artist["name"] for artist in track["artists"]),
            "duration": f"{track['duration_ms'] // 60000}:{(track['duration_ms'] % 60000) // 1000:02}",
            "genre": ", ".join(artist["genres"]) or "N/A",
            "cover_image": track["album"]["images"][0]["url"],
        }
    except Exception as e:
        logging.error(f"Error fetching Spotify track details: {e}")
        return None

# Async function to fetch YouTube video ID using yt-dlp
async def fetch_youtube_video_id(spotify_url):
    try:
        track_id = spotify_url.split("track/")[1].split("?")[0]
        track = sp.track(track_id)
        query = f"{track['name']} {track['artists'][0]['name']}"
        ydl_opts = {
            "format": "bestaudio/best",
            "extract_flat": True,
            "quiet": True,
        }
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch:{query}", download=False)
            if "entries" in info:
                return info["entries"][0]["id"]
    except Exception as e:
        logging.error(f"Error fetching YouTube video ID: {e}")
    return None

# Async function to fetch YouTube audio stream URL
@cached(cache)
async def fetch_audio_url(video_id, session):
    retries = 0
    while retries < MAX_RETRIES:
        for api_url in API_URLS:
            try:
                video_data = await fetch_video_data(api_url, video_id, session)
                if video_data:
                    audio_url = extract_audio_url(video_data)
                    if audio_url and await check_url(audio_url, session):
                        logging.info(f"Using API URL: {api_url}")
                        return audio_url
                    proxy_audio_url = await try_proxy_urls(audio_url, session)
                    if proxy_audio_url:
                        return proxy_audio_url
            except Exception as e:
                logging.error(f"Error fetching from {api_url}: {e}")
        retries += 1
        logging.info(f"Retry attempt {retries} of {MAX_RETRIES}")
        await asyncio.sleep(5)  # Add a 5-second delay between retries
    return None

async def fetch_video_data(api_url, video_id, session):
    async with session.get(f"{api_url}/{video_id}", timeout=10) as response:
        if response.status == 200:
            return await response.json()
    return None

def extract_audio_url(video_data):
    for format in video_data.get("adaptiveFormats", []):
        if format.get("audioQuality") == "AUDIO_QUALITY_MEDIUM" and format.get("type") == 'audio/mp4; codecs="mp4a.40.2"':
            return format.get("url")
    return None

async def try_proxy_urls(audio_url, session):
    for proxy_url in PROXY_URLS:
        try:
            proxy_domain = proxy_url.replace("https://", "")
            proxy_audio_url = audio_url.replace(audio_url.split('/')[2], proxy_domain)
            if await check_url(proxy_audio_url, session):
                logging.info(f"Using Proxy URL: {proxy_url}")
                return proxy_audio_url
        except Exception as e:
            logging.error(f"Error with proxy {proxy_url}: {e}")
    return None

async def check_url(url, session):
    try:
        async with session.head(url, timeout=5) as response:
            if response.status in [200, 206]:
                return True
            elif response.status == 403:
                logging.warning(f"403 Forbidden error for URL: {url}")
                return False
    except Exception as e:
        logging.error(f"Error checking URL {url}: {e}")
    return False

# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True)