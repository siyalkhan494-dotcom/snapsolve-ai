"""
SnapSolve AI - AI Study Assistant
Uses Gemma 4 via OpenRouter API.
Features: Detailed/Short answers, Urdu mode, History, Dark mode
Built for the DEV Community Gemma 4 Challenge.
"""

import os
import requests
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify

# ─── CONFIGURATION ───────────────────────────────────────────
load_dotenv()
API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL_NAME = "google/gemma-4-31b-it"

if not API_KEY:
    raise ValueError("❌ OPENROUTER_API_KEY not found in .env file")

app = Flask(__name__)
chat_sessions = {}


# ─── PROMPT BUILDERS ─────────────────────────────────────────

def build_prompt(question, subject, mode, history):
    """Build exam-style prompt with no fluff."""
    
    base_instruction = """You are an expert teacher answering a student's exam question.
RULES:
- NO greetings, NO encouragement, NO motivational text
- NO phrases like "Hello there", "You've got this", "Good luck"
- Use proper headings and subheadings
- Structure your answer clearly with bullet points where helpful
- Be direct and professional
- End with exactly 3 related questions under a "Related Questions" heading"""

    if mode == "short":
        length_instruction = "Give a concise, direct answer in 2-3 sentences. No headings needed. End with 2 related questions."
    else:
        length_instruction = """Structure your answer as:

## Definition
[Clear 1-2 sentence definition]

## Key Points
- Point 1
- Point 2
- Point 3

## Detailed Explanation
[Organized explanation with subheadings if needed]

## Summary
[One paragraph summary]

## Related Questions
1. [Related question 1]
2. [Related question 2]
3. [Related question 3]"""

    subject_guides = {
        "math": "Use mathematical notation. Show formulas and calculation steps clearly.",
        "physics": "Include relevant formulas. Use real-world examples. Show units.",
        "english": "Use examples. Explain rules with clarity.",
        "general": "Use clear, academic language with examples."
    }
    
    subject_guide = subject_guides.get(subject, subject_guides["general"])
    
    history_text = ""
    if history:
        history_text = "Previous conversation:\n"
        for entry in history[-4:]:
            history_text += f"Q: {entry['question']}\nA: {entry['answer'][:300]}...\n\n"
    
    return f"""{base_instruction}

Subject: {subject}
{subject_guide}

{length_instruction}

{history_text}
Student's Question:
{question}

Answer:"""


def build_urdu_prompt(question):
    """Build Urdu explanation prompt."""
    return f"""You are an expert Pakistani teacher.
Explain the following question in SIMPLE URDU language.
Use Urdu script (not Roman Urdu).
Keep it simple and easy for students.
DO NOT include English words unless it's a technical term.
Include examples in Urdu.
Structure the answer with clear headings in Urdu.

Question: {question}

Urdu Explanation:"""


# ─── AI CALLS ────────────────────────────────────────────────

def call_gemma(prompt):
    """Send prompt to Gemma 4 via OpenRouter."""
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": MODEL_NAME,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"]
        else:
            return f"⚠️ API Error: {response.status_code}"
            
    except requests.exceptions.Timeout:
        return "⚠️ Request timed out. Please try again."
    except Exception as e:
        return f"⚠️ Error: {str(e)}"


# ─── ROUTES ──────────────────────────────────────────────────

@app.route('/')
def home():
    return render_template('index.html')


@app.route('/ask', methods=['POST'])
def ask():
    """Handle question submission."""
    data = request.get_json()
    question = data.get('question', '').strip()
    subject = data.get('subject', 'general')
    mode = data.get('mode', 'full')
    session_id = data.get('session_id', 'default')
    
    if not question:
        return jsonify({'error': 'Please enter a question.'}), 400
    if len(question) < 3:
        return jsonify({'error': 'Question is too short.'}), 400
    if len(question) > 2000:
        return jsonify({'error': 'Question is too long (max 2000 chars).'}), 400
    
    history = chat_sessions.get(session_id, [])
    prompt = build_prompt(question, subject, mode, history)
    answer = call_gemma(prompt)
    
    # Save to history
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []
    chat_sessions[session_id].append({
        "question": question,
        "answer": answer,
        "subject": subject
    })
    
    return jsonify({
        'answer': answer,
        'question': question,
        'subject': subject,
        'mode': mode,
        'history_count': len(chat_sessions.get(session_id, []))
    })


@app.route('/urdu', methods=['POST'])
def urdu_explain():
    """Handle Urdu explanation request."""
    data = request.get_json()
    question = data.get('question', '').strip()
    session_id = data.get('session_id', 'default')
    
    if not question:
        return jsonify({'error': 'Please enter a question.'}), 400
    if len(question) < 3:
        return jsonify({'error': 'Question is too short.'}), 400
    
    prompt = build_urdu_prompt(question)
    answer = call_gemma(prompt)
    
    # Save to history
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []
    chat_sessions[session_id].append({
        "question": f"[Urdu] {question}",
        "answer": answer,
        "subject": "urdu"
    })
    
    return jsonify({
        'answer': answer,
        'question': question,
        'subject': 'urdu',
        'mode': 'urdu'
    })


@app.route('/history', methods=['GET'])
def get_history():
    """Return chat history."""
    session_id = request.args.get('session_id', 'default')
    history = chat_sessions.get(session_id, [])
    return jsonify({'history': history})


@app.route('/clear', methods=['POST'])
def clear_history():
    """Clear chat history."""
    data = request.get_json()
    session_id = data.get('session_id', 'default')
    if session_id in chat_sessions:
        chat_sessions[session_id] = []
    return jsonify({'status': 'cleared'})


# ─── RUN ─────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 55)
    print("  🎓  SnapSolve AI - Complete Version")
    print("  📍  http://127.0.0.1:5000")
    print(f"  🧠  {MODEL_NAME}")
    print("  🇵🇰  Urdu Mode  |  🎤 Voice Input  |  🌙 Dark Mode")
    print("=" * 55)
    app.run(debug=True)