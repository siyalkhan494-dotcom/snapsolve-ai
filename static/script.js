// ─── DOM ELEMENTS ─────────────────────────────────────────
const questionInput = document.getElementById('question');
const subjectSelect = document.getElementById('subject');
const askBtn = document.getElementById('askBtn');
const shortBtn = document.getElementById('shortBtn');
const urduBtn = document.getElementById('urduBtn');
const loadingDiv = document.getElementById('loading');
const resultDiv = document.getElementById('result');
const answerContent = document.getElementById('answerContent');
const answerMeta = document.getElementById('answerMeta');
const answerActions = document.getElementById('answerActions');
const answerRating = document.getElementById('answerRating');
const wordCountSpan = document.getElementById('wordCount');
const readTimeSpan = document.getElementById('readTime');
const charCountSpan = document.getElementById('charCount');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const themeToggle = document.getElementById('themeToggle');
const copyBtn = document.getElementById('copyBtn');
const pdfBtn = document.getElementById('pdfBtn');
const shareBtn = document.getElementById('shareBtn');
const voiceBtn = document.getElementById('voiceBtn');
const ratingFeedback = document.getElementById('ratingFeedback');

const SESSION_ID = 'student-' + Math.random().toString(36).substr(2, 9);
let questionHistory = [];

// ─── THEME TOGGLE ─────────────────────────────────────────
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    themeToggle.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.textContent = '☀️';
}

// ─── CHARACTER COUNTER ────────────────────────────────────
questionInput.addEventListener('input', () => {
    const length = questionInput.value.length;
    charCountSpan.textContent = length;
    if (length > 1800) charCountSpan.style.color = '#ff7b72';
    else if (length > 1500) charCountSpan.style.color = '#d2991d';
    else charCountSpan.style.color = '#8b949e';
});

// ─── ASK QUESTION (ENGLISH) ───────────────────────────────
askBtn.addEventListener('click', () => askQuestion('full'));
shortBtn.addEventListener('click', () => askQuestion('short'));

questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        askQuestion('short');
    } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askQuestion('full');
    }
});

async function askQuestion(mode) {
    const question = questionInput.value.trim();
    const subject = subjectSelect.value;

    if (!question || question.length < 3) {
        showError('Please enter a valid question (at least 3 characters).');
        return;
    }

    hideAll();
    loadingDiv.style.display = 'block';
    disableButtons(true);

    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, subject, mode, session_id: SESSION_ID })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Something went wrong');

        showAnswer(data.answer);
        addToHistory(question, subject);

    } catch (error) {
        loadingDiv.style.display = 'none';
        showError(error.message);
    } finally {
        disableButtons(false);
    }
}

// ─── URDU MODE ────────────────────────────────────────────
urduBtn.addEventListener('click', async () => {
    const question = questionInput.value.trim();

    if (!question || question.length < 3) {
        showError('Please enter a valid question.');
        return;
    }

    hideAll();
    loadingDiv.style.display = 'block';
    disableButtons(true);

    try {
        const response = await fetch('/urdu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, session_id: SESSION_ID })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error');

        showAnswer(data.answer);
        addToHistory(question, 'urdu');

    } catch (error) {
        loadingDiv.style.display = 'none';
        showError(error.message);
    } finally {
        disableButtons(false);
    }
});

// ─── SHOW ANSWER ──────────────────────────────────────────
function showAnswer(answer) {
    loadingDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    answerContent.innerHTML = formatAnswer(answer);

    // Word count & reading time
    const text = answerContent.innerText;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    wordCountSpan.textContent = `${wordCount} words`;
    readTimeSpan.textContent = `${readTime} min read`;
    answerMeta.style.display = 'flex';
    answerActions.style.display = 'flex';
    answerRating.style.display = 'flex';

    // Reset rating
    document.querySelectorAll('.rating-btn').forEach(btn => btn.disabled = false);
    ratingFeedback.textContent = '';
}

// ─── COPY BUTTON ──────────────────────────────────────────
copyBtn.addEventListener('click', () => {
    const text = answerContent.innerText;
    navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
    }).catch(() => {
        copyBtn.textContent = '❌ Failed';
        setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
    });
});

// ─── PDF BUTTON ───────────────────────────────────────────
pdfBtn.addEventListener('click', () => {
    const content = answerContent.innerHTML;
    const question = questionInput.value.trim() || 'Answer';
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>SnapSolve AI - Answer</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; line-height: 1.8; color: #000; max-width: 800px; margin: 0 auto; }
                h2 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 5px; margin-top: 20px; }
                h3 { color: #9334e6; margin-top: 15px; }
                strong { color: #e37400; }
                ul, ol { padding-left: 20px; }
                li { margin: 5px 0; }
                .watermark { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; color: #999; font-size: 0.85em; }
            </style>
        </head>
        <body>
            <h1 style="color:#1a73e8; text-align:center;">🎓 SnapSolve AI</h1>
            <p style="text-align:center; color:#666;">AI-Powered Study Assistant</p>
            <hr>
            ${content}
            <div class="watermark">Generated by SnapSolve AI • Powered by Gemma 4</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
});

// ─── SHARE BUTTON ─────────────────────────────────────────
shareBtn.addEventListener('click', () => {
    const text = answerContent.innerText;
    if (navigator.share) {
        navigator.share({
            title: 'SnapSolve AI Answer',
            text: text.substring(0, 200) + '...'
        }).catch(() => {});
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(text).then(() => {
            shareBtn.textContent = '✅ Link Copied!';
            setTimeout(() => shareBtn.textContent = '🔗 Share', 2000);
        });
    }
});

// ─── RATING ───────────────────────────────────────────────
function rateAnswer(type) {
    if (type === 'up') {
        ratingFeedback.textContent = 'Thanks! Glad it helped! 😊';
    } else {
        ratingFeedback.textContent = 'Thanks for the feedback! 🙏';
    }
    document.querySelectorAll('.rating-btn').forEach(btn => btn.disabled = true);
}

// ─── HISTORY ──────────────────────────────────────────────
function addToHistory(question, subject) {
    const label = subject === 'urdu' ? '🇵🇰 Urdu' : subject;
    questionHistory.unshift({ question, subject: label });
    if (questionHistory.length > 25) questionHistory.pop();
    renderHistory();
}

function renderHistory() {
    if (questionHistory.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No questions yet</p>';
        return;
    }
    historyList.innerHTML = questionHistory.map((item, i) => `
        <div class="history-item" onclick="loadHistory(${i})" title="${escapeHtml(item.question)}">
            <div class="history-question">${escapeHtml(item.question.substring(0, 55))}${item.question.length > 55 ? '...' : ''}</div>
            <div class="history-subject">${item.subject}</div>
        </div>
    `).join('');
}

function loadHistory(index) {
    const item = questionHistory[index];
    questionInput.value = item.question;
    if (item.subject === '🇵🇰 Urdu') {
        subjectSelect.value = 'general';
    } else {
        subjectSelect.value = item.subject;
    }
    charCountSpan.textContent = item.question.length;
    questionInput.focus();
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Clear all history?')) {
        questionHistory = [];
        renderHistory();
        await fetch('/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: SESSION_ID })
        });
    }
});

// ─── VOICE INPUT ──────────────────────────────────────────
let isListening = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('listening');
        voiceBtn.textContent = '🔴';
    };

    recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        voiceBtn.textContent = '🎤';
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
        questionInput.value = transcript;
        charCountSpan.textContent = transcript.length;
    };

    recognition.onerror = (event) => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        voiceBtn.textContent = '🎤';
        if (event.error === 'not-allowed') {
            showError('Microphone access denied. Please allow microphone permission.');
        }
    };

    voiceBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
} else {
    voiceBtn.style.display = 'none';
    voiceBtn.title = 'Voice input not supported in this browser';
}

// ─── HELPERS ──────────────────────────────────────────────
function disableButtons(disabled) {
    askBtn.disabled = disabled;
    shortBtn.disabled = disabled;
    urduBtn.disabled = disabled;
}

function hideAll() {
    resultDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    loadingDiv.style.display = 'none';
    answerMeta.style.display = 'none';
    answerActions.style.display = 'none';
    answerRating.style.display = 'none';
}

function showError(message) {
    errorDiv.style.display = 'block';
    errorMessage.textContent = '⚠️ ' + message;
    loadingDiv.style.display = 'none';
    resultDiv.style.display = 'none';
}

function formatAnswer(text) {
    return text
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/<\/ul>\s*<ul>/g, '')
        .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── INIT ─────────────────────────────────────────────────
console.log('🎓 SnapSolve AI Ready!');
console.log('🌙 Dark/Light mode  |  🎤 Voice input  |  🇵🇰 Urdu mode');
console.log('📋 Copy  |  📄 PDF  |  🔗 Share  |  👍 Rating');