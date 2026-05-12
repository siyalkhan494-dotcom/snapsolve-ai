// DOM ELEMENTS
const questionInput = document.getElementById('question');
const subjectSelect = document.getElementById('subject');
const askBtn = document.getElementById('askBtn');
const shortBtn = document.getElementById('shortBtn');
const loadingDiv = document.getElementById('loading');
const resultDiv = document.getElementById('result');
const answerContent = document.getElementById('answerContent');
const modeBadge = document.getElementById('modeBadge');
const subjectBadge = document.getElementById('subjectBadge');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');

// EVENT LISTENERS
askBtn.addEventListener('click', () => askQuestion('full'));
shortBtn.addEventListener('click', () => askQuestion('short'));

// Allow Enter to submit (Ctrl+Enter for short answer)
questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        askQuestion('short');
    } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askQuestion('full');
    }
});

// MAIN FUNCTION
async function askQuestion(mode) {
    const question = questionInput.value.trim();
    const subject = subjectSelect.value;

    // Validate
    if (!question) {
        showError('Please enter a question first.');
        return;
    }

    if (question.length < 5) {
        showError('Question is too short. Please add more detail.');
        return;
    }

    // Show loading, hide previous results
    hideAll();
    loadingDiv.style.display = 'block';
    askBtn.disabled = true;
    shortBtn.disabled = true;

    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: question,
                subject: subject,
                mode: mode
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong.');
        }

        // Show result
        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        
        // Render answer with formatting
        answerContent.innerHTML = formatAnswer(data.answer);
        modeBadge.textContent = mode === 'full' ? 'Detailed Explanation' : 'Short Answer';
        subjectBadge.textContent = capitalizeFirst(data.subject);

    } catch (error) {
        loadingDiv.style.display = 'none';
        showError(error.message);
    } finally {
        askBtn.disabled = false;
        shortBtn.disabled = false;
    }
}

// HELPER FUNCTIONS
function hideAll() {
    resultDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    loadingDiv.style.display = 'none';
}

function showError(message) {
    errorDiv.style.display = 'block';
    errorMessage.textContent = '⚠️ ' + message;
    resultDiv.style.display = 'none';
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatAnswer(text) {
    // Convert markdown-style formatting to HTML
    let formatted = text
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Line breaks
        .replace(/\n/g, '<br>')
        // Numbered lists
        .replace(/(\d+\.\s)/g, '<br>$1')
        // Section headers (lines ending with colon)
        .replace(/([A-Z][^:]+):/g, '<h3>$1:</h3>');
    
    return formatted;
}