// ─── DOM ELEMENTS ─────────────────────────────────────────
const questionInput = document.getElementById('question');
const subjectSelect = document.getElementById('subject');
const askBtn = document.getElementById('askBtn');
const shortBtn = document.getElementById('shortBtn');
const loadingDiv = document.getElementById('loading');
const resultDiv = document.getElementById('result');
const answerContent = document.getElementById('answerContent');
const answerMeta = document.getElementById('answerMeta');
const answerActions = document.getElementById('answerActions');
const wordCountSpan = document.getElementById('wordCount');
const readTimeSpan = document.getElementById('readTime');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const themeToggle = document.getElementById('themeToggle');
const copyBtn = document.getElementById('copyBtn');
const pdfBtn = document.getElementById('pdfBtn');

const SESSION_ID = 'student-' + Math.random().toString(36).substr(2, 9);
let questionHistory = [];

// ─── THEME TOGGLE ─────────────────────────────────────────
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    themeToggle.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
});

// Load saved theme
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.textContent = '☀️';
}

// ─── ASK QUESTION ─────────────────────────────────────────
askBtn.addEventListener('click', () => askQuestion('full'));
shortBtn.addEventListener('click', () => askQuestion('short'));

questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askQuestion('full');
    }
});

async function askQuestion(mode) {
    const question = questionInput.value.trim();
    const subject = subjectSelect.value;

    if (!question || question.length < 3) {
        showError('Please enter a valid question.');
        return;
    }

    hideAll();
    loadingDiv.style.display = 'block';
    askBtn.disabled = true;
    shortBtn.disabled = true;

    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question, subject, mode,
                session_id: SESSION_ID
            })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Error');

        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        answerContent.innerHTML = formatAnswer(data.answer);

        // Show word count & reading time
        const text = answerContent.innerText;
        const wordCount = text.split(/\s+/).length;
        const readTime = Math.ceil(wordCount / 200);
        wordCountSpan.textContent = `${wordCount} words`;
        readTimeSpan.textContent = `${readTime} min read`;
        answerMeta.style.display = 'flex';
        answerActions.style.display = 'flex';

        // Add to history
        addToHistory(question, subject);

    } catch (error) {
        loadingDiv.style.display = 'none';
        showError(error.message);
    } finally {
        askBtn.disabled = false;
        shortBtn.disabled = false;
    }
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
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 30px; 
                    line-height: 1.8; 
                    color: #000; 
                    max-width: 800px;
                    margin: 0 auto;
                }
                h2 { 
                    color: #1a73e8; 
                    border-bottom: 2px solid #1a73e8; 
                    padding-bottom: 5px; 
                    margin-top: 20px;
                }
                h3 { 
                    color: #9334e6; 
                    margin-top: 15px;
                }
                strong { 
                    color: #e37400; 
                }
                ul, ol { 
                    padding-left: 20px; 
                }
                li { 
                    margin: 5px 0; 
                }
                .watermark {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px solid #ddd;
                    color: #999;
                    font-size: 0.85em;
                }
            </style>
        </head>
        <body>
            <h1 style="color:#1a73e8; text-align:center;">🎓 SnapSolve AI</h1>
            <p style="text-align:center; color:#666;">AI-Powered Study Assistant</p>
            <hr>
            ${content}
            <div class="watermark">
                Generated by SnapSolve AI • Powered by Gemma 4
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
});

// ─── HISTORY ──────────────────────────────────────────────
function addToHistory(question, subject) {
    questionHistory.unshift({ question, subject });
    if (questionHistory.length > 20) questionHistory.pop();
    renderHistory();
}

function renderHistory() {
    if (questionHistory.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No questions yet</p>';
        return;
    }
    historyList.innerHTML = questionHistory.map((item, i) => `
        <div class="history-item" onclick="loadHistory(${i})">
            <div class="history-question">${escapeHtml(item.question.substring(0, 50))}...</div>
            <div class="history-subject">${item.subject}</div>
        </div>
    `).join('');
}

function loadHistory(index) {
    const item = questionHistory[index];
    questionInput.value = item.question;
    subjectSelect.value = item.subject;
    questionInput.focus();
}

clearHistoryBtn.addEventListener('click', async () => {
    questionHistory = [];
    renderHistory();
    await fetch('/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: SESSION_ID })
    });
});

// ─── HELPERS ──────────────────────────────────────────────
function hideAll() {
    resultDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    loadingDiv.style.display = 'none';
    answerMeta.style.display = 'none';
    answerActions.style.display = 'none';
}

function showError(message) {
    errorDiv.style.display = 'block';
    errorMessage.textContent = '⚠️ ' + message;
}

function formatAnswer(text) {
    return text
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n- /g, '\n<li>')
        .replace(/(<li>.*)/g, '<ul>$1</ul>')
        .replace(/<\/ul>\n<ul>/g, '')
        .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}