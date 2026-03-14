"""
Speech-to-text service.

Transcription chain (tries each in order, uses first that succeeds):
  1. OpenAI Whisper (local model) — pip install openai-whisper
  2. Google SpeechRecognition   — pip install SpeechRecognition
  3. Returns a placeholder message so the rest of the pipeline keeps working.

Tag extraction uses lightweight rule-based NLP so it works with zero extra deps.
"""

import re
from typing import Tuple, List, Dict


# ── Public entry point ─────────────────────────────────────────────────────────

def transcribe_audio(file_path: str) -> Tuple[str, List[Dict]]:
    """
    Transcribe an audio file and extract problem/solution tags.

    Returns:
        (transcription_text, tags)
        tags: list of {"type": "problem"|"solution", "label": str}
    """
    transcription = _run_transcription(file_path)
    tags = _extract_tags(transcription)
    return transcription, tags


# ── Transcription backends ─────────────────────────────────────────────────────

def _run_transcription(file_path: str) -> str:
    # 1. Try Whisper (best accuracy, runs locally, no API key needed)
    try:
        import whisper  # type: ignore
        model = whisper.load_model("base")
        result = model.transcribe(file_path)
        return (result.get("text") or "").strip()
    except ImportError:
        pass
    except Exception as exc:
        print(f"[speech_service] Whisper error: {exc}")

    # 2. Try Google SpeechRecognition (requires internet, no API key for basic)
    try:
        import speech_recognition as sr  # type: ignore
        recognizer = sr.Recognizer()
        with sr.AudioFile(file_path) as source:
            audio = recognizer.record(source)
        return recognizer.recognize_google(audio)
    except ImportError:
        pass
    except Exception as exc:
        print(f"[speech_service] SpeechRecognition error: {exc}")

    return "[Transcription unavailable – install openai-whisper or SpeechRecognition]"


# ── Tag extraction ─────────────────────────────────────────────────────────────

_PROBLEM_KEYWORDS = [
    "vibrat", "leak", "overheat", "misalign", "error", "fail", "broken",
    "pressure drop", "noise", "stuck", "jam", "not working", "malfunction",
    "overload", "fault", "damage", "worn", "crack", "clog", "burn",
]

_SOLUTION_KEYWORDS = [
    "tighten", "replace", "calibrat", "adjust", "fix", "repair", "clean",
    "lubricate", "reset", "restart", "check", "inspect", "install",
    "remove", "swap", "realign", "flush", "bleed", "seal",
]


def _extract_context(text: str, keyword: str, before: int = 20, after: int = 50) -> str:
    """Return a short excerpt around the first occurrence of keyword."""
    idx = text.lower().find(keyword)
    if idx == -1:
        return ""
    snippet = text[max(0, idx - before): idx + after].strip()
    # Clean up leading/trailing partial words
    snippet = re.sub(r"^\W+|\W+$", "", snippet)
    return snippet.capitalize()[:60]


def _extract_tags(transcription: str) -> List[Dict]:
    tags: List[Dict] = []
    if not transcription or transcription.startswith("["):
        return tags

    for kw in _PROBLEM_KEYWORDS:
        label = _extract_context(transcription, kw)
        if label:
            tags.append({"type": "problem", "label": label})
            break  # one problem tag is enough

    for kw in _SOLUTION_KEYWORDS:
        label = _extract_context(transcription, kw)
        if label:
            tags.append({"type": "solution", "label": label})
            break  # one solution tag is enough

    return tags
