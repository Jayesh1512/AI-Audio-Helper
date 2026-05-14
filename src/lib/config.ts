export const config = {
  // Speech-to-text provider
  speechProvider: (import.meta.env.VITE_SPEECH_PROVIDER as 'web' | 'deepgram') || 'web',
  deepgramApiKey: import.meta.env.VITE_DEEPGRAM_API_KEY,

  // LLM provider
  llmProvider: (import.meta.env.VITE_LLM_PROVIDER as 'ollama' | 'gemini') || 'ollama',
  geminiApiKeys: (import.meta.env.VITE_GEMINI_API_KEYS || '').split(',').filter(Boolean),
  ollamaBaseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',

  // Other configs
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
}

export function getGeminiApiKey(): string | null {
  if (config.geminiApiKeys.length === 0) return null
  // Random selection for load balancing
  const index = Math.floor(Math.random() * config.geminiApiKeys.length)
  return config.geminiApiKeys[index]
}