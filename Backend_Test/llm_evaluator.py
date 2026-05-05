import os
import json
import google.generativeai as genai
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Define the expected output format for Gemini
class EvaluationResult(BaseModel):
    score: int
    passed: bool
    reason: str

def evaluate_api_response(endpoint: str, expected_behavior: str, actual_status: int, actual_body: str) -> dict:
    """
    Calls the Gemini API to intelligently evaluate an API response against expected behavior,
    handling dynamic data (UUIDs, timestamps, JWTs) seamlessly.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in .env")

    model = genai.GenerativeModel('gemini-2.5-flash')

    prompt = f"""
You are an expert API testing engineer. Evaluate the following actual API response against the expected behavior.
Ignore dynamic values like exact timestamps, JWTs, or UUIDs unless their format is explicitly part of the expectation.

Endpoint Tested: {endpoint}

EXPECTED BEHAVIOR / SCHEMA:
{expected_behavior}

ACTUAL RESPONSE STATUS: {actual_status}
ACTUAL RESPONSE BODY:
{actual_body}

Evaluate if the response correctly fulfills the expectation.
Respond strictly with a JSON object matching this schema:
{{
    "score": <0 to 10 integer>,
    "passed": <boolean>,
    "reason": "<string explaining the score and any discrepancies>"
}}
"""
    try:
        # Request JSON output
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        result = json.loads(response.text)
        return result
    except Exception as e:
        return {
            "score": 0,
            "passed": False,
            "reason": f"LLM Evaluation failed: {str(e)}"
        }
