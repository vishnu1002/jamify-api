import os
import time
import sys
import json
import requests
from dotenv import load_dotenv
from cachetools import cached, TTLCache

# Load environment variables
load_dotenv()

# Get API and proxy URLs
API_URLS = os.getenv("API_URLS", "").split(",")
PROXY_URLS = os.getenv("PROXY_URLS", "").split(",")

if not API_URLS or not PROXY_URLS:
    raise ValueError("API_URLS or PROXY_URLS not set in .env file")

# Cache and session setup
cache = TTLCache(maxsize=100, ttl=3600)
session = requests.Session()
MAX_RETRIES = 3

@cached(cache)
def fetch_audio_url(video_id):
    for _ in range(MAX_RETRIES):
        for api_url in API_URLS:
            try:
                video_data = session.get(f"{api_url}/{video_id}", timeout=10).json()
                audio_url = next(
                    (fmt["url"] for fmt in video_data.get("adaptiveFormats", [])
                     if fmt.get("audioQuality") == "AUDIO_QUALITY_MEDIUM" and fmt.get("type") == 'audio/mp4; codecs="mp4a.40.2"'),
                    None
                )
                if audio_url and check_url(audio_url):
                    print(f"[working]: {api_url}", file=sys.stderr)
                    return audio_url
                proxy_audio_url = next((url for url in (audio_url.replace(audio_url.split('/')[2], proxy.replace("https://", "")) for proxy in PROXY_URLS) if check_url(url)), None)
                if proxy_audio_url:
                    return proxy_audio_url
            except Exception as e:
                print(f"Error fetching from {api_url}: {e}", file=sys.stderr)
        time.sleep(5)
    return None

def check_url(url):
    try:
        response = session.head(url, timeout=5)
        return response.status_code in [200, 206]
    except Exception as e:
        return False

def fetch_audio_urls(video_ids):
    return {video_id: fetch_audio_url(video_id) for video_id in video_ids}

if __name__ == "__main__":
    video_ids = json.loads(sys.argv[1]) if len(sys.argv) > 1 else ["IZHGcU0U_W0"]
    audio_urls = fetch_audio_urls(video_ids)
    print(json.dumps(audio_urls))  # Output the result as a JSON string