import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { DEFAULT_CONFIG, loadConfig, saveConfig } from "./config.js";

/**
 * Ассистент — ComfyUI Extension
 * 
 * Помощник для составления промптов: преобразует описания и ТЗ в чёткий,
 * готовый к генерации промпт. На выходе — только финальный промпт.
 */

class AIChatManager {
    constructor() {
        this.config = loadConfig();
        this.chatHistory = this.loadChatHistory();
        this.isExpanding = false;
        this.apiEndpoint = this.config.apiEndpoint;
        this.model = this.config.model;
        this.backendType = this.config.backendType || 'ollama';
        this.ollamaContext = this.loadOllamaContext();
        this.promptLanguage = this.config.promptLanguage || 'en';
        // Initialize system prompt based on language
        this.updateSystemPrompt();
    }
    
    // Update system prompt based on selected language
    updateSystemPrompt() {
        const lang = this.promptLanguage || 'en';
        // Check both locations for system prompts (config.chat.systemPrompts or config.systemPrompts)
        const systemPrompts = this.config.systemPrompts || this.config.chat?.systemPrompts || {};
        if (systemPrompts[lang]) {
            if (!this.config.chat) {
                this.config.chat = {};
            }
            if (!this.config.chat.systemPrompt) {
                this.config.chat.systemPrompt = {};
            }
            this.config.chat.systemPrompt.chat = systemPrompts[lang];
        }
    }

    // Load chat history from localStorage
    loadChatHistory() {
        try {
            const saved = localStorage.getItem(this.config.storage.chatHistory);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn('Failed to load chat history:', e);
            return [];
        }
    }

    // Save chat history to localStorage
    saveChatHistory() {
        try {
            localStorage.setItem(this.config.storage.chatHistory, JSON.stringify(this.chatHistory));
        } catch (e) {
            console.warn('Failed to save chat history:', e);
        }
    }

    // Add message to chat history
    addMessage(role, content, type = 'chat', images = null) {
        const message = {
            id: Date.now() + Math.random(),
            role,
            content,
            type,
            images: images || null,
            timestamp: new Date().toISOString()
        };
        this.chatHistory.push(message);
        this.saveChatHistory();
        return message;
    }

    // Clear chat history
    clearHistory() {
        this.chatHistory = [];
        this.saveChatHistory();
        this.ollamaContext = null;
        try {
            localStorage.removeItem(this.config.storage.ollamaContext);
        } catch (e) {}
    }

    // Load/save Ollama context (for /api/generate)
    loadOllamaContext() {
        try {
            const saved = localStorage.getItem(this.config.storage.ollamaContext);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    saveOllamaContext(context) {
        this.ollamaContext = Array.isArray(context) ? context : null;
        try {
            if (this.ollamaContext) {
                localStorage.setItem(this.config.storage.ollamaContext, JSON.stringify(this.ollamaContext));
            } else {
                localStorage.removeItem(this.config.storage.ollamaContext);
            }
        } catch (e) {}
    }

    // Build Ollama URL for a given path (e.g., /api/tags) based on configured endpoint
    buildOllamaUrl(path) {
        try {
            const url = new URL(this.apiEndpoint, window.location.href);
            return `${url.origin}${path}`;
        } catch (e) {
            if (this.apiEndpoint.includes('/api/generate')) {
                return this.apiEndpoint.replace('/api/generate', path);
            }
            if (this.apiEndpoint.includes('/api/chat')) {
                return this.apiEndpoint.replace('/api/chat', path);
            }
            // Default fallback
            return (this.apiEndpoint.endsWith('/api') ? this.apiEndpoint : this.apiEndpoint.replace(/\/?$/, '/api')) + path.replace('/api', '');
        }
    }

    // Fetch list of local models from backend (Ollama or vLLM)
    async fetchLocalModels() {
        try {
            if (this.backendType === 'vllm') {
                // vLLM uses OpenAI-compatible /v1/models endpoint
                let modelsUrl;
                if (this.apiEndpoint.includes('/v1/')) {
                    // Extract base URL and append /v1/models
                    modelsUrl = this.apiEndpoint.replace(/\/v1\/.*$/, '/v1/models');
                } else {
                    // Fallback: assume standard vLLM port
                    const url = new URL(this.apiEndpoint, window.location.href);
                    modelsUrl = `${url.origin}/v1/models`;
                }
                console.log(`Fetching vLLM models from: ${modelsUrl}`);
                const res = await fetch(modelsUrl, { method: 'GET' });
                if (!res.ok) throw new Error(`Failed to load models: ${res.status}`);
                const data = await res.json();
                const models = Array.isArray(data.data) ? data.data : [];
                const names = models.map(m => m.id || m.model || '').filter(Boolean);
                console.log(`Found ${names.length} vLLM models:`, names);
                return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
            } else {
                // Ollama backend
                const tagsUrl = this.buildOllamaUrl('/api/tags');
                console.log(`Fetching Ollama models from: ${tagsUrl}`);
                const res = await fetch(tagsUrl, { method: 'GET' });
                if (!res.ok) throw new Error(`Failed to load models: ${res.status}`);
                const data = await res.json();
                const models = Array.isArray(data.models) ? data.models : [];
                // Prefer name field, fallback to model field
                const names = models.map(m => (m && (m.name || m.model || '')).toString()).filter(Boolean);
                console.log(`Found ${names.length} Ollama models:`, names);
                // Unique + sort
                return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
            }
        } catch (e) {
            console.error(`Failed to fetch local models from ${this.backendType}:`, e);
            return [];
        }
    }

    // Send message to AI API (supports Ollama, vLLM with streaming)
    async sendToAI(message, isPromptExpansion = false, onStreamChunk = null, images = null) {
        // Get system prompt based on current language setting
        this.updateSystemPrompt();
        const systemPrompts = this.config.systemPrompts || this.config.chat?.systemPrompts || {};
        const systemPrompt = this.config.chat?.systemPrompt?.chat || systemPrompts[this.promptLanguage] || systemPrompts.en || "";

        try {
            let response;
            
            if (this.backendType === 'vllm') {
                // vLLM uses OpenAI-compatible API
                const recentMessages = this.chatHistory
                    .filter(m => m.type === 'chat')
                    .map(m => {
                        // Handle multimodal messages
                        if (m.images && m.images.length > 0) {
                            const content = [{ type: 'text', text: m.content }];
                            m.images.forEach(img => {
                                content.push({ type: 'image_url', image_url: { url: img } });
                            });
                            return { role: m.role, content };
                        }
                        return { role: m.role, content: m.content };
                    });
                const maxContext = Math.max(0, (this.config.ui && this.config.ui.maxChatHistory) ? this.config.ui.maxChatHistory : 50);
                const limited = recentMessages.slice(-maxContext);
                
                // Build current message content (with images if provided)
                let currentMessageContent;
                if (images && images.length > 0) {
                    currentMessageContent = [{ type: 'text', text: message }];
                    images.forEach(img => {
                        currentMessageContent.push({ type: 'image_url', image_url: { url: img } });
                    });
                } else {
                    currentMessageContent = message;
                }
                
                const messages = [
                    { role: 'system', content: systemPrompt },
                    ...limited,
                    { role: 'user', content: currentMessageContent }
                ];

                response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: this.model,
                        messages,
                        stream: !!onStreamChunk,
                        temperature: 0.7,
                        max_tokens: 2048,
                        // Disable reasoning/thinking mode
                        include_reasoning: false,
                        reasoning_effort: null
                    })
                });
            } else {
                // Ollama backend
                // Detect Ollama endpoints
                const isOllamaApi = this.apiEndpoint.includes('/api/generate') || this.apiEndpoint.includes('/api/chat');
                const chatEndpoint = this.apiEndpoint.includes('/api/chat')
                    ? this.apiEndpoint
                    : (this.apiEndpoint.includes('/api/generate')
                        ? this.apiEndpoint.replace('/generate', '/chat')
                        : this.apiEndpoint);
                const generateEndpoint = this.apiEndpoint.includes('/api/generate')
                    ? this.apiEndpoint
                    : (this.apiEndpoint.includes('/api/chat')
                        ? this.apiEndpoint.replace('/chat', '/generate')
                        : this.apiEndpoint);

                if (isOllamaApi) {
                    // Build messages from chat history (limit for context)
                    const recentMessages = this.chatHistory
                        .filter(m => m.type === 'chat')
                        .map(m => {
                            // Handle multimodal messages for Ollama
                            if (m.images && m.images.length > 0) {
                                return { 
                                    role: m.role, 
                                    content: m.content,
                                    images: m.images.map(img => img.split(',')[1]) // Extract base64 part
                                };
                            }
                            return { role: m.role, content: m.content };
                        });
                    const maxContext = Math.max(0, (this.config.ui && this.config.ui.maxChatHistory) ? this.config.ui.maxChatHistory : 50);
                    const limited = recentMessages.slice(-maxContext);
                    
                    // Build current message (with images if provided)
                    const currentMessage = { role: 'user', content: message };
                    if (images && images.length > 0) {
                        currentMessage.images = images.map(img => img.split(',')[1]); // Extract base64 part
                    }
                    
                    const messages = [
                        { role: 'system', content: systemPrompt },
                        ...limited,
                        currentMessage
                    ];

                    // Prefer /api/chat
                    response = await fetch(chatEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: this.model,
                            messages,
                            stream: !!onStreamChunk,
                            think: false
                        })
                    });

                    // Fallback to /api/generate if chat not available
                    if (response.status === 404) {
                        try { response.body?.cancel?.(); } catch (e) {}
                        response = await fetch(generateEndpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model: this.model,
                                system: systemPrompt,
                                prompt: message,
                                context: this.ollamaContext || undefined,
                                stream: !!onStreamChunk,
                                think: false
                            })
                        });
                    }
                } else {
                    // Generic completion-style API
                    response = await fetch(this.apiEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: this.model,
                            prompt: `${systemPrompt}\n\nUser: ${message}`,
                            stream: !!onStreamChunk,
                            think: false
                        })
                    });
                }
            }

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            // Streaming
            if (onStreamChunk && response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let finalText = '';
                let lastObj = null;

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split(/\r?\n/);
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed) continue;
                        
                        // Handle vLLM/OpenAI SSE format (data: {...})
                        let jsonStr = trimmed;
                        if (trimmed.startsWith('data: ')) {
                            jsonStr = trimmed.substring(6);
                            if (jsonStr === '[DONE]') continue;
                        }
                        
                        let obj;
                        try {
                            obj = JSON.parse(jsonStr);
                        } catch {
                            continue;
                        }
                        lastObj = obj;
                        
                        // Extract content based on backend type
                        let chunk = '';
                        if (this.backendType === 'vllm') {
                            // vLLM/OpenAI format: choices[0].delta.content
                            chunk = (obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content) || '';
                        } else {
                            // Ollama format: message.content or response
                            chunk = (obj && obj.message && obj.message.content) || obj.response || '';
                        }
                        
                        if (chunk) {
                            finalText += chunk;
                            onStreamChunk(chunk);
                        }
                    }
                }
                // Flush trailing buffer
                if (buffer.trim()) {
                    let jsonStr = buffer.trim();
                    if (jsonStr.startsWith('data: ')) {
                        jsonStr = jsonStr.substring(6);
                    }
                    if (jsonStr !== '[DONE]') {
                        try {
                            const obj = JSON.parse(jsonStr);
                            lastObj = obj;
                            let chunk = '';
                            if (this.backendType === 'vllm') {
                                chunk = (obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content) || '';
                            } else {
                                chunk = (obj && obj.message && obj.message.content) || obj.response || '';
                            }
                            if (chunk) {
                                finalText += chunk;
                                onStreamChunk(chunk);
                            }
                        } catch {}
                    }
                }
                // Save Ollama context if provided by /api/generate
                if (this.backendType === 'ollama' && lastObj && Array.isArray(lastObj.context)) {
                    this.saveOllamaContext(lastObj.context);
                }
                return finalText || 'No response received';
            }

            // Non-streaming
            const data = await response.json();
            if (this.backendType === 'ollama' && data && Array.isArray(data.context)) {
                this.saveOllamaContext(data.context);
            }
            
            // Extract response based on backend type
            if (this.backendType === 'vllm') {
                return (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'No response received';
            } else {
                return (data && data.message && data.message.content) || data.response || 'No response received';
            }
        } catch (error) {
            console.error('AI API Error:', error);
            return `Error: ${error.message}. Please check your AI service configuration.`;
        }
    }
}

// Global chat manager instance
let chatManager;

// Load CSS styles
function loadCSS() {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.type = 'text/css';
    cssLink.href = 'extensions/ai-chat-extension/ai-chat-styles.css';
    document.head.appendChild(cssLink);
}

// Register the extension
app.registerExtension({
    name: "numismatic.prompt.assistant",
    
    async setup() {
        // Load CSS styles
        loadCSS();
        
        // Initialize chat manager
        chatManager = new AIChatManager();
        
        // Register the sidebar tab
        app.extensionManager.registerSidebarTab({
            id: "numismaticAssistant",
            icon: "pi pi-comments",
            title: "Ассистент",
            tooltip: "Ассистент",
            type: "custom",
            render: (el) => {
                // Clear any existing content
                el.innerHTML = '';
                
                // Ensure parent element has proper styling for flex layout
                el.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    width: 100%;
                    overflow: hidden;
                    position: relative;
                `;
                
                // Create the main container
                const container = document.createElement('div');
                container.className = 'ai-chat-container';
                const fontSize = chatManager.config.ui?.fontSize || 13;
                container.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    width: 100%;
                    padding: 0;
                    margin: 0;
                    font-family: var(--font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
                    font-size: ${fontSize}px;
                    overflow: hidden;
                    position: relative;
                    box-sizing: border-box;
                `;

                // Create header
                const header = document.createElement('div');
                header.className = 'ai-chat-header';
                header.style.cssText = `
                    padding: 12px;
                    border-bottom: 1px solid var(--border-color, #333);
                    background: var(--bg-color, #1e1e1e);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex: 0 0 auto;
                    flex-shrink: 0;
                    box-sizing: border-box;
                `;

                const title = document.createElement('h3');
                title.textContent = 'Ассистент';
                title.style.cssText = `
                    margin: 0;
                    color: var(--text-color, #fff);
                    font-size: 14px;
                    font-weight: 600;
                `;

                // Settings button
                const settingsBtn = document.createElement('button');
                settingsBtn.innerHTML = '<i class="pi pi-cog"></i>';
                settingsBtn.title = 'Настройки';
                settingsBtn.style.cssText = `
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 15px;
                    padding: 5px;
                    border-radius: 4px;
                    color: var(--text-color, #ccc);
                    display: flex;
                    align-items: center;
                `;
                settingsBtn.onclick = () => this.showSettings();

                // Clear chat button
                const clearBtn = document.createElement('button');
                clearBtn.innerHTML = '<i class="pi pi-trash"></i>';
                clearBtn.title = 'Очистить диалог';
                clearBtn.style.cssText = `
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 15px;
                    padding: 5px;
                    border-radius: 4px;
                    margin-left: 4px;
                    color: var(--text-color, #ccc);
                    display: flex;
                    align-items: center;
                `;
                clearBtn.onclick = () => {
                    if (confirm('Очистить всю историю диалогов?')) {
                        chatManager.clearHistory();
                        this.renderChatMessages(messagesContainer);
                    }
                };

                const headerButtons = document.createElement('div');
                headerButtons.appendChild(settingsBtn);
                headerButtons.appendChild(clearBtn);

                header.appendChild(title);
                header.appendChild(headerButtons);

                // Create messages container
                const messagesContainer = document.createElement('div');
                messagesContainer.className = 'ai-chat-messages';
                messagesContainer.style.cssText = `
                    flex: 1 1 auto;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 12px;
                    background: var(--bg-color-light, #2a2a2a);
                    min-height: 0;
                    height: 0;
                    position: relative;
                    box-sizing: border-box;
                `;

                // Create input area
                const inputArea = document.createElement('div');
                inputArea.className = 'ai-chat-input-area';
                inputArea.style.cssText = `
                    padding: 12px;
                    border-top: 1px solid var(--border-color, #333);
                    background: var(--bg-color, #1e1e1e);
                    flex: 0 0 auto;
                    flex-shrink: 0;
                    box-sizing: border-box;
                `;

                // Image preview area
                const imagePreviewArea = document.createElement('div');
                imagePreviewArea.style.cssText = `
                    display: none;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 8px;
                `;
                
                // Store attached images
                let attachedImages = [];

                // Chat input
                const chatInput = document.createElement('textarea');
                chatInput.placeholder = 'Опишите задачу или вставьте ТЗ… (Shift+Enter — новая строка)';
                chatInput.style.cssText = `
                    width: 100%;
                    min-height: 72px;
                    max-height: 200px;
                    padding: 10px;
                    border: 1px solid var(--border-color, #444);
                    border-radius: 6px;
                    background: var(--input-bg, #333);
                    color: var(--text-color, #fff);
                    font-size: 13px;
                    resize: none;
                    font-family: inherit;
                    box-sizing: border-box;
                    line-height: 1.5;
                    overflow-y: hidden;
                `;

                // Auto-resize textarea as user types
                const autoResize = () => {
                    chatInput.style.height = 'auto';
                    const newH = Math.min(chatInput.scrollHeight, 200);
                    chatInput.style.height = newH + 'px';
                    chatInput.style.overflowY = chatInput.scrollHeight > 200 ? 'auto' : 'hidden';
                };
                chatInput.addEventListener('input', autoResize);

                // Hidden file input
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.multiple = true;
                fileInput.style.display = 'none';
                
                fileInput.onchange = async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const base64 = event.target.result;
                                attachedImages.push(base64);
                                
                                // Create preview
                                const preview = document.createElement('div');
                                preview.style.cssText = `
                                    position: relative;
                                    display: inline-block;
                                `;
                                
                                const img = document.createElement('img');
                                img.src = base64;
                                img.style.cssText = `
                                    width: 60px;
                                    height: 60px;
                                    object-fit: cover;
                                    border-radius: 4px;
                                    border: 1px solid var(--border-color, #444);
                                `;
                                
                                const removeBtn = document.createElement('button');
                                removeBtn.innerHTML = '×';
                                removeBtn.style.cssText = `
                                    position: absolute;
                                    top: -6px;
                                    right: -6px;
                                    width: 20px;
                                    height: 20px;
                                    border-radius: 50%;
                                    background: #f44336;
                                    color: white;
                                    border: none;
                                    cursor: pointer;
                                    font-size: 14px;
                                    line-height: 1;
                                    padding: 0;
                                `;
                                removeBtn.onclick = () => {
                                    attachedImages = attachedImages.filter(img => img !== base64);
                                    preview.remove();
                                    if (attachedImages.length === 0) {
                                        imagePreviewArea.style.display = 'none';
                                    }
                                };
                                
                                preview.appendChild(img);
                                preview.appendChild(removeBtn);
                                imagePreviewArea.appendChild(preview);
                                imagePreviewArea.style.display = 'flex';
                            };
                            reader.readAsDataURL(file);
                        }
                    }
                    fileInput.value = '';
                };

                // Image button
                const imageBtn = document.createElement('button');
                imageBtn.innerHTML = '<i class="pi pi-image"></i>';
                imageBtn.title = 'Прикрепить изображение';
                imageBtn.style.cssText = `
                    padding: 0 12px;
                    background: var(--bg-color-dark, #383838);
                    color: var(--text-color, #ccc);
                    border: 1px solid var(--border-color, #444);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 15px;
                    margin-right: 8px;
                    display: flex;
                    align-items: center;
                    height: 36px;
                    flex-shrink: 0;
                `;
                imageBtn.onclick = () => fileInput.click();

                const sendBtn = document.createElement('button');
                sendBtn.textContent = 'Отправить';
                sendBtn.style.cssText = `
                    flex: 1;
                    padding: 8px 16px;
                    background: var(--accent-color, #007acc);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    height: 36px;
                `;

                sendBtn.onclick = async () => {
                    const message = chatInput.value.trim();
                    if (!message && attachedImages.length === 0) return;

                    sendBtn.disabled = true;
                    sendBtn.textContent = 'Отправка...';

                    // Store message and images before clearing
                    const userImages = attachedImages.length > 0 ? [...attachedImages] : null;
                    const messageToSend = message || 'Опишите это изображение';
                    
                    // Clear input and images immediately
                    chatInput.value = '';
                    attachedImages = [];
                    imagePreviewArea.innerHTML = '';
                    imagePreviewArea.style.display = 'none';

                    try {
                        // Add user message with images
                        chatManager.addMessage('user', message || '(изображение)', 'chat', userImages);
                        this.renderChatMessages(messagesContainer);

                        // Prepare assistant message for streaming updates
                        const assistantMsg = chatManager.addMessage('assistant', '', 'chat');
                        this.renderChatMessages(messagesContainer);

                        // Get AI response with streaming when available
                        const fullText = await chatManager.sendToAI(messageToSend, false, (chunk) => {
                            assistantMsg.content += chunk;
                            this.renderChatMessages(messagesContainer);
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }, userImages);
                        // Ensure final content saved
                        assistantMsg.content = fullText;
                        chatManager.saveChatHistory();
                    } catch (error) {
                        console.error('Chat error:', error);
                    } finally {
                        sendBtn.disabled = false;
                        sendBtn.textContent = 'Отправить';
                    }
                };

                // Handle Enter key (Shift+Enter for new line)
                const handleKeyPress = (e, callback) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        callback();
                    }
                };

                chatInput.addEventListener('keydown', (e) => handleKeyPress(e, () => sendBtn.click()));

                // Button container
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = `
                    display: flex;
                    margin-top: 8px;
                    align-items: center;
                `;
                buttonContainer.appendChild(imageBtn);
                buttonContainer.appendChild(sendBtn);

                inputArea.appendChild(imagePreviewArea);
                inputArea.appendChild(chatInput);
                inputArea.appendChild(buttonContainer);
                inputArea.appendChild(fileInput);

                // Assemble the container
                container.appendChild(header);
                container.appendChild(messagesContainer);
                container.appendChild(inputArea);
                el.appendChild(container);

                // Initial render of messages
                this.renderChatMessages(messagesContainer);

                // Store references for later use
                this.messagesContainer = messagesContainer;
            }
        });
    },

    renderChatMessages(container) {
        container.innerHTML = '';

        if (chatManager.chatHistory.length === 0) {
            const welcome = document.createElement('div');
            welcome.style.cssText = `
                text-align: center;
                color: var(--text-color-secondary, #888);
                font-style: italic;
                margin-top: 40px;
            `;
            welcome.innerHTML = `
                <div style="font-size: 24px; margin-bottom: 12px;">🏛️</div>
                <div>Ассистент промптов</div>
                <div style="font-size: 12px; margin-top: 8px;">
                    Опишите задачу или прикрепите изображение 🖼️<br>
                    На выходе — только готовый промпт для генерации.
                </div>
            `;
            container.appendChild(welcome);
            return;
        }

        chatManager.chatHistory.forEach(message => {
            const messageEl = document.createElement('div');
            messageEl.className = `chat-message ${message.role} ${message.type}`;
            
            const isUser = message.role === 'user';
            
            messageEl.style.cssText = `
                margin-bottom: 16px;
                padding: 12px;
                border-radius: 8px;
                max-width: 90%;
                ${isUser ? 'margin-left: auto; background: var(--accent-color, #007acc); color: white;' : 'background: var(--bg-color-dark, #383838); color: var(--text-color, #fff);'}
            `;

            const header = document.createElement('div');
            header.style.cssText = `
                font-size: 11px;
                opacity: 0.7;
                margin-bottom: 6px;
                font-weight: 500;
            `;
            header.textContent = isUser ? 'Вы' : 'Ассистент';
            messageEl.appendChild(header);

            // Add images if present
            if (message.images && message.images.length > 0) {
                const imagesContainer = document.createElement('div');
                imagesContainer.style.cssText = `
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 8px;
                `;
                message.images.forEach(imgData => {
                    const img = document.createElement('img');
                    img.src = imgData;
                    img.style.cssText = `
                        max-width: 200px;
                        max-height: 200px;
                        border-radius: 4px;
                        cursor: pointer;
                        object-fit: contain;
                    `;
                    img.onclick = () => window.open(imgData, '_blank');
                    imagesContainer.appendChild(img);
                });
                messageEl.appendChild(imagesContainer);
            }

            const fontSize = chatManager.config.ui?.fontSize || 13;

            // Typing indicator while streaming (empty assistant message)
            if (!isUser && message.content === '') {
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'typing-indicator';
                typingIndicator.innerHTML = '<span></span><span></span><span></span>';
                messageEl.appendChild(typingIndicator);
            } else {
                const content = document.createElement('div');
                content.style.cssText = `
                    line-height: 1.5;
                    font-size: ${fontSize}px;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                `;
                content.textContent = message.content;
                messageEl.appendChild(content);
            }

            // Action buttons for assistant messages (visible on hover via CSS)
            if (!isUser) {
                const messageActions = document.createElement('div');
                messageActions.className = 'message-actions';

                const copyBtn = document.createElement('button');
                copyBtn.innerHTML = '<i class="pi pi-copy"></i>';
                copyBtn.title = 'Копировать';
                copyBtn.style.cssText = `
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 13px;
                    padding: 3px 7px;
                    border-radius: 3px;
                    color: var(--text-color, #ccc);
                `;
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(message.content).then(() => {
                        copyBtn.innerHTML = '<i class="pi pi-check"></i>';
                        setTimeout(() => copyBtn.innerHTML = '<i class="pi pi-copy"></i>', 1500);
                    });
                };

                const sendToNodeBtn = document.createElement('button');
                sendToNodeBtn.innerHTML = '<i class="pi pi-send"></i>';
                sendToNodeBtn.title = 'Отправить в узел промпта';
                sendToNodeBtn.style.cssText = `
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 13px;
                    padding: 3px 7px;
                    border-radius: 3px;
                    color: var(--text-color, #ccc);
                `;
                sendToNodeBtn.onclick = () => this.sendToPromptNode(message.content);

                messageActions.appendChild(copyBtn);
                messageActions.appendChild(sendToNodeBtn);
                messageEl.appendChild(messageActions);
            }

            container.appendChild(messageEl);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    },

    // Send prompt to selected ComfyUI node(s)
    sendToPromptNode(promptText) {
        try {
            if (!app || !app.graph) {
                alert('ComfyUI не инициализирован. Убедитесь, что рабочее пространство загружено.');
                return;
            }
            
            const selectedNodes = app.canvas?.selected_nodes || app.graph.selected_nodes || [];
            const allNodes = app.graph._nodes_by_id || {};
            
            let nodesToUpdate = [];
            
            // Get selected nodes from canvas if available
            if (selectedNodes && selectedNodes.length > 0) {
                nodesToUpdate = selectedNodes.map(id => allNodes[id]).filter(n => n);
            }
            
            if (nodesToUpdate.length === 0) {
                // Try to find prompt nodes in the workflow
                const promptNodeTypes = ['CLIPTextEncode', 'CLIPTextEncodeSDXL'];
                let foundNodes = [];
                
                for (const nodeId in allNodes) {
                    const node = allNodes[nodeId];
                    if (node && promptNodeTypes.includes(node.type)) {
                        foundNodes.push(node);
                    }
                }
                
                if (foundNodes.length === 0) {
                    alert('Не найдено выделенных узлов или узлов промпта. Пожалуйста, выделите узел промпта (CLIPTextEncode) в рабочем пространстве.');
                    return;
                }
                
                // Use the first prompt node found
                nodesToUpdate = [foundNodes[0]];
            }
            
            let updated = 0;
            let debugInfo = [];
            
            for (const node of nodesToUpdate) {
                if (!node) continue;
                
                debugInfo.push(`Узел: ${node.type} (ID: ${node.id})`);
                
                // Try to find text input widget
                // Also check inputs that might have been converted from widgets
                if (node.widgets && node.widgets.length > 0) {
                    // Log all widgets for debugging
                    const widgetDetails = node.widgets.map((w, idx) => {
                        const details = [`${w.name || 'unnamed'}`];
                        if (w.type) details.push(`type:${w.type}`);
                        if (w.value !== undefined) details.push(`value:"${String(w.value).substring(0, 30)}"`);
                        return `[${idx}] ${details.join(', ')}`;
                    }).join(' | ');
                    debugInfo.push(`  Виджеты (${node.widgets.length}): ${widgetDetails}`);
                    
                    // Also check inputs
                    if (node.inputs && node.inputs.length > 0) {
                        const inputDetails = node.inputs.map((inp, idx) => {
                            return `[${idx}] ${inp.name || 'unnamed'} (${inp.type || 'unknown'})`;
                        }).join(' | ');
                        debugInfo.push(`  Inputs (${node.inputs.length}): ${inputDetails}`);
                    }
                    
                    for (let i = 0; i < node.widgets.length; i++) {
                        const widget = node.widgets[i];
                        
                        // CLIPTextEncode typically has a widget named "text"
                        // Check widget name first (most reliable)
                        const widgetName = widget.name || '';
                        const widgetNameLower = widgetName.toLowerCase();
                        
                        // For CLIPTextEncode, accept ANY widget named "text" - be very permissive
                        const isCLIPTextEncode = node.type === 'CLIPTextEncode' || node.type === 'CLIPTextEncodeSDXL';
                        const isTextWidgetName = widgetNameLower === 'text';
                        
                        // According to ComfyUI docs, widget types are in lowercase
                        // STRING widgets are for text input
                        const widgetTypeLower = widget.type ? widget.type.toLowerCase() : '';
                        const isStringType = widgetTypeLower === 'string' || 
                                            widgetTypeLower === 'text' ||
                                            widgetTypeLower.includes('string');
                        
                        // For other node types, check both name and type
                        const isTextWidgetForOtherNodes = (widgetNameLower === 'text' || 
                                                          widgetNameLower === 'prompt' ||
                                                          widgetNameLower.includes('prompt') ||
                                                          widgetNameLower.includes('positive')) && 
                                                          isStringType;
                        
                        // Update condition: 
                        // 1. For CLIPTextEncode: ANY widget named "text"
                        // 2. For others: widget named "text"/"prompt" AND type is string
                        const shouldUpdate = (isCLIPTextEncode && isTextWidgetName) || 
                                           (!isCLIPTextEncode && isTextWidgetForOtherNodes);
                        
                        if (shouldUpdate) {
                            try {
                                // Method 1: Update widgets_values array first (used by ComfyUI internally)
                                if (node.widgets_values && Array.isArray(node.widgets_values)) {
                                    // Find widget index and update
                                    const widgetIndex = node.widgets.findIndex(w => w.name === widget.name);
                                    if (widgetIndex >= 0 && widgetIndex < node.widgets_values.length) {
                                        node.widgets_values[widgetIndex] = promptText;
                                        debugInfo.push(`  Метод 1: widgets_values[${widgetIndex}] = "${promptText.substring(0, 50)}..."`);
                                    }
                                }
                                
                                // Method 2: Direct value assignment (most common)
                                // widget.value is a property with get/set methods
                                try {
                                    widget.value = promptText;
                                    debugInfo.push(`  Метод 2: widget.value установлен`);
                                } catch (valError) {
                                    debugInfo.push(`  Метод 2: ошибка установки widget.value - ${valError.message}`);
                                }
                                
                                // Method 3: Update widget's DOM element directly if it exists
                                try {
                                    // Try multiple ways to find the node's DOM element
                                    let nodeElement = null;
                                    
                                    // Method 3a: Use canvas.getNodeElement
                                    if (app.canvas && typeof app.canvas.getNodeElement === 'function') {
                                        nodeElement = app.canvas.getNodeElement(node);
                                    }
                                    
                                    // Method 3b: Find by node ID in DOM
                                    if (!nodeElement && node.id) {
                                        nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
                                    }
                                    
                                    // Method 3c: Find by node type and position
                                    if (!nodeElement && app.canvas) {
                                        const allNodeElements = document.querySelectorAll('.lg-node');
                                        for (const el of allNodeElements) {
                                            if (el.textContent && el.textContent.includes(node.title || node.type)) {
                                                nodeElement = el;
                                                break;
                                            }
                                        }
                                    }
                                    
                                    if (nodeElement) {
                                        // Try to find the widget input/textarea
                                        // ComfyUI widgets are usually in a div with class containing widget name
                                        const widgetSelectors = [
                                            `input[name="${widget.name}"]`,
                                            `textarea[name="${widget.name}"]`,
                                            `input[data-widget-name="${widget.name}"]`,
                                            `textarea[data-widget-name="${widget.name}"]`,
                                            `.node_${node.id} input`,
                                            `.node_${node.id} textarea`,
                                            `[data-widget="${widget.name}"]`,
                                        ];
                                        
                                        let widgetInput = null;
                                        for (const selector of widgetSelectors) {
                                            widgetInput = nodeElement.querySelector(selector);
                                            if (widgetInput) break;
                                        }
                                        
                                        // Also try to find by textarea if it's a multiline widget
                                        if (!widgetInput && widget.type && widget.type.includes('multiline')) {
                                            widgetInput = nodeElement.querySelector('textarea');
                                        }
                                        
                                        if (widgetInput && (widgetInput.tagName === 'INPUT' || widgetInput.tagName === 'TEXTAREA')) {
                                            widgetInput.value = promptText;
                                            // Trigger events to notify ComfyUI
                                            widgetInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                                            widgetInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                                            // Also try focus/blur to trigger updates
                                            widgetInput.focus();
                                            widgetInput.blur();
                                            debugInfo.push(`  Метод 3: DOM элемент обновлен (${widgetInput.tagName})`);
                                        } else {
                                            debugInfo.push(`  Метод 3: DOM элемент виджета не найден`);
                                        }
                                    } else {
                                        debugInfo.push(`  Метод 3: DOM элемент узла не найден`);
                                    }
                                } catch (domError) {
                                    debugInfo.push(`  Метод 3: ошибка обновления DOM - ${domError.message}`);
                                }
                                
                                // Method 4: Update widget's options if it has them
                                if (widget.options && typeof widget.options === 'object') {
                                    widget.options.default = promptText;
                                    debugInfo.push(`  Метод 4: widget.options.default установлен`);
                                }
                                
                                // Method 5: Trigger widget callback if exists (important for UI update)
                                // This should be called last to ensure all values are set
                                if (widget.callback && typeof widget.callback === 'function') {
                                    try {
                                        widget.callback(promptText);
                                        debugInfo.push(`  Метод 5: callback вызван`);
                                    } catch (cbError) {
                                        console.warn('Callback error:', cbError);
                                        debugInfo.push(`  Метод 5: ошибка callback - ${cbError.message}`);
                                    }
                                }
                                
                                // Method 6: Try widget's own update method if it exists
                                if (widget.computeSize && typeof widget.computeSize === 'function') {
                                    // Force widget to recompute size
                                    try {
                                        widget.computeSize();
                                    } catch (e) {
                                        // Ignore
                                    }
                                }
                                
                                // Update node using ComfyUI methods
                                // Try multiple update methods for compatibility
                                if (typeof node.setDirtyCanvas === 'function') {
                                    node.setDirtyCanvas(true);
                                }
                                if (typeof node.onNodeUpdated === 'function') {
                                    node.onNodeUpdated();
                                }
                                if (typeof node.setSize === 'function') {
                                    // Force node to recalculate size if text changed
                                    node.setSize([node.size[0], node.computeSize()[1]]);
                                }
                                
                                // Mark canvas as dirty for redraw
                                if (app.canvas) {
                                    if (typeof app.canvas.setDirtyCanvas === 'function') {
                                        app.canvas.setDirtyCanvas(true, false);
                                    }
                                    if (typeof app.canvas.setDirty === 'function') {
                                        app.canvas.setDirty(true);
                                    }
                                }
                                if (app.graph && typeof app.graph.setDirtyCanvas === 'function') {
                                    app.graph.setDirtyCanvas(true, false);
                                }
                                if (app.graph && typeof app.graph.setDirty === 'function') {
                                    app.graph.setDirty(true);
                                }
                                
                                debugInfo.push(`  ✓ Обновлен виджет: ${widget.name} (тип: ${widget.type})`);
                                updated++;
                                break;
                            } catch (widgetError) {
                                console.error('Error updating widget:', widgetError, widget);
                                debugInfo.push(`  ✗ Ошибка обновления виджета ${widget.name}: ${widgetError.message}`);
                            }
                        }
                    }
                } else {
                    debugInfo.push('  Нет виджетов');
                }
            }
            
            // Log debug info
            console.log('Send to node debug info:', debugInfo.join('\n'));
            
            if (updated > 0) {
                // Visual feedback
                const notification = document.createElement('div');
                notification.textContent = `Промпт отправлен в ${updated} узел(ов)`;
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #4caf50;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 4px;
                    z-index: 10000;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
            } else {
                const errorMsg = `Не удалось найти поле для промпта.\n\nОтладочная информация:\n${debugInfo.join('\n')}\n\nУбедитесь, что выделен узел CLIPTextEncode или CLIPTextEncodeSDXL с виджетом типа STRING.`;
                console.error('Failed to update nodes:', errorMsg);
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Error sending to node:', error);
            alert('Ошибка при отправке промпта в узел: ' + error.message + '\n\nПроверьте консоль браузера для подробностей.');
        }
    },

    showSettings() {
        // Create a simple settings dialog
        const dialog = document.createElement('div');
        dialog.className = 'ai-settings-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-color, #1e1e1e);
            border: 1px solid var(--border-color, #333);
            border-radius: 8px;
            padding: 20px;
            z-index: 10000;
            color: var(--text-color, #fff);
            min-width: 320px;
            max-width: 480px;
            width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
        `;

        dialog.innerHTML = `
            <h3 style="margin-top: 0;">Настройки ассистента</h3>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px;">Тип бэкенда:</label>
                <select id="ai-backend-type" style="width: 100%; padding: 6px; border: 1px solid #444; border-radius: 4px; background: #333; color: #fff;">
                    <option value="ollama" ${chatManager.backendType === 'ollama' ? 'selected' : ''}>Ollama</option>
                    <option value="vllm" ${chatManager.backendType === 'vllm' ? 'selected' : ''}>vLLM</option>
                </select>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">Выберите тип сервера для генерации</div>
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px;">Язык промпта:</label>
                <select id="ai-prompt-language" style="width: 100%; padding: 6px; border: 1px solid #444; border-radius: 4px; background: #333; color: #fff;">
                    <option value="en" ${chatManager.promptLanguage === 'en' ? 'selected' : ''}>English (Английский)</option>
                    <option value="ru" ${chatManager.promptLanguage === 'ru' ? 'selected' : ''}>Russian (Русский)</option>
                </select>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">Выберите язык для системного промпта</div>
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px;">Размер шрифта:</label>
                <input type="range" id="ai-font-size" min="10" max="20" value="${chatManager.config.ui?.fontSize || 13}" 
                       style="width: 100%;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; opacity: 0.7; margin-top: 4px;">
                    <span>10px</span>
                    <span id="ai-font-size-value">${chatManager.config.ui?.fontSize || 13}px</span>
                    <span>20px</span>
                </div>
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px;">API Endpoint:</label>
                <input type="text" id="ai-api-endpoint" value="${chatManager.apiEndpoint}" 
                       style="width: 100%; padding: 6px; border: 1px solid #444; border-radius: 4px; background: #333; color: #fff;">
                <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;" id="endpoint-hint">
                    Ollama: http://localhost:11434/api/generate<br>
                    vLLM: http://localhost:8000/v1/chat/completions
                </div>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px;">Модель:</label>
                <input type="text" id="ai-model" value="${chatManager.model}" 
                       style="width: 100%; padding: 6px; border: 1px solid #444; border-radius: 4px; background: #333; color: #fff;">
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
                    <button id="ai-fetch-models" style="padding: 6px 12px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer;">Обновить список моделей</button>
                    <select id="ai-model-select" style="flex: 1; padding: 6px; border: 1px solid #444; border-radius: 4px; background: #333; color: #fff;">
                        <option value="">— выбрать локальную модель —</option>
                    </select>
                </div>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px;">Системный промпт:</label>
                <textarea id="ai-system-prompt" style="width: 100%; min-height: 120px; padding: 8px; border: 1px solid #444; border-radius: 4px; background: #333; color: #fff; font-size: 13px; resize: vertical; font-family: inherit; box-sizing: border-box;" placeholder="Введите системный промпт..."></textarea>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">Рекомендуется: вывод только финального промпта на английском</div>
            </div>
            <div style="text-align: right;">
                <button id="ai-settings-cancel" style="margin-right: 8px; padding: 6px 12px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Отмена</button>
                <button id="ai-settings-save" style="padding: 6px 12px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">Сохранить</button>
            </div>
        `;

        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(dialog);

        // Handle buttons
        dialog.querySelector('#ai-settings-cancel').onclick = () => {
            document.body.removeChild(backdrop);
            document.body.removeChild(dialog);
        };

        // Hook up model fetching and selection
        const backendTypeSelect = dialog.querySelector('#ai-backend-type');
        const endpointInput = dialog.querySelector('#ai-api-endpoint');
        const fetchBtn = dialog.querySelector('#ai-fetch-models');
        const modelSelect = dialog.querySelector('#ai-model-select');
        const modelInput = dialog.querySelector('#ai-model');
        const systemPromptTextarea = dialog.querySelector('#ai-system-prompt');
        const languageSelect = dialog.querySelector('#ai-prompt-language');
        const fontSizeSlider = dialog.querySelector('#ai-font-size');
        const fontSizeValue = dialog.querySelector('#ai-font-size-value');
        
        // Handle font size slider
        fontSizeSlider.oninput = (e) => {
            fontSizeValue.textContent = e.target.value + 'px';
        };
        
        // Handle language change - update system prompt preview
        languageSelect.onchange = () => {
            const lang = languageSelect.value;
            const systemPrompts = chatManager.config.systemPrompts || chatManager.config.chat?.systemPrompts || {};
            if (systemPrompts[lang]) {
                systemPromptTextarea.value = systemPrompts[lang];
            }
        };
        
        // Handle backend type change
        backendTypeSelect.onchange = () => {
            const backend = backendTypeSelect.value;
            const config = chatManager.config.alternatives[backend];
            if (config) {
                endpointInput.value = config.endpoint;
                modelInput.value = config.model;
            }
        };

        // Prefill system prompt based on current language
        try {
            const currentLang = chatManager.promptLanguage || 'en';
            const systemPrompts = chatManager.config.systemPrompts || chatManager.config.chat?.systemPrompts || {};
            if (systemPrompts[currentLang]) {
                systemPromptTextarea.value = systemPrompts[currentLang];
            } else {
                systemPromptTextarea.value = (chatManager.config?.chat?.systemPrompt?.chat) || '';
            }
        } catch (e) {
            systemPromptTextarea.value = '';
        }

        const populateModels = async () => {
            fetchBtn.disabled = true;
            const original = fetchBtn.textContent;
            fetchBtn.textContent = 'Загрузка...';
            
            // Temporarily set the backend type to fetch from the correct source
            const originalBackendType = chatManager.backendType;
            const selectedBackendType = backendTypeSelect.value;
            chatManager.backendType = selectedBackendType;
            
            // Also temporarily update the endpoint to fetch from the right place
            const originalEndpoint = chatManager.apiEndpoint;
            chatManager.apiEndpoint = endpointInput.value;
            
            const names = await chatManager.fetchLocalModels();
            
            // Restore original values (will be saved only if user clicks Save)
            chatManager.backendType = originalBackendType;
            chatManager.apiEndpoint = originalEndpoint;
            
            modelSelect.innerHTML = '<option value="">— выбрать локальную модель —</option>';
            names.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n;
                opt.textContent = n;
                if (n === modelInput.value) opt.selected = true;
                modelSelect.appendChild(opt);
            });
            fetchBtn.textContent = original;
            fetchBtn.disabled = false;
        };

        fetchBtn.onclick = () => { populateModels(); };
        modelSelect.onchange = () => {
            const val = modelSelect.value;
            if (val) modelInput.value = val;
        };

        dialog.querySelector('#ai-settings-save').onclick = () => {
            chatManager.backendType = dialog.querySelector('#ai-backend-type').value;
            chatManager.apiEndpoint = dialog.querySelector('#ai-api-endpoint').value;
            chatManager.model = dialog.querySelector('#ai-model').value;
            const newSystemPrompt = systemPromptTextarea.value;
            const newLanguage = languageSelect.value;
            const newFontSize = parseInt(fontSizeSlider.value, 10);

            // Persist via config storage
            const current = loadConfig();
            
            // Update system prompt for the selected language
            const existingSystemPrompts = current.systemPrompts || current.chat?.systemPrompts || {};
            const systemPrompts = {
                ...existingSystemPrompts,
                [newLanguage]: newSystemPrompt
            };
            
            const updated = {
                ...current,
                backendType: chatManager.backendType,
                apiEndpoint: chatManager.apiEndpoint,
                model: chatManager.model,
                promptLanguage: newLanguage,
                ui: {
                    ...(current.ui || {}),
                    fontSize: newFontSize
                },
                chat: {
                    ...(current.chat || {}),
                    systemPrompt: {
                        ...((current.chat && current.chat.systemPrompt) || {}),
                        chat: newSystemPrompt !== undefined ? newSystemPrompt : ((current.chat && current.chat.systemPrompt && current.chat.systemPrompt.chat) || '')
                    }
                },
                systemPrompts: systemPrompts
            };
            saveConfig(updated);
            chatManager.config = updated;
            chatManager.promptLanguage = newLanguage;
            chatManager.updateSystemPrompt();

            document.body.removeChild(backdrop);
            document.body.removeChild(dialog);
            
            // Re-render messages with new font size
            if (this.messagesContainer) {
                this.renderChatMessages(this.messagesContainer);
            }
        };

        backdrop.onclick = () => {
            document.body.removeChild(backdrop);
            document.body.removeChild(dialog);
        };
    }
});
