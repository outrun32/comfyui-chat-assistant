# ComfyUI Prompt Assistant Extension

A streamlined ComfyUI extension that adds an AI-powered chat interface to the sidebar. Paste complex briefs/specs and get back only a clean, generation-ready prompt.

## Features

🤖 **AI Chat Interface**: Interactive chat directly in ComfyUI
📝 **Task-to-Prompt**: Paste a brief/requirements and receive only the final generation prompt
💾 **Persistent History**: Chat history is saved locally and persists between sessions
⚙️ **Configurable**: Support for multiple AI services (Ollama, OpenAI, Anthropic, etc.)
🎨 **Modern UI**: Clean, responsive interface that matches ComfyUI's design
📋 **Copy Function**: Easy copying of AI responses to clipboard
🗑️ **Chat Management**: Clear chat history and manage conversations

## Installation

### Method 1: Manual Installation (Recommended)

1. **Clone or download this repository** to your ComfyUI custom nodes directory:
   ```bash
   cd ComfyUI/custom_nodes/
   git clone <this-repository-url> comfyui-ai-chat
   ```

2. **Restart ComfyUI** to load the extension

3. **Configure your AI service** (see Configuration section below)

### Method 2: Direct Copy

1. **Create the extension directory**:
   ```bash
   mkdir -p ComfyUI/custom_nodes/comfyui-ai-chat
   ```

2. **Copy all files** from this repository to the new directory

3. **Restart ComfyUI**

## Configuration

### Default Setup (Ollama)

The extension is preconfigured to work with [Ollama](https://ollama.ai/) running locally:

1. **Install Ollama** from https://ollama.ai/
2. **Pull a model** (e.g., `ollama pull gemma3`)
3. **Start Ollama** service
4. The extension will automatically connect to `http://localhost:11434`

### Alternative AI Services

You can configure the extension to work with other AI services:

#### OpenAI
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Model**: `gpt-3.5-turbo` or `gpt-4`
- **API Key**: Required (set in browser's developer console or through settings)

#### Anthropic Claude
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Model**: `claude-3-haiku-20240307`
- **API Key**: Required

#### Custom API
- Set your own endpoint and model through the settings dialog

### Accessing Settings

1. **Open ComfyUI** and look for the chat icon in the sidebar
2. **Click the settings gear** (⚙️) in the chat panel header
3. **Configure your AI service** endpoint and model
4. **Save settings** - they will persist between sessions

## Usage

### Opening the Chat Panel

1. **Launch ComfyUI** with the extension installed
2. **Look for the chat icon** (💬) in the sidebar
3. **Click the icon** to open the AI chat panel

### Create Prompt from Brief

1. **Paste your description/brief** into the chat input at the bottom
2. **Press Enter** or click "Send"
3. **Copy the result** — the assistant returns only the final prompt, no extra text

### Simple Chat

You can also ask quick questions. However, by design the assistant focuses on producing a single clean prompt output from your brief.

### Managing Chat History

- **Clear all history**: Click the trash icon (🗑️) in the header
- **History persists** automatically between ComfyUI sessions
- **Scroll through history** to review previous conversations

## Examples

### Basic Chat
```
You: How do I improve image quality in ComfyUI?
AI: To improve image quality in ComfyUI, you can...
```

### Prompt Expansion
```
Input: "a cat sitting"
Expanded: "a majestic orange tabby cat sitting gracefully on a vintage wooden chair, soft natural lighting from a nearby window, detailed fur texture, realistic photography style, shallow depth of field, warm color palette, cozy indoor atmosphere"
```

## Technical Details

### File Structure
```
comfyui-prompt-assistant/
├── __init__.py              # Python module definition
├── js/
│   ├── ai-chat-extension.js # Main extension logic
│   ├── ai-chat-styles.css   # UI styling
│   └── config.js            # Configuration management
└── README.md               # This file
```

### Browser Compatibility
- **Modern browsers** with ES6+ support
- **Tested on**: Chrome, Firefox, Safari, Edge
- **Requires**: JavaScript enabled

### Storage
- **Chat history**: Stored in browser's localStorage
- **Settings**: Persisted locally per browser
- **No server storage**: All data remains on your local machine

## Troubleshooting

### Common Issues

#### "Error: Failed to fetch" or "API request failed"
- **Check AI service**: Ensure Ollama or your AI service is running
- **Verify endpoint**: Confirm the API endpoint URL is correct
- **Check network**: Ensure no firewall blocking the connection
- **CORS issues**: Some APIs may require CORS configuration

#### Chat panel not appearing
- **Refresh ComfyUI**: Hard refresh the browser (Ctrl+F5)
- **Check console**: Open browser developer tools for error messages
- **Verify installation**: Ensure all files are in the correct directory

#### Prompt expansion not working
- **Check model**: Ensure your AI model supports text generation
- **Verify prompts**: Try simpler prompts first
- **Check response**: Look for error messages in the chat

### Debug Mode

Enable debug logging in browser console:
```javascript
localStorage.setItem('comfyui-ai-chat-debug', 'true');
```

## API Integration

### Supported APIs

The extension supports various AI APIs with different formats:

#### Ollama Format
```javascript
{
  "model": "llama3.2",
  "prompt": "Your message here",
  "stream": false
}
```

#### OpenAI Format
```javascript
{
  "model": "gpt-3.5-turbo",
  "messages": [{"role": "user", "content": "Your message"}],
  "stream": false
}
```

### Adding Custom APIs

Modify the `sendToAI` method in `ai-chat-extension.js` to support your API format.

## Contributing

Contributions welcome! Please:

1. **Fork the repository**
2. **Create a feature branch**
3. **Test thoroughly** with ComfyUI
4. **Submit a pull request**

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Join ComfyUI community discussions
- **Documentation**: Refer to ComfyUI extension development docs

## Changelog

### v1.0.0
- Initial release
- Basic chat functionality
- Prompt expansion feature
- Ollama integration
- Persistent chat history
- Modern UI design

---

**Made with ❤️ for the ComfyUI community**
