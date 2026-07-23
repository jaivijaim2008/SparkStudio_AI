"""
YouTube Video Summarizer Service for SparkStudio AI.

Extracts transcripts from YouTube videos using youtube-transcript-api,
fetches metadata via YouTube oEmbed, and generates beginner-friendly
summaries using LLMService.
"""

import re
import logging
import asyncio
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
    Falls back to a public URL-based transcript extractor if local fetching fails (e.g. cloud IP blocked).
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
        
    except Exception as exc:
        logger.warning(
            "youtube-transcript-api failed for video %s: %s. Trying public transcript fallback...",
            video_id, exc
        )
        # Fallback to public URL extractor
        try:
            url = f"https://youtube-transcript.ai/transcript/{video_id}.txt"
            res = requests.get(url, timeout=15)
            if res.status_code == 200 and res.text:
                raw_text = res.content.decode("utf-8")
                # Clean timestamps and headers
                if "## Transcript" in raw_text:
                    raw_text = raw_text.split("## Transcript", 1)[1]
                # Remove timestamps like [0:02]
                cleaned = re.sub(r'\[\d+:\d+(?::\d+)?\]', '', raw_text)
                lines = [line.strip() for line in cleaned.split("\n") if line.strip()]
                full_text = " ".join(lines)
                if full_text.strip():
                    logger.info("Successfully fetched transcript from fallback service")
                    return full_text
        except Exception as fallback_exc:
            logger.error("Fallback transcript service failed: %s", fallback_exc)

        raise ValueError(
            "Could not extract transcript from YouTube video. Please ensure the link is correct."
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


async def summarize_chunks(
    llm: LLMService,
    transcript_text: str,
    video_title: str
) -> str:
    """
    Summarize a long transcript in chunks to avoid rate limits (TPM limits) of free providers like Groq.
    """
    words = transcript_text.split()
    chunk_size = 1200 # ~1500 tokens
    chunks = [" ".join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]
    
    logger.info(f"Splitting transcript into {len(chunks)} chunks for summarization.")
    
    chunk_summaries = []
    for idx, chunk in enumerate(chunks, 1):
        chunk_prompt = (
            f"Summarize the following section of the YouTube video '{video_title}':\n\n"
            f"Section {idx}/{len(chunks)} Transcript:\n{chunk}\n\n"
            f"Provide a brief bulleted summary of this section."
        )
        try:
            summary = await llm.generate(
                prompt=chunk_prompt,
                system_prompt="You are an assistant summarizing a section of a transcript. Keep it concise."
            )
            chunk_summaries.append(summary.strip())
            # Wait a small delay to avoid hitting TPM rate limit on subsequent requests
            await asyncio.sleep(2.0)
        except Exception as e:
            logger.warning(f"Failed to summarize chunk {idx}: {e}")
            
    if not chunk_summaries:
        raise ValueError("Failed to summarize any of the transcript chunks.")
        
    # Combine the chunk summaries
    combined_summaries_text = "\n\n".join(
        [f"--- Section {idx} Summary ---\n{s}" for idx, s in enumerate(chunk_summaries, 1)]
    )
    
    final_system_prompt = (
        "You are an expert AI Video Content Summarizer and Blog Writer. Your goal is to combine multiple section summaries "
        "of a YouTube video into a unified summary and a highly detailed, professional blog post/article.\n\n"
        "Formatting Guidelines:\n"
        "1. Start with a '### 📌 Video Overview' section (2-3 simple, clear sentences).\n"
        "2. Include a '### 💡 Key Takeaways & Important Points' section using bullet points. Bold important key terms.\n"
        "3. Include a '### 🎯 Beginner's Summary & Takeaway' section highlighting the main actionable message.\n"
        "4. Include a '### 📝 Detailed Blog Post / Article' section. Write a cohesive, comprehensive, and engaging article "
        "(300-500 words) with subheadings explaining the concepts in detail. Use a professional, informative tone suitable for publishing.\n"
        "5. Keep the wording clear, engaging, and free of unnecessary fluff."
    )
    
    final_prompt = (
        f"Combine the following section summaries of the video '{video_title}' into a single unified summary:\n\n"
        f"{combined_summaries_text}\n\n"
        f"Generate the formatted unified summary now."
    )
    
    return await llm.generate(prompt=final_prompt, system_prompt=final_system_prompt)


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
        "You are an expert AI Video Content Summarizer and Blog Writer. Your goal is to generate a concise, "
        "easy-to-understand summary followed by a highly detailed, professional blog post/article based on the YouTube video.\n\n"
        "Formatting Guidelines:\n"
        "1. Start with a '### 📌 Video Overview' section (2-3 simple, clear sentences).\n"
        "2. Include a '### 💡 Key Takeaways & Important Points' section using bullet points. Bold important key terms.\n"
        "3. Include a '### 🎯 Beginner's Summary & Takeaway' section highlighting the main actionable message.\n"
        "4. Include a '### 📝 Detailed Blog Post / Article' section. Write a cohesive, comprehensive, and engaging article "
        "(300-500 words) with subheadings explaining the concepts in detail. Use a professional, informative tone suitable for publishing.\n"
        "5. Keep the wording clear, engaging, and free of unnecessary fluff."
    )
    
    prompt = (
        f"Please summarize the following YouTube video content:\n\n"
        f"Video Title: {video_title}\n\n"
        f"Video Transcript:\n{transcript_text}\n\n"
        f"Generate the formatted summary now."
    )
    
    llm = LLMService(client)
    try:
        # If the transcript is long and using Groq, chunk it to avoid TPM rate limits
        words = transcript_text.split()
        if len(words) > 1500 and settings.LLM_PROVIDER == "groq":
            logger.info("Transcript exceeds 1500 words and LLM_PROVIDER is groq. Using chunk-based summarization.")
            raw_summary = await summarize_chunks(llm, transcript_text, video_title)
        else:
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
