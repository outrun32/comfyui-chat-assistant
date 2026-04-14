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
        ollamaContext: 'prompt-assistant-ollama-context'
    }
};

const SECRET_DB_NAME = 'prompt-assistant-secrets';
const SECRET_STORE_NAME = 'secrets';
const SECRET_KEY_RECORD = 'api-key-crypto-key';
const SECRET_VALUE_RECORD = 'api-key-encrypted';

let legacyApiKey = '';

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

function sanitizeConfig(config = {}) {
    if (!isPlainObject(config)) {
        return {};
    }

    const { apiKey, ...persistedConfig } = config;
    if (apiKey) {
        legacyApiKey = apiKey;
    }

    return persistedConfig;
}

function openSecretsDb() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is not available.'));
            return;
        }

        const request = indexedDB.open(SECRET_DB_NAME, 1);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(SECRET_STORE_NAME)) {
                db.createObjectStore(SECRET_STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'));
    });
}

function runStoreRequest(store, method, ...args) {
    return new Promise((resolve, reject) => {
        const request = store[method](...args);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error(`IndexedDB ${method} failed.`));
    });
}

async function withSecretStore(mode, callback) {
    const db = await openSecretsDb();

    try {
        const transaction = db.transaction(SECRET_STORE_NAME, mode);
        const store = transaction.objectStore(SECRET_STORE_NAME);
        const completion = new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
            transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
        });
        const result = await callback(store);
        await completion;
        return result;
    } finally {
        db.close();
    }
}

async function getEncryptionKey() {
    return withSecretStore('readwrite', async (store) => {
        let key = await runStoreRequest(store, 'get', SECRET_KEY_RECORD);
        if (key) {
            return key;
        }

        key = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
        await runStoreRequest(store, 'put', key, SECRET_KEY_RECORD);
        return key;
    });
}

function bytesToBase64(bytes) {
    return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}

function base64ToBytes(base64) {
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export function normalizeConfig(config = {}) {
    return deepMerge(deepMerge(DEFAULT_CONFIG, loadLegacyConfig()), sanitizeConfig(config));
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
                legacyApiKey = parsed.apiKey;
                localStorage.setItem(DEFAULT_CONFIG.storage.config, JSON.stringify(sanitizeConfig(parsed)));
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
        localStorage.setItem(DEFAULT_CONFIG.storage.config, JSON.stringify(normalized));
        localStorage.setItem(DEFAULT_CONFIG.storage.apiEndpoint, normalized.apiEndpoint);
        localStorage.setItem(DEFAULT_CONFIG.storage.model, normalized.model);
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
        legacyApiKey = '';
        void clearApiKey();
        return true;
    } catch (e) {
        console.error('Failed to reset AI chat config:', e);
        return false;
    }
}

export async function loadApiKey() {
    if (legacyApiKey) {
        const apiKey = legacyApiKey;
        legacyApiKey = '';
        await saveApiKey(apiKey);
        return apiKey;
    }

    try {
        const encrypted = await withSecretStore('readonly', (store) => runStoreRequest(store, 'get', SECRET_VALUE_RECORD));
        if (!encrypted?.iv || !encrypted?.ciphertext) {
            return '';
        }

        const key = await getEncryptionKey();
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: base64ToBytes(encrypted.iv) },
            key,
            base64ToBytes(encrypted.ciphertext)
        );
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.warn('Failed to load encrypted API key:', e);
        return '';
    }
}

export async function saveApiKey(apiKey = '') {
    try {
        if (!apiKey) {
            await clearApiKey();
            return true;
        }

        const key = await getEncryptionKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            new TextEncoder().encode(apiKey)
        );

        await withSecretStore('readwrite', (store) => runStoreRequest(store, 'put', {
            iv: bytesToBase64(iv),
            ciphertext: bytesToBase64(new Uint8Array(encrypted))
        }, SECRET_VALUE_RECORD));
        legacyApiKey = '';
        return true;
    } catch (e) {
        console.warn('Failed to save encrypted API key:', e);
        return false;
    }
}

export async function clearApiKey() {
    try {
        await withSecretStore('readwrite', (store) => runStoreRequest(store, 'delete', SECRET_VALUE_RECORD));
        legacyApiKey = '';
        return true;
    } catch (e) {
        console.warn('Failed to clear encrypted API key:', e);
        return false;
    }
}
