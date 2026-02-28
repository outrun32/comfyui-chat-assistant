/**
 * Конфигурация Ассистента
 */

export const DEFAULT_CONFIG = {
    // AI Service Configuration (OpenAI-compatible endpoints only)
    apiEndpoint: "http://localhost:8000/v1/chat/completions",
    model: "meta-llama/Llama-3.2-3B-Instruct",
    apiKey: "", // Optional: required for OpenRouter, OpenAI, etc.

    // Quick-select presets (all OpenAI-compatible)
    presets: {
        vllm: {
            endpoint: "http://localhost:8000/v1/chat/completions",
            model: "meta-llama/Llama-3.2-3B-Instruct"
        },
        lmstudio: {
            endpoint: "http://localhost:1234/v1/chat/completions",
            model: ""
        },
        openrouter: {
            endpoint: "https://openrouter.ai/api/v1/chat/completions",
            model: "openai/gpt-4o-mini"
        },
        openai: {
            endpoint: "https://api.openai.com/v1/chat/completions",
            model: "gpt-4o-mini"
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
            expansion: "Ты — Ассистент. Возвращай только улучшенный промпт для генерации на английском языке, без комментариев."
        }
    },
    
    // Language-specific system prompts
    systemPrompts: {
        en: "You are an Assistant specializing in creating prompts for AI image generation.\n\nBehavior rules:\n— If the user asks a question — answer it clearly and concisely.\n— If the user provides a description, brief, or asks to write/improve a prompt — respond with a ready-to-use generation prompt.\n— In ambiguous cases, use your judgment: a short question gets a short answer; a detailed brief gets a prompt.\n\nWhen writing a prompt:\n— Clear composition: foreground / midground / background\n— Key objects, their attributes, materials, textures\n— Lighting, angle, color palette\n— Execution style, technique, level of detail\n— Preserve domain-specific terms as-is (numismatics: obverse/reverse, relief, legend, field, edge, etc.)\n— Keep quoted inscriptions in their original language\n— Always output the prompt in English\n\nExample of a good prompt:\nSilver coin on white background, center — Kamchatka volcano with sharp slopes and grooves from peak downward, above — clouds rendered in fine hatching and a flock of birds flying left to right, along the top arc — inscription «ВУЛКАНЫ КАМЧАТКИ» with crisp edges, midground — river with wave-pattern engraving of the current, foreground — two bears: left bear walking on stones by the water, right bear sitting on the bank, sides — coniferous forest with branch and needle detail in micro-engraving, along the field edge — thin inner border line, reeded edge, coin fully made of silver.",
        ru: "Ты — Ассистент, специализирующийся на составлении промптов для генерации изображений.\n\nПравила поведения:\n— Если пользователь задаёт вопрос — отвечай на него чётко и по делу.\n— Если даёт описание, ТЗ или просит составить/улучшить промпт — возвращай готовый промпт для генерации.\n— В неоднозначных случаях руководствуйся контекстом: короткий вопрос — короткий ответ, развёрнутое описание — промпт.\n\nПри составлении промпта:\n— Чёткая композиция: передний / средний / задний план\n— Ключевые объекты, их атрибуты, материалы, текстуры\n— Освещение, ракурс, цветовая гамма\n— Стиль исполнения, техника, детализация\n— Сохраняй профессиональные термины как есть (нумизматика: аверс/реверс, рельеф, легенда, поле, гурт и т.п.)\n— Цитируемые надписи оставляй на оригинальном языке\n— Промпт всегда на английском языке\n\nПример хорошего промпта:\nSilver coin on white background, center — Kamchatka volcano with sharp slopes and grooves from peak downward, above — clouds rendered in fine hatching and a flock of birds flying left to right, along the top arc — inscription «ВУЛКАНЫ КАМЧАТКИ» with crisp edges, midground — river with wave-pattern engraving of the current, foreground — two bears: left bear walking on stones by the water, right bear sitting on the bank, sides — coniferous forest with branch and needle detail in micro-engraving, along the field edge — thin inner border line, reeded edge, coin fully made of silver."
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
