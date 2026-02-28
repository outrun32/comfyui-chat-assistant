"""
ComfyUI AI Chat & Prompt Expansion Extension

This extension provides a sidebar chat interface for AI-powered prompt expansion and conversation.
"""

# Export the web directory so ComfyUI can find our JavaScript files
WEB_DIRECTORY = "./js"

# Node class mappings (empty for this extension as it's UI-only)
NODE_CLASS_MAPPINGS: dict = {}
NODE_DISPLAY_NAME_MAPPINGS: dict = {}

# Export all required variables
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
