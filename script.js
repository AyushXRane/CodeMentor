// CodeMentor - AI Teaching Assistant
class CodeMentor {
    constructor() {
        this.currentSubject = 'python';
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.topicList = document.getElementById('topicList');
        this.conversationHistory = [];
        this.lastTopic = null;

        this.loadConversationHistory();
        this.initializeEventListeners();
        this.loadTopics();
        this.setupAutoResize();
        this.renderConversationHistory();
    }

    initializeEventListeners() {
        // Send message on button click
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter (but not Shift+Enter)
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Subject selection
        document.querySelectorAll('.subject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSubject(e.target.dataset.subject);
            });
        });

        // Hint chips
        document.querySelectorAll('.hint-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                this.messageInput.value = e.target.textContent;
                this.messageInput.focus();
            });
        });

        // Check if API key exists and show status
        this.updateApiStatus();
    }

    updateApiStatus() {
        const apiKey = localStorage.getItem('gemini_api_key');
        const statusElement = document.getElementById('apiStatus');
        
        if (apiKey && statusElement) {
            statusElement.style.display = 'flex';
        }
    }

    resetApiKey() {
        localStorage.removeItem('gemini_api_key');
        document.getElementById('apiStatus').style.display = 'none';
        this.addMessage('assistant', 'API key reset. I\'ll ask for a new one on your next message to enable intelligent responses.');
    }

    setupAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
    }

    switchSubject(subject) {
        this.currentSubject = subject;
        
        // Update active button
        document.querySelectorAll('.subject-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subject === subject);
        });
        
        // Load topics for the new subject
        this.loadTopics();
        
        // Add system message about subject switch
        this.addMessage('assistant', `Switched to ${subject === 'python' ? 'Python (AP CSP)' : 'Java (AP CSA)'}. How can I help you with ${subject} today?`);
    }

    loadTopics() {
        const topics = {
            python: [
                'Variables & Data Types',
                'Lists & Dictionaries',
                'Loops (for/while)',
                'Functions',
                'Conditionals',
                'String Methods',
                'File I/O',
                'Error Handling',
                'Algorithms',
                'Data Analysis'
            ],
            java: [
                'Variables & Primitives',
                'Arrays & ArrayLists',
                'Loops & Iteration',
                'Methods',
                'Conditionals',
                'Classes & Objects',
                'Inheritance',
                'Polymorphism',
                'Recursion',
                'Sorting & Searching'
            ]
        };

        this.topicList.innerHTML = topics[this.currentSubject]
            .map(topic => `<div class="topic-item" onclick="codeMentor.askAboutTopic('${topic}')">${topic}</div>`)
            .join('');
    }

    askAboutTopic(topic) {
        this.messageInput.value = `Can you explain ${topic}?`;
        this.sendMessage();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Add user message
        this.addMessage('user', message);
        this.conversationHistory.push({ role: 'user', content: message });
        this.saveConversationHistory();
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Generate AI response using Gemini API
            const response = await this.generateAIResponse(message);
            this.hideTypingIndicator();
            this.addMessage('assistant', response);
            this.conversationHistory.push({ role: 'assistant', content: response });
            this.saveConversationHistory();
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Gemini API Error:', error);
            
            // Show error message to user
            const errorMessage = `I'm having trouble connecting to the AI service right now. Please check your internet connection and try again. Error: ${error.message}`;
            this.addMessage('assistant', errorMessage);
            this.conversationHistory.push({ role: 'assistant', content: errorMessage });
            this.saveConversationHistory();
        }
    }

    async generateAIResponse(userMessage) {
        // Use Gemini API with provided API key
        const API_KEY = CONFIG.GEMINI_API_KEY;
        
        // Build conversation contents for API
        const contents = [];

        // Add conversation history
        for (let i = 0; i < this.conversationHistory.length; i++) {
            const msg = this.conversationHistory[i];
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        }

        // Add current user message with system instructions
        const systemPrompt = `You are CodeMentor, an AI teaching assistant for AP Computer Science students learning ${this.currentSubject === 'python' ? 'Python (AP CSP)' : 'Java (AP CSA)'}.

CRITICAL TEACHING RULES:
- NEVER provide complete solutions or finished code
- NEVER do students' homework for them  
- If asked for "the full code" or "complete solution", politely redirect to learning
- Guide learning through hints, explanations, and step-by-step reasoning
- Ask follow-up questions to promote critical thinking
- Provide code templates with blanks for students to fill in
- Teach debugging strategies rather than fixing code directly
- REMEMBER the conversation context and build upon previous messages

Your responses should be:
- Conversational and encouraging
- Focused on understanding concepts
- Tailored to ${this.currentSubject === 'python' ? 'Python' : 'Java'} specifically
- Educational, not just informational
- Context-aware of the ongoing conversation

Student question: ${userMessage}`;

        contents.push({
            role: 'user',
            parts: [{ text: systemPrompt }]
        });

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY,
            },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }




    addMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = sender === 'assistant' ? '🤖' : '👨‍💻';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-text">${this.formatMessage(content)}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Convert code blocks
        content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<div class="code-block"><pre><code class="language-${lang || 'text'}">${this.escapeHtml(code.trim())}</code></pre></div>`;
        });
        
        // Convert inline code
        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Convert line breaks
        content = content.replace(/\n/g, '<br>');
        
        // Convert bold text
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        return content;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant-message typing-message';
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingMessage = this.chatMessages.querySelector('.typing-message');
        if (typingMessage) {
            typingMessage.remove();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    // Save conversation history to localStorage
    saveConversationHistory() {
        try {
            localStorage.setItem('codeMentor_conversationHistory', JSON.stringify(this.conversationHistory));
        } catch (e) {
            console.error('Failed to save conversation history:', e);
        }
    }

    // Load conversation history from localStorage
    loadConversationHistory() {
        try {
            const saved = localStorage.getItem('codeMentor_conversationHistory');
            if (saved) {
                this.conversationHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load conversation history:', e);
            this.conversationHistory = [];
        }
    }

    // Render conversation history to chat window
    renderConversationHistory() {
        this.chatMessages.innerHTML = '';
        
        if (!this.conversationHistory || !Array.isArray(this.conversationHistory) || this.conversationHistory.length === 0) {
            // Add welcome message if no conversation history
            this.addMessage('assistant', `<h3>Welcome to CodeMentor! 👋</h3>
<p>I'm your AI teaching assistant for AP Computer Science. I'm here to help you understand concepts, debug code, and develop problem-solving skills.</p>
<p><strong>Remember:</strong> I won't give you direct answers or complete solutions. Instead, I'll guide you through the learning process with hints, explanations, and step-by-step reasoning.</p>
<p>What would you like to work on today?</p>`);
            return;
        }
        
        for (const msg of this.conversationHistory) {
            this.addMessage(msg.role, msg.content);
        }
    }
}

// Initialize the application
const codeMentor = new CodeMentor();

// Make it globally accessible for onclick handlers
window.codeMentor = codeMentor;
