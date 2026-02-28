/**
 * Конфигурация Ассистента
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
            expansion: "Ты — Ассистент. Возвращай только улучшенный промпт для генерации на английском языке, без комментариев."
        }
    },
    
    // Language-specific system prompts
    systemPrompts: {
        en: "You are an Assistant specializing in prompt writing for image generation. You receive complex descriptions or briefs from the user and return ONLY the final prompt for an image generation model. Output nothing but the prompt: no explanations, headers, lists, quotes, prefixes, or suffixes.\n\nRules for writing the prompt:\n— Clear composition: foreground / midground / background\n— Key objects, their attributes, materials, textures\n— Lighting, angle, color palette\n— Execution style, technique, level of detail\n— Preserve professional domain-specific terms (numismatics: obverse/reverse, relief, legend, field, edge, etc.)\n\nExample of a good prompt:\nSilver coin on white background, center — Kamchatka volcano with sharp slopes and grooves from peak downward, above — clouds rendered in fine hatching and a flock of birds flying left to right, along the top arc — inscription \"VOLCANOES OF KAMCHATKA\" with crisp edges, midground — river with wave-pattern engraving of the current, foreground — two bears: left bear walking on stones by the water, right bear sitting on the bank, sides — coniferous forest with branch and needle detail in micro-engraving, along the field edge — thin inner border line, reeded edge, coin fully made of silver.\n\nALWAYS output the final prompt in English.",
        ru: "Ты — Ассистент, специализирующийся на составлении промптов для генерации изображений. Получаешь описания и ТЗ от пользователя и возвращаешь ТОЛЬКО финальный промпт для модели генерации изображений. Ничего кроме промпта не выводи: без пояснений, заголовков, списков, кавычек, префиксов и постфиксов.\n\nПравила составления промпта:\n— Чёткая композиция: передний / средний / задний план\n— Ключевые объекты, их атрибуты, материалы, текстуры\n— Освещение, ракурс, цветовая гамма\n— Стиль исполнения, техника, детализация\n— Сохраняй профессиональные термины предметной области (нумизматика: аверс/реверс, рельеф, легенда, поле, гурт и т.п.)\n\nПример хорошего промпта:\nСеребряная монета на белом фоне, в центре — вулкан Камчатки с чёткими склонами и бороздами от вершины вниз, над ним — облака тонкой насечкой и стая птиц, летящая слева направо, по дуге сверху — надпись «ВУЛКАНЫ КАМЧАТКИ» с чёткими гранями, средний план — река с волнообразной гравировкой течения, передний план — два медведя: слева медведь идёт по камням у воды, справа сидит на берегу, по бокам хвойный лес с детализацией ветвей и иголок микрогравировкой, по краю поля тонкая внутренняя кантовая линия, гурт рифлёный, монета полностью выполнена из серебра.\n\nВСЕГДА выводи финальный промпт на английском языке."
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
