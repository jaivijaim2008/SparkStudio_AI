"""
CreatorPilot AI — Pydantic v2 Schemas.

Every data structure exchanged between agents, the API layer, and the
front-end is defined here as a strict Pydantic v2 model.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ════════════════════════════════════════════════════════════════════════
# Input
# ════════════════════════════════════════════════════════════════════════


class ProjectInput(BaseModel):
    """User-provided parameters that kick off the content pipeline."""

    topic: str = Field(
        ...,
        min_length=2,
        max_length=500,
        description="The video/content topic or idea",
        examples=["AI replacing programmers"],
    )
    platform: str = Field(
        default="YouTube Shorts",
        description="Target platform (YouTube Shorts, TikTok, Instagram Reels, YouTube Long-form)",
        examples=["YouTube Shorts", "TikTok", "Instagram Reels"],
    )
    audience: str = Field(
        default="General",
        description="Target audience demographic",
        examples=["Students", "Professionals", "Gen Z"],
    )
    tone: str = Field(
        default="Informative",
        description="Desired tone of the content",
        examples=["Funny", "Serious", "Motivational", "Sarcastic"],
    )
    language: str = Field(
        default="English",
        description="Primary language for the content",
        examples=["English", "Hindi", "Spanish"],
    )
    video_length: int = Field(
        default=60,
        ge=15,
        le=3600,
        description="Target video length in seconds",
        examples=[30, 60, 90, 180],
    )
    user_email: Optional[str] = Field(
        default=None,
        description="The email of the user who created this project"
    )


# ════════════════════════════════════════════════════════════════════════
# Agent Outputs
# ════════════════════════════════════════════════════════════════════════


class ResearchOutput(BaseModel):
    """Output from the Research Agent — market & audience intelligence."""

    trends: list[str] = Field(default_factory=list, description="Current trending angles related to the topic")
    audience_analysis: str = Field(default="", description="Deep-dive into the target audience's mindset")
    viral_angles: list[str] = Field(default_factory=list, description="Angles most likely to go viral")
    hooks: list[str] = Field(default_factory=list, description="Attention-grabbing opening hooks")
    pain_points: list[str] = Field(default_factory=list, description="Audience pain points the content should address")
    faqs: list[str] = Field(default_factory=list, description="Frequently asked questions about the topic")
    interesting_facts: list[str] = Field(default_factory=list, description="Surprising facts to boost engagement")


class ScriptSection(BaseModel):
    """A single section/block inside the script."""

    label: str = Field(..., description="Section label, e.g. Hook, Problem, Solution, CTA")
    time_range: str = Field(..., description="Timestamp range, e.g. 0:00-0:05")
    content: str = Field(..., description="The actual script copy for this section")
    duration_seconds: int = Field(..., ge=0, description="Duration of this section in seconds")


class ScriptOutput(BaseModel):
    """Output from the Script Agent — the full video script."""

    hook: str = Field(..., description="Opening hook line")
    sections: list[ScriptSection] = Field(default_factory=list, description="Ordered list of script sections")
    full_script: str = Field(..., description="Complete script as a single block of text")
    word_count: int = Field(default=0, ge=0, description="Total word count")
    estimated_duration: int = Field(default=0, ge=0, description="Estimated spoken duration in seconds")


class StoryboardScene(BaseModel):
    """A single scene inside the visual storyboard."""

    scene_number: int = Field(..., ge=1, description="Scene ordinal (1-based)")
    duration: str = Field(..., description="Duration string, e.g. '5s'")
    camera_angle: str = Field(default="", description="Suggested camera angle (close-up, wide, etc.)")
    animation: str = Field(default="", description="Animation or motion-graphics direction")
    background: str = Field(default="", description="Background description or colour")
    emotion: str = Field(default="", description="Intended emotional beat")
    visual_description: str = Field(default="", description="What the viewer sees on screen")
    image_prompt: str = Field(default="", description="AI-image-generator prompt for this scene")
    broll_suggestions: list[str] = Field(default_factory=list, description="Suggested B-roll clips")
    transition: str = Field(default="cut", description="Transition to the next scene")


class StoryboardOutput(BaseModel):
    """Output from the Storyboard Agent — visual plan for every scene."""

    scenes: list[StoryboardScene] = Field(default_factory=list, description="Ordered scenes")
    total_duration: str = Field(default="", description="Total duration of the storyboard")


class ThumbnailOutput(BaseModel):
    """Output from the Thumbnail Agent — click-worthy thumbnail design."""

    text: str = Field(default="", description="Bold text overlay for the thumbnail")
    clickbait_score: int = Field(default=0, ge=0, le=100, description="Predicted clickbait effectiveness 0-100")
    emotion: str = Field(default="", description="Primary emotion the thumbnail should convey")
    color_suggestions: list[str] = Field(default_factory=list, description="Recommended colour palette")
    layout: str = Field(default="", description="Layout description (rule of thirds, centered, etc.)")
    image_prompt: str = Field(default="", description="AI-image-generator prompt for the thumbnail")


class SEOOutput(BaseModel):
    """Output from the SEO Agent — metadata for maximum discoverability."""

    title: str = Field(default="", description="Optimised video title")
    description: str = Field(default="", description="Video description with keywords")
    keywords: list[str] = Field(default_factory=list, description="Primary SEO keywords")
    tags: list[str] = Field(default_factory=list, description="Platform tags")
    hashtags: list[str] = Field(default_factory=list, description="Hashtags for social reach")
    best_upload_time: str = Field(default="", description="Recommended upload time window")


class SubtitleEntry(BaseModel):
    """A single subtitle/caption cue."""

    index: int = Field(..., ge=1, description="Cue index (1-based)")
    start_time: str = Field(..., description="Start timestamp, e.g. 00:00:01,000")
    end_time: str = Field(..., description="End timestamp, e.g. 00:00:03,500")
    text: str = Field(..., description="Subtitle text")
    emoji_caption: str = Field(default="", description="Emoji-enhanced caption variant")
    highlighted_words: list[str] = Field(default_factory=list, description="Words to emphasise/highlight")


class SubtitleOutput(BaseModel):
    """Output from the Subtitle Agent — captions in multiple formats."""

    srt_content: str = Field(default="", description="Full SRT file content")
    vtt_content: str = Field(default="", description="Full WebVTT file content")
    entries: list[SubtitleEntry] = Field(default_factory=list, description="Structured subtitle entries")


class VoiceOutput(BaseModel):
    """Output from the Voice-Over Agent — narration directions."""

    narration_script: str = Field(default="", description="Clean narration script for voice talent / TTS")
    speaking_speed: str = Field(default="medium", description="Recommended speaking speed")
    pauses: list[str] = Field(default_factory=list, description="Where to insert dramatic pauses")
    emotion_directions: list[str] = Field(default_factory=list, description="Emotion cues per section")
    pronunciation_guide: dict[str, str] = Field(
        default_factory=dict,
        description="Word → pronunciation mapping for tricky terms",
    )


class QualityMetric(BaseModel):
    """An individual quality-check metric."""

    name: str = Field(..., description="Metric name, e.g. Hook Strength")
    score: int = Field(..., ge=0, le=100, description="Score from 0 to 100")
    details: str = Field(default="", description="Explanation of the score")


class QualityOutput(BaseModel):
    """Output from the Quality Agent — final content audit."""

    overall_score: int = Field(default=0, ge=0, le=100, description="Aggregate quality score")
    metrics: list[QualityMetric] = Field(default_factory=list, description="Individual metric scores")
    suggestions: list[str] = Field(default_factory=list, description="Actionable improvement suggestions")
    improvements: list[str] = Field(default_factory=list, description="Specific content improvements")


# ════════════════════════════════════════════════════════════════════════
# Pipeline / Status
# ════════════════════════════════════════════════════════════════════════


class AgentStatus(BaseModel):
    """Real-time status of a single agent in the pipeline."""

    agent_name: str = Field(..., description="Agent identifier")
    status: Literal["pending", "running", "completed", "error"] = Field(
        default="pending", description="Current execution status"
    )
    started_at: Optional[datetime] = Field(default=None, description="When the agent started")
    completed_at: Optional[datetime] = Field(default=None, description="When the agent finished")
    error_message: Optional[str] = Field(default=None, description="Error details if status is 'error'")


class PipelineStatus(BaseModel):
    """Aggregated status of the entire pipeline run."""

    project_id: str = Field(..., description="Unique project identifier")
    statuses: list[AgentStatus] = Field(default_factory=list, description="Per-agent statuses")
    current_agent: Optional[str] = Field(default=None, description="Name of the currently running agent")
    progress_percent: float = Field(default=0.0, ge=0, le=100, description="Overall progress percentage")


class ProjectResult(BaseModel):
    """Complete project output — the union of all agent results."""

    project_id: str = Field(..., description="Unique project identifier")
    input: ProjectInput = Field(..., description="Original user input")
    research: Optional[ResearchOutput] = Field(default=None)
    script: Optional[ScriptOutput] = Field(default=None)
    storyboard: Optional[StoryboardOutput] = Field(default=None)
    thumbnail: Optional[ThumbnailOutput] = Field(default=None)
    seo: Optional[SEOOutput] = Field(default=None)
    subtitles: Optional[SubtitleOutput] = Field(default=None)
    voice: Optional[VoiceOutput] = Field(default=None)
    quality: Optional[QualityOutput] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When the project was created")
