"""
YouTube Video Summarizer Service for SparkStudio AI.

Extracts transcripts from YouTube videos using youtube-transcript-api,
fetches metadata via YouTube oEmbed, and generates beginner-friendly
summaries using LLMService.
"""

import re
import logging
from typing import Dict, Any, Optional
import httpx

from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
)

from backend.config import settings
from backend.services.llm_service import LLMService

logger = logging.getLogger("sparkstudio.youtube")


def extract_video_id(url: str) -> Optional[str]:
    """
    Extract YouTube video ID from various URL formats or raw ID.
    Examples:
        - https://www.youtube.com/watch?v=dQw4w9WgXcQ
        - https://youtu.be/dQw4w9WgXcQ
        - https://www.youtube.com/shorts/dQw4w9WgXcQ
        - https://www.youtube.com/embed/dQw4w9WgXcQ
        - dQw4w9WgXcQ
    """
    if not url or not isinstance(url, str):
        return None
        
    url = url.strip()
    
    # Standard regex patterns for YouTube video IDs
    patterns = [
        r'(?:v=|\/|shorts\/|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
            
    return None


async def fetch_video_metadata(client: httpx.AsyncClient, video_id: str) -> Dict[str, str]:
    """
    Fetch video title and thumbnail URL using YouTube's public oEmbed API.
    """
    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    fallback_data = {
        "title": f"YouTube Video ({video_id})",
        "author_name": "YouTube Creator",
        "thumbnail_url": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    }
    
    try:
        response = await client.get(oembed_url, timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            return {
                "title": data.get("title", fallback_data["title"]),
                "author_name": data.get("author_name", fallback_data["author_name"]),
                "thumbnail_url": data.get("thumbnail_url", fallback_data["thumbnail_url"]),
            }
    except Exception as e:
        logger.warning(f"Could not fetch oEmbed metadata for video {video_id}: {e}")
        
    return fallback_data


def fetch_transcript(video_id: str) -> str:
    """
    Fetch transcript/captions for a YouTube video using youtube-transcript-api.
    Raises ValueError with user-friendly error message on failure.
    """
    import os
    import http.cookiejar
    import requests

    session = None
    cookies_path = getattr(settings, "YOUTUBE_COOKIES_PATH", "")
    if cookies_path and os.path.exists(cookies_path):
        try:
            session = requests.Session()
            cookie_jar = http.cookiejar.MozillaCookieJar(cookies_path)
            cookie_jar.load(ignore_discard=True, ignore_expires=True)
            session.cookies = cookie_jar
            logger.info(f"Loaded YouTube cookies from {cookies_path} for video {video_id}")
        except Exception as e:
            logger.error(f"Failed to load YouTube cookies from {cookies_path}: {e}")
            session = None

    try:
        ytt = YouTubeTranscriptApi(http_client=session)
        
        # Try fetching default transcript first
        try:
            snippets = ytt.fetch(video_id)
            full_text = " ".join([getattr(s, 'text', '') if not isinstance(s, dict) else s.get('text', '') for s in snippets])
            if full_text.strip():
                return full_text
        except Exception:
            pass
            
        # Try listing transcripts to find available languages
        transcript_list = ytt.list(video_id)
        
        # Try English transcripts first
        try:
            transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
        except Exception:
            # Fallback to any transcript available (manual or auto-generated)
            transcript = next(iter(transcript_list))
            
        snippets = transcript.fetch()
        full_text = " ".join([getattr(s, 'text', '') if not isinstance(s, dict) else s.get('text', '') for s in snippets])
        
        if not full_text.strip():
            raise ValueError("Transcript text was empty.")
            
        return full_text
        
    except (TranscriptsDisabled, NoTranscriptFound) as exc:
        logger.warning(f"Transcripts disabled or not found for {video_id}: {exc}")
        raise ValueError(
            "Captions/transcripts are not available for this YouTube video. "
            "Please make sure the video has public subtitles enabled or try another video link."
        )
    except VideoUnavailable as exc:
        logger.warning(f"Video {video_id} is unavailable: {exc}")
        raise ValueError(
            "The YouTube video is unavailable or private. Please check the URL and try again."
        )
    except ValueError:
        raise
    except Exception as exc:
        logger.error(f"Failed to extract transcript for {video_id}: {exc}")
        raise ValueError(
            f"Could not extract transcript from YouTube video. Please ensure the link is correct."
        )


def build_fallback_summary(video_title: str, transcript_text: str) -> Dict[str, Any]:
    """
    Generate a formatted fallback summary if LLM service is offline or in demo mode.
    """
    words = transcript_text.split()
    total_words = len(words)
    
    # Extract first few sentences as overview
    sentences = [s.strip() for s in re.split(r'[.!?]+', transcript_text) if len(s.strip()) > 15]
    overview = " ".join(sentences[:3]) + "." if sentences else f"Summary of {video_title}."
    
    # Pick key sentences as main takeaways
    step = max(1, len(sentences) // 4)
    key_points = [sentences[i] for i in range(0, min(len(sentences), step * 4), step)] if sentences else [video_title]
    
    markdown_content = f"""### 📌 Video Overview
{overview}

### 💡 Key Takeaways & Main Ideas
- **Core Subject:** {video_title}
"""
    for idx, point in enumerate(key_points[:4], 1):
        markdown_content += f"- **Key Point {idx}:** {point}.\n"
        
    markdown_content += f"""
### 🎯 Summary & Main Takeaway
This video ({total_words} words transcript analyzed) provides essential insights into **{video_title}**. Beginners can easily grasp the concept by focusing on the core ideas outlined above.
"""
    
    return {
        "summary": markdown_content.strip(),
        "key_takeaways": [p for p in key_points[:4]],
        "overview": overview
    }


async def generate_youtube_summary(
    client: httpx.AsyncClient,
    youtube_url: str
) -> Dict[str, Any]:
    """
    Full pipeline to summarize a YouTube video given its URL.
    Returns dictionary with status, video_id, metadata, formatted summary, and key takeaways.
    """
    video_id = extract_video_id(youtube_url)
    if not video_id:
        raise ValueError(
            "Invalid YouTube URL format. Please provide a valid YouTube video link (e.g., https://www.youtube.com/watch?v=...)"
        )
        
    # 1. Fetch metadata in parallel with transcript fetching
    metadata = await fetch_video_metadata(client, video_id)
    video_title = metadata.get("title", "YouTube Video")
    
    # 2. Extract transcript
    transcript_text = fetch_transcript(video_id)
    
    # Truncate transcript to max ~12,000 words to stay safely within context limit
    words = transcript_text.split()
    if len(words) > 12000:
        transcript_text = " ".join(words[:12000]) + "..."
        
    # 3. Call LLM to summarize
    if settings.DEMO_MODE:
        fallback = build_fallback_summary(video_title, transcript_text)
        return {
            "status": "success",
            "video_id": video_id,
            "title": video_title,
            "author_name": metadata.get("author_name"),
            "thumbnail_url": metadata.get("thumbnail_url"),
            "summary": fallback["summary"],
            "key_takeaways": fallback["key_takeaways"],
            "raw_transcript_length": len(transcript_text),
        }
        
    system_prompt = (
        "You are an expert AI Video Content Summarizer. Your goal is to generate a concise, "
        "easy-to-understand summary in simple English so that even beginners can quickly understand "
        "the key ideas and main takeaways of a YouTube video.\n\n"
        "Formatting Guidelines:\n"
        "1. Start with a '### 📌 Video Overview' section (2-3 simple, clear sentences).\n"
        "2. Include a '### 💡 Key Takeaways & Important Points' section using bullet points. Bold important key terms.\n"
        "3. Include a '### 🎯 Beginner's Summary & Takeaway' section highlighting the main actionable message.\n"
        "4. Keep the wording clear, engaging, and free of unnecessary fluff."
    )
    
    prompt = (
        f"Please summarize the following YouTube video content:\n\n"
        f"Video Title: {video_title}\n\n"
        f"Video Transcript:\n{transcript_text}\n\n"
        f"Generate the formatted summary now."
    )
    
    llm = LLMService(client)
    try:
        raw_summary = await llm.generate(prompt=prompt, system_prompt=system_prompt)
        
        # Parse bullet points for key takeaways list if possible
        takeaways = []
        for line in raw_summary.split("\n"):
            cleaned = line.strip()
            if cleaned.startswith("- ") or cleaned.startswith("* "):
                clean_point = re.sub(r'^[\-\*]\s*', '', cleaned)
                clean_point = re.sub(r'\*\*(.*?)\*\*', r'\1', clean_point)  # strip bold markdown for key list
                takeaways.append(clean_point)
                
        return {
            "status": "success",
            "video_id": video_id,
            "title": video_title,
            "author_name": metadata.get("author_name"),
            "thumbnail_url": metadata.get("thumbnail_url"),
            "summary": raw_summary.strip(),
            "key_takeaways": takeaways[:5] if takeaways else [f"Main concepts from {video_title}"],
            "raw_transcript_length": len(transcript_text),
        }
    except Exception as e:
        logger.warning(f"LLM generation failed for YouTube summary ({e}). Using fallback summarizer.")
        fallback = build_fallback_summary(video_title, transcript_text)
        return {
            "status": "success",
            "video_id": video_id,
            "title": video_title,
            "author_name": metadata.get("author_name"),
            "thumbnail_url": metadata.get("thumbnail_url"),
            "summary": fallback["summary"],
            "key_takeaways": fallback["key_takeaways"],
            "raw_transcript_length": len(transcript_text),
        }
