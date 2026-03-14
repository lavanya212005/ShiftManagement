"""
AI Chatbot service.

Answer chain (tries each in order):
  1. OpenAI GPT-3.5-turbo   — set OPENAI_API_KEY in .env
  2. Keyword-similarity fallback — always works, zero dependencies

The fallback scores each knowledge entry by counting shared words between the
question and the transcription text, then returns the best matching entry
with attribution to the original senior technician.
"""

import os
from typing import List, Dict, Tuple


# ── Public entry point ─────────────────────────────────────────────────────────

def get_chatbot_answer(
    question: str, context: List[Dict]
) -> Tuple[str, Dict]:
    """
    Generate an answer for a junior technician's question.

    Args:
        question: The question text.
        context:  List of knowledge entries, each a dict with keys:
                  technician, transcription, tags, date.

    Returns:
        (answer_text, source_info_dict)
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if api_key:
        try:
            return _openai_answer(question, context, api_key)
        except Exception as exc:
            print(f"[chatbot_service] OpenAI error (falling back): {exc}")

    return _keyword_answer(question, context)


# ── OpenAI backend ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are ShiftSync AI, an expert assistant for factory floor technicians. "
    "You help junior technicians solve equipment problems by drawing on a "
    "knowledge base built from senior technicians' voice recordings. "
    "Give clear, numbered, step-by-step solutions. "
    "Always attribute advice to the senior technician who originally reported it."
)


def _openai_answer(question: str, context: List[Dict], api_key: str) -> Tuple[str, Dict]:
    from openai import OpenAI  # type: ignore

    client = OpenAI(api_key=api_key)

    # Build context block (cap at 10 entries to stay within token budget)
    context_block = "\n\n".join(
        f"[{c['technician']} on {c['date'][:10]}]\n{c['transcription']}"
        for c in context[:10]
        if c.get("transcription")
    )

    user_message = (
        f"Knowledge base from senior technicians:\n{context_block}"
        f"\n\nJunior technician question: {question}"
    )

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=512,
        temperature=0.3,
    )

    answer = response.choices[0].message.content.strip()
    source = {"method": "openai_gpt35", "confidence": "high"}
    return answer, source


# ── Keyword-similarity fallback ────────────────────────────────────────────────

def _keyword_answer(question: str, context: List[Dict]) -> Tuple[str, Dict]:
    if not context:
        return (
            "The knowledge base is empty. Ask a senior technician to record "
            "their expertise first.",
            {"method": "fallback", "confidence": "none"},
        )

    question_words = set(question.lower().split())
    best_entry = None
    best_score = 0

    for entry in context:
        transcription = entry.get("transcription") or ""
        if not transcription:
            continue
        entry_words = set(transcription.lower().split())
        score = len(question_words & entry_words)
        if score > best_score:
            best_score = score
            best_entry = entry

    if best_entry and best_score > 0:
        confidence = min(int(best_score / max(len(question_words), 1) * 100), 98)
        answer = (
            f"Based on knowledge from **{best_entry['technician']}** "
            f"(recorded {best_entry['date'][:10]}):\n\n"
            f"{best_entry['transcription']}"
        )
        source = {
            "method": "keyword_match",
            "author": best_entry["technician"],
            "match_confidence": f"{confidence}%",
        }
    else:
        answer = (
            "No matching entries were found in the knowledge base for your question. "
            "Try rephrasing, or consult a senior technician directly."
        )
        source = {"method": "keyword_match", "confidence": "0%"}

    return answer, source
