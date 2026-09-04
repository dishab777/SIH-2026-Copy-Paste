import json
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from api.core.config import get_settings


class KPIItem(BaseModel):
    metric: str = Field(..., description="The quantifiable metric being measured")
    target: str = Field(..., description="Target threshold or goal (e.g. 'Reduction by 40% in 3 months')")


class GeneratedChallenge(BaseModel):
    problem_statement: str = Field(..., description="Clear, formal public procurement problem statement")
    kpis: List[KPIItem] = Field(..., description="Measurable pilot key performance indicators")
    tags: List[str] = Field(..., description="Relevant technology keywords for startup matching")


PROMPT_SYSTEM_INSTRUCTION = (
    "You are an expert Public Procurement & Innovation Advisor for Government departments. "
    "Your job is to convert raw, unstructured department pain points into structured public procurement challenges. "
    "You MUST output strictly valid JSON format with the following keys:\n"
    "- 'problem_statement': (string) A comprehensive, articulate statement describing the challenge, scope, and desired outcome.\n"
    "- 'kpis': (array of objects) Each object must have 'metric' (string) and 'target' (string).\n"
    "- 'tags': (array of strings) Normalized technical and domain tags (e.g., 'AI/ML', 'IoT', 'Computer Vision', 'GIS', 'CleanTech').\n\n"
    "Do NOT output markdown explanations, prologues, or epilogues. Return ONLY the JSON object."
)


def _clean_json_text(text: str) -> str:
    """Strip markdown backticks if present."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


async def generate_challenge_from_pain_point(department_pain_point: str) -> Dict[str, Any]:
    """
    Generates structured challenge from a raw pain point using either OpenAI or Google Gemini.
    """
    settings = get_settings()
    raw_response_text = ""

    user_prompt = (
        f"Convert this pain point into a structured public procurement challenge:\n\n"
        f"Department Pain Point:\n\"\"\"{department_pain_point}\"\"\"\n\n"
        f"Output strictly in JSON format with keys: problem_statement, kpis (array of dicts with 'metric' and 'target'), and tags (array of tech keywords)."
    )

    # 1. Try OpenAI if key is present
    if settings.OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            completion = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": PROMPT_SYSTEM_INSTRUCTION},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
            )
            raw_response_text = completion.choices[0].message.content or ""
        except Exception as e:
            # If OpenAI fails or fails to import, log and continue to fallback
            print(f"[AIService] OpenAI generation error: {e}")

    # 2. Try Gemini if OpenAI was not used or failed
    if not raw_response_text and settings.GEMINI_API_KEY:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=f"{PROMPT_SYSTEM_INSTRUCTION}\n\n{user_prompt}",
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                ),
            )
            raw_response_text = response.text or ""
        except Exception as e:
            print(f"[AIService] Gemini generation error: {e}")

    # 3. Fallback mock generator if no API key is provided (ensures tests and local dev work immediately)
    if not raw_response_text:
        return _mock_challenge_generation(department_pain_point)

    # Parse and validate with Pydantic
    try:
        cleaned_text = _clean_json_text(raw_response_text)
        parsed_data = json.loads(cleaned_text)
        validated = GeneratedChallenge.model_validate(parsed_data)
        return validated.model_dump()
    except Exception as parse_err:
        print(f"[AIService] JSON validation error ({parse_err}). Falling back to heuristic extraction.")
        return _mock_challenge_generation(department_pain_point)


def _mock_challenge_generation(pain_point: str) -> Dict[str, Any]:
    """
    Deterministic fallback when AI keys are not configured or external calls fail.
    """
    # Extract keywords
    words = [w.capitalize() for w in re.findall(r"\b[A-Za-z]{4,}\b", pain_point)]
    sample_tags = list(dict.fromkeys(words[:4])) or ["GovTech", "Innovation", "Digital India"]

    return {
        "problem_statement": (
            f"Public Innovation Pilot: Address and resolve operational bottlenecks related to '{pain_point.strip()}'. "
            f"The selected startup will deploy an automated, scalable solution adhering to departmental compliance."
        ),
        "kpis": [
            {"metric": "Processing / Turnaround Time Reduction", "target": "Improve efficiency by at least 40%"},
            {"metric": "System Accuracy & Compliance", "target": "Achieve 98%+ validation score during pilot phase"},
            {"metric": "User Adoption Rate", "target": "Onboard 500+ departmental users within 60 days"},
        ],
        "tags": sample_tags + ["Automation", "Cloud Integration"],
    }
