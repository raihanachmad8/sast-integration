/**
 * AI provider configurations — base URLs, icons, and default models.
 */

export const AI_PROVIDERS = [
  {
    value: 'openai',
    label: 'OpenAI',
    icon: 'fa-brands fa-openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'],
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    icon: 'fa-brands fa-anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModels: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  },
  {
    value: 'ollama',
    label: 'Ollama',
    icon: 'fa-server',
    defaultBaseUrl: 'http://localhost:11434',
    defaultModels: [],
  },
  {
    value: 'groq',
    label: 'Groq',
    icon: 'fa-bolt',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModels: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  },
  {
    value: 'modal',
    label: 'Modal',
    icon: 'fa-cube',
    defaultBaseUrl: 'https://modal.com/v1',
    defaultModels: ['qwen2.5-72b', 'llama-3.1-70b', 'mistral-7b'],
  },
  {
    value: 'openai-compatible',
    label: 'Custom OpenAI-compatible',
    icon: 'fa-plug',
    defaultBaseUrl: '',
    defaultModels: [],
  },
] as const;
