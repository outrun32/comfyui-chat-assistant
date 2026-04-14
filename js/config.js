/**
 * Конфигурация Ассистента
 */

export const DEFAULT_CONFIG = {
    // AI Service Configuration (OpenAI-compatible endpoints only)
    apiEndpoint: "http://10.1.202.20:8007/v1/chat/completions",
    model: "Qwen/Qwen3.5-35B-A3B",
    apiKey: "", // Optional: required for OpenRouter, OpenAI, etc.
    temperature: 0.0,

    // Quick-select presets (all OpenAI-compatible)
    presets: {
        vllm: {
            endpoint: "http://10.1.202.20:8007/v1/chat/completions",
            model: "Qwen/Qwen3.5-35B-A3B"
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
        en: "You are an Assistant specializing in creating prompts for AI image generation.\n\nBehavior rules:\n— If the user asks a question — answer it clearly and concisely.\n— If the user provides a description, brief, or asks to write/improve a prompt — respond with a ready-to-use generation prompt.\n— In ambiguous cases, use your judgment: a short question gets a short answer; a detailed brief gets a prompt.\n— Always respond in the same language the user wrote in.\n\nWhen writing a prompt:\n— Clear composition: foreground / midground / background\n— Key objects, their attributes, materials, textures\n— Lighting, angle, color palette\n— Execution style, technique, level of detail\n— Preserve domain-specific terms as-is (numismatics: obverse/reverse, relief, legend, field, edge, etc.)\n— Keep quoted inscriptions in their original language\n\nExample of a good prompt:\nSilver coin on white background, center — Kamchatka volcano with sharp slopes and grooves from peak downward, above — clouds rendered in fine hatching and a flock of birds flying left to right, along the top arc — inscription «ВУЛКАНЫ КАМЧАТКИ» with crisp edges, midground — river with wave-pattern engraving of the current, foreground — two bears: left bear walking on stones by the water, right bear sitting on the bank, sides — coniferous forest with branch and needle detail in micro-engraving, along the field edge — thin inner border line, reeded edge, coin fully made of silver.",
        ru: "Ты — Ассистент, специализирующийся на составлении промптов для генерации изображений.\n\nПравила поведения:\n— Если пользователь задаёт вопрос — отвечай на него чётко и по делу.\n— Если даёт описание, ТЗ или просит составить/улучшить промпт — возвращай готовый промпт для генерации.\n— В неоднозначных случаях руководствуйся контекстом: короткий вопрос — короткий ответ, развёрнутое описание — промпт.\n— Всегда отвечай на том языке, на котором написал пользователь.\n\nПри составлении промпта:\n— Чёткая композиция: передний / средний / задний план\n— Ключевые объекты, их атрибуты, материалы, текстуры\n— Освещение, ракурс, цветовая гамма\n— Стиль исполнения, техника, детализация\n— Сохраняй профессиональные термины как есть (нумизматика: аверс/реверс, рельеф, легенда, поле, гурт и т.п.)\n— Цитируемые надписи оставляй на оригинальном языке\n\nПример хорошего промпта:\nСеребряная монета на белом фоне, в центре — вулкан Камчатки с чёткими склонами и бороздами от вершины вниз, над ним — облака тонкой насечкой и стая птиц, летящая слева направо, по дуге сверху — надпись «ВУЛКАНЫ КАМЧАТКИ» с чёткими гранями, средний план — река с волнообразной гравировкой течения, передний план — два медведя: слева медведь идёт по камням у воды, справа сидит на берегу, по бокам хвойный лес с детализацией ветвей и иголок микрогравировкой, по краю поля тонкая внутренняя кантовая линия, монета полностью выполнена из серебра."
    },
    
    // Storage keys
    storage: {
        chatHistory: 'prompt-assistant-history',
        apiEndpoint: 'prompt-assistant-endpoint',
        model: 'prompt-assistant-model',
        config: 'prompt-assistant-config',
        apiKeySession: 'prompt-assistant-api-key-session',
        ollamaContext: 'prompt-assistant-ollama-context'
    }
};

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
    if (!isPlainObject(base)) {
        return override === undefined ? base : override;
    }

    const result = { ...base };
    if (!isPlainObject(override)) {
        return result;
    }

    for (const [key, value] of Object.entries(override)) {
        if (value === undefined) continue;

        if (isPlainObject(base[key]) && isPlainObject(value)) {
            result[key] = deepMerge(base[key], value);
        } else {
            result[key] = value;
        }
    }

    return result;
}

function loadLegacyConfig() {
    const legacy = {};

    try {
        const apiEndpoint = localStorage.getItem(DEFAULT_CONFIG.storage.apiEndpoint);
        const model = localStorage.getItem(DEFAULT_CONFIG.storage.model);

        if (apiEndpoint) legacy.apiEndpoint = apiEndpoint;
        if (model) legacy.model = model;
    } catch (e) {
        console.warn('Failed to load legacy AI chat config:', e);
    }

    return legacy;
}

function loadSessionApiKey() {
    try {
        return sessionStorage.getItem(DEFAULT_CONFIG.storage.apiKeySession) || '';
    } catch (e) {
        console.warn('Failed to load session API key:', e);
        return '';
    }
}

function saveSessionApiKey(apiKey = '') {
    try {
        if (apiKey) {
            sessionStorage.setItem(DEFAULT_CONFIG.storage.apiKeySession, apiKey);
        } else {
            sessionStorage.removeItem(DEFAULT_CONFIG.storage.apiKeySession);
        }
    } catch (e) {
        console.warn('Failed to save session API key:', e);
    }
}

export function normalizeConfig(config = {}) {
    const normalized = deepMerge(deepMerge(DEFAULT_CONFIG, loadLegacyConfig()), config);
    const sessionApiKey = loadSessionApiKey();

    if (sessionApiKey) {
        normalized.apiKey = sessionApiKey;
    }

    return normalized;
}

/**
 * Load configuration from localStorage with fallbacks
 */
export function loadConfig() {
    try {
        const saved = localStorage.getItem(DEFAULT_CONFIG.storage.config);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.apiKey) {
                saveSessionApiKey(parsed.apiKey);
            }
            return normalizeConfig(parsed);
        }
    } catch (e) {
        console.warn('Failed to load AI chat config:', e);
    }
    return normalizeConfig();
}

/**
 * Save configuration to localStorage
 */
export function saveConfig(config) {
    try {
        const normalized = normalizeConfig(config);
        const { apiKey, ...persistedConfig } = normalized;

        localStorage.setItem(DEFAULT_CONFIG.storage.config, JSON.stringify(persistedConfig));
        localStorage.setItem(DEFAULT_CONFIG.storage.apiEndpoint, normalized.apiEndpoint);
        localStorage.setItem(DEFAULT_CONFIG.storage.model, normalized.model);
        saveSessionApiKey(apiKey);
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
        localStorage.removeItem(DEFAULT_CONFIG.storage.apiEndpoint);
        localStorage.removeItem(DEFAULT_CONFIG.storage.model);
        sessionStorage.removeItem(DEFAULT_CONFIG.storage.apiKeySession);
        return true;
    } catch (e) {
        console.error('Failed to reset AI chat config:', e);
        return false;
    }
}
