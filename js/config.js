/**
 * Конфигурация для Ассистента промптов нумизматической продукции
 */

export const DEFAULT_CONFIG = {
    // AI Service Configuration
    apiEndpoint: "http://localhost:11434/api/generate", // Ollama default
    model: "gemma3:4b",
    
    // Backend type: 'ollama', 'vllm', or 'openai'
    backendType: "ollama",
    
    // Alternative API configurations
    alternatives: {
        openai: {
            endpoint: "https://api.openai.com/v1/chat/completions",
            model: "gpt-3.5-turbo",
            requiresApiKey: true
        },
        anthropic: {
            endpoint: "https://api.anthropic.com/v1/messages",
            model: "claude-3-haiku-20240307",
            requiresApiKey: true
        },
        ollama: {
            endpoint: "http://localhost:11434/api/generate",
            model: "gemma3",
            requiresApiKey: false
        },
        vllm: {
            endpoint: "http://localhost:8000/v1/chat/completions",
            model: "meta-llama/Llama-3.2-3B-Instruct",
            requiresApiKey: false
        }
    },
    
    // UI Configuration
    ui: {
        maxChatHistory: 100,
        autoSave: true,
        theme: "dark", // dark, light, auto
        animations: true,
        showTimestamps: false,
        compactMode: false,
        fontSize: 13 // Default font size in pixels
    },
    
    // Prompt language: 'en' or 'ru'
    promptLanguage: "en",
    
    // Chat behavior
    chat: {
        autoScroll: true,
        enterToSend: true,
        saveHistory: true,
        systemPrompt: {
            chat: "", // Will be set based on language
            expansion: "Ты — ассистент промптов. Возвращай только улучшенный промпт для генерации на английском языке, без комментариев."
        }
    },
    
    // Language-specific system prompts
    systemPrompts: {
        en: "You are a prompt assistant. You receive complex descriptions/requirements from the user and return ONLY the final prompt for an image generation model. Output nothing but the prompt: no explanations, headers, lists, quotes, prefixes, or suffixes. Rewrite and improve the request to be maximally clear for AI generation: clear composition, key objects and their attributes, style/genre, lighting, angle, environment, materials, quality, limitations. Preserve important domain-specific terms (numismatics: obverse/reverse, relief, legend, field, edge, etc.), but don't add unnecessary theory. If needed, structure it within a single line using commas and short phrases. ALWAYS output the final prompt in English.",
        ru: "Ты — ассистент промптов. Получаешь сложные описания/ТЗ от пользователя и возвращаешь ТОЛЬКО финальный промпт для модели генерации изображений. Ничего кроме промпта не выводи: без пояснений, заголовков, списков, кавычек, префиксов и постфиксов. Перепиши и улучшай запрос так, чтобы он был максимально понятен ИИ-генерации: четкая композиция, ключевые объекты и их атрибуты, стиль/жанр, свет, ракурс, окружение, материалы, качество, ограничения. Сохраняй важные термины предметной области (нумизматика: аверс/реверс, рельеф, легенда, поле, гурт и т.п.), но не добавляй лишней теории. Если нужно, структурируй внутри одной строки через запятые и короткие фразы. ВСЕГДА выводи финальный промпт на английском языке."
    },
    
    // Storage keys
    storage: {
        chatHistory: 'prompt-assistant-history',
        apiEndpoint: 'prompt-assistant-endpoint',
        model: 'prompt-assistant-model',
        config: 'prompt-assistant-config',
        ollamaContext: 'prompt-assistant-ollama-context'
    }
};

/**
 * Load configuration from localStorage with fallbacks
 */
export function loadConfig() {
    try {
        const saved = localStorage.getItem(DEFAULT_CONFIG.storage.config);
        if (saved) {
            return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('Failed to load AI chat config:', e);
    }
    return DEFAULT_CONFIG;
}

/**
 * Save configuration to localStorage
 */
export function saveConfig(config) {
    try {
        localStorage.setItem(DEFAULT_CONFIG.storage.config, JSON.stringify(config));
        return true;
    } catch (e) {
        console.error('Failed to save AI chat config:', e);
        return false;
    }
}

/**
 * Reset configuration to defaults
 */
export function resetConfig() {
    try {
        localStorage.removeItem(DEFAULT_CONFIG.storage.config);
        return true;
    } catch (e) {
        console.error('Failed to reset AI chat config:', e);
        return false;
    }
}
