/**
 * Example Configuration for AI Chat Extension
 * 
 * Copy this file to config.js and modify as needed.
 * This file shows various configuration options available.
 */

// Example configurations for different AI services
const EXAMPLE_CONFIGS = {
    // Local Ollama setup (default)
    ollama: {
        apiEndpoint: "http://localhost:11434/api/generate",
        model: "llama3.2",
        systemPrompt: {
            chat: "You are a helpful AI assistant for ComfyUI workflows.",
            expansion: "Expand image generation prompts with artistic details."
        }
    },

    // OpenAI GPT setup
    openai: {
        apiEndpoint: "https://api.openai.com/v1/chat/completions",
        model: "gpt-4o-mini",
        apiKey: "your-openai-api-key-here",
        systemPrompt: {
            chat: "You are an expert ComfyUI assistant helping with AI image generation workflows.",
            expansion: "You are a professional prompt engineer. Expand the given prompt with detailed artistic descriptions, technical specifications, and visual elements that would create stunning AI-generated images."
        }
    },

    // Anthropic Claude setup
    anthropic: {
        apiEndpoint: "https://api.anthropic.com/v1/messages",
        model: "claude-3-haiku-20240307",
        apiKey: "your-anthropic-api-key-here",
        systemPrompt: {
            chat: "You are Claude, an AI assistant helping users with ComfyUI, a node-based interface for AI image generation.",
            expansion: "Transform simple prompts into detailed, artistic descriptions that will generate beautiful AI images. Focus on visual details, composition, lighting, and style."
        }
    },

    // Local LM Studio setup
    lmstudio: {
        apiEndpoint: "http://localhost:1234/v1/chat/completions",
        model: "local-model",
        systemPrompt: {
            chat: "You are a local AI assistant helping with creative workflows.",
            expansion: "Enhance prompts for better image generation results."
        }
    },

    // vLLM setup (local server with OpenAI-compatible API)
    vllm: {
        apiEndpoint: "http://localhost:8000/v1/chat/completions",
        model: "meta-llama/Llama-3.2-3B-Instruct",
        systemPrompt: {
            chat: "You are an AI assistant specialized in creating high-quality image generation prompts.",
            expansion: "Transform user descriptions into detailed, structured prompts for AI image generation."
        }
    },

    // Hugging Face Inference API
    huggingface: {
        apiEndpoint: "https://api-inference.huggingface.co/models/microsoft/DialoGPT-large",
        model: "microsoft/DialoGPT-large",
        apiKey: "your-hf-token-here",
        systemPrompt: {
            chat: "Help users with their ComfyUI workflows and AI image generation.",
            expansion: "Create detailed, vivid prompts for AI image generation."
        }
    }
};

// UI customization examples
const UI_THEMES = {
    dark: {
        primary: "#1e1e1e",
        secondary: "#2a2a2a",
        accent: "#007acc",
        text: "#ffffff",
        border: "#333333"
    },
    light: {
        primary: "#ffffff",
        secondary: "#f5f5f5",
        accent: "#0066cc",
        text: "#000000",
        border: "#cccccc"
    },
    neon: {
        primary: "#0a0a0a",
        secondary: "#1a1a1a",
        accent: "#00ff88",
        text: "#ffffff",
        border: "#00ff88"
    }
};

// Advanced configuration options
const ADVANCED_OPTIONS = {
    // Rate limiting
    rateLimiting: {
        enabled: true,
        maxRequestsPerMinute: 30,
        maxRequestsPerHour: 500
    },

    // Response processing
    responseProcessing: {
        maxLength: 4000,
        filterProfanity: false,
        autoFormatCode: true,
        enableMarkdown: true
    },

    // Chat behavior
    chatBehavior: {
        autoSuggestPrompts: true,
        rememberContext: true,
        maxContextHistory: 10,
        autoSaveInterval: 30000 // milliseconds
    },

    // Debugging
    debug: {
        enabled: false,
        logLevel: "info", // error, warn, info, debug
        logApiCalls: false,
        showResponseTime: false
    }
};

export { EXAMPLE_CONFIGS, UI_THEMES, ADVANCED_OPTIONS };
