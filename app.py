"""
SnapSolve AI - AI Study Assistant
Uses Gemma 4 via OpenRouter API.
Built for the DEV Community Gemma 4 Challenge.
"""

import os
import requests
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify

# CONFIGURATION
load_dotenv()
API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL_NAME = "google/gemma-4-31b-it"

if not API_KEY:
    raise ValueError("❌ OPENROUTER_API_KEY not found in .env file")

# INITIALIZE 
app = Flask(__name__)

# PROMPT BUILDER
def build_prompt(question, subject, mode):
    """Build the appropriate prompt based on subject and mode."""
    
    base_instruction = """You are an expert teacher helping a student. 
Be friendly, encouraging, and use simple words.
Always structure your answer clearly."""

    if mode == "short":
        length_instruction = "Give ONLY the final answer in 1-2 sentences. Be direct."
    else:
        length_instruction = """Provide a complete explanation with:
1. What the question is asking
2. Key concepts needed
3. Step-by-step solution
4. Final answer"""

    subject_guides = {
        "math": "Explain mathematical concepts simply. Show all calculation steps clearly.",
        "physics": "Explain physics concepts with real-world examples. Break down formulas.",
        "english": "Explain grammar, meaning, or literary concepts with examples.",
        "general": "Explain the topic in the simplest way possible with examples."
    }
    
    subject_guide = subject_guides.get(subject, subject_guides["general"])
    
    return f"""{base_instruction}

Subject: {subject}
{subject_guide}

{length_instruction}

Student's Question:
{question}

Your Explanation:"""


def ask_gemma(question, subject, mode):
    """Send question to Gemma 4 via OpenRouter and get response."""
    prompt = build_prompt(question, subject, mode)
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": MODEL_NAME,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"]
        else:
            return f"⚠️ API Error: {response.status_code} - {response.text}"
            
    except requests.exceptions.Timeout:
        return "⚠️ Request timed out. Please try again."
    except Exception as e:
        return f"⚠️ Error: {str(e)}"


# ROUTES 
@app.route('/')
def home():
    """Render the main page."""
    return render_template('index.html')


@app.route('/ask', methods=['POST'])
def ask():
    """Handle question submission."""
    data = request.get_json()
    question = data.get('question', '').strip()
    subject = data.get('subject', 'general')
    mode = data.get('mode', 'full')
    
    # Validate input
    if not question:
        return jsonify({'error': 'Please enter a question.'}), 400
    
    if len(question) < 5:
        return jsonify({'error': 'Question is too short. Please add more detail.'}), 400
    
    if len(question) > 2000:
        return jsonify({'error': 'Question is too long. Please keep it under 2000 characters.'}), 400
    
    # Get answer from Gemma 4
    answer = ask_gemma(question, subject, mode)
    
    return jsonify({
        'answer': answer,
        'question': question,
        'subject': subject,
        'mode': mode
    })

# RUN
if __name__ == '__main__':
    print("=" * 50)
    print("🎓 SnapSolve AI is running!")
    print(f"📍 Open: http://127.0.0.1:5000")
    print(f"🧠 Model: {MODEL_NAME}")
    print(f"🔗 API: OpenRouter")
    print("=" * 50)
    app.run(debug=True)