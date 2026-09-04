/**
 * Model Configuration Service
 * 
 * Manages AI provider detection, key validation, and model selection.
 * Follows the bionic project pattern: define main provider, override reasoning models.
 * 
 * Environment variables:
 *   CHAT_PROVIDER        — openai (default), openrouter, groq, xai, mistral, ollama
 *   CHAT_MODEL           — override model for the active provider
 *   OPENAI_API_KEY       — OpenAI key (also used for embeddings)
 *   OPENAI_MODEL         — override OpenAI model (default: gpt-4o-mini)
 *   OPENROUTER_API_KEY   — OpenRouter key (free tier available)
 *   OPENROUTER_MODEL     — override OpenRouter model
 *   GROQ_API_KEY         — Groq key (fast inference)
 *   GROQ_MODEL           — override Groq model
 *   XAI_API_KEY          — xAI Grok key
 *   XAI_MODEL            — override xAI model
 *   OLLAMA_BASE_URL      — Ollama endpoint (default: http://localhost:11434/v1)
 *   OLLAMA_MODEL         — Ollama model name (default: llama3.2)
 *   MISTRAL_API_KEY      — Mistral key
 *   MISTRAL_MODEL        — override Mistral model
 */

const path = require('path');

// Load .env from project root (silently ignore if missing)
try { require('dotenv').config({ path: path.join(__dirname, '../../.env') }); } catch (_) { /* no .env */ }

/**
 * Provider definitions: name, env key, default model, base URL
 */
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    keyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o-mini',
    baseUrl: null, // uses default OpenAI endpoint
    icon: '🟢',
    description: 'GPT models — reliable, good at explanations',
  },
  openrouter: {
    name: 'OpenRouter',
    keyEnv: 'OPENROUTER_API_KEY',
    modelEnv: 'OPENROUTER_MODEL',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    baseUrl: 'https://openrouter.ai/api/v1',
    icon: '🔀',
    description: 'Multi-provider gateway — free tier available',
  },
  groq: {
    name: 'Groq',
    keyEnv: 'GROQ_API_KEY',
    modelEnv: 'GROQ_MODEL',
    defaultModel: 'llama-3.1-8b-instruct',
    baseUrl: 'https://api.groq.com/openai/v1',
    icon: '⚡',
    description: 'Ultra-fast inference — cheapest cloud option',
  },
  xai: {
    name: 'xAI (Grok)',
    keyEnv: 'XAI_API_KEY',
    modelEnv: 'XAI_MODEL',
    defaultModel: 'grok-3-mini',
    baseUrl: 'https://api.x.ai/v1',
    icon: '🤖',
    description: 'Grok models by xAI',
  },
  mistral: {
    name: 'Mistral',
    keyEnv: 'MISTRAL_API_KEY',
    modelEnv: 'MISTRAL_MODEL',
    defaultModel: 'mistral-small-latest',
    baseUrl: 'https://api.mistral.ai/v1',
    icon: '🌊',
    description: 'Mistral models — strong multilingual, efficient',
  },
  ollama: {
    name: 'Ollama (Local)',
    keyEnv: null, // no key needed
    modelEnv: 'OLLAMA_MODEL',
    defaultModel: 'llama3.2',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    icon: '🏠',
    description: 'Local models — free, private, offline',
  },
};

/**
 * Cache for validation results (avoid hammering APIs on every request)
 * Structure: { provider: { status, model, error, validatedAt, nextRetryAt } }
 */
const validationCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_BACKOFF_MS = 60 * 1000; // 1 minute before retry after rate limit

/**
 * Get the configured (or default) model for a provider
 */
function getModelForProvider(providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) return null;

  // Check for explicit model override via env
  if (provider.modelEnv && process.env[provider.modelEnv]) {
    return process.env[provider.modelEnv];
  }
  // Check for global CHAT_MODEL override
  if (process.env.CHAT_MODEL) {
    return process.env.CHAT_MODEL;
  }
  return provider.defaultModel;
}

/**
 * Check if a provider's API key is defined
 */
function isKeyDefined(providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) return false;
  if (!provider.keyEnv) return true; // Ollama doesn't need a key
  return !!(process.env[provider.keyEnv] && process.env[provider.keyEnv].trim() !== '');
}

/**
 * Get the active provider (from env or first available)
 */
function getActiveProvider() {
  const configured = process.env.CHAT_PROVIDER;
  if (configured && PROVIDERS[configured] && isKeyDefined(configured)) {
    return configured;
  }
  // Fall back to first available provider with a key
  for (const name of Object.keys(PROVIDERS)) {
    if (isKeyDefined(name)) return name;
  }
  // Fall back to Ollama (no key needed) or openai as default
  return PROVIDERS.ollama ? 'ollama' : 'openai';
}

/**
 * Validate a provider's API key by making a lightweight request.
 * Returns: { status: 'available' | 'rate_limited' | 'error' | 'missing', model, error? }
 */
async function validateProvider(providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    return { status: 'error', model: null, error: 'Unknown provider' };
  }

  // Check cache
  const cached = validationCache.get(providerName);
  if (cached) {
    // If still valid, return cached
    if (Date.now() < cached.validatedAt + CACHE_TTL_MS) {
      return cached;
    }
    // If rate limited, wait for backoff
    if (cached.status === 'rate_limited' && Date.now() < cached.nextRetryAt) {
      return cached;
    }
  }

  // Check if key is defined
  if (!isKeyDefined(providerName)) {
    const result = { status: 'missing', model: getModelForProvider(providerName), error: null, validatedAt: Date.now() };
    validationCache.set(providerName, result);
    return result;
  }

  // Validate by listing models (lightweight call)
  try {
    // Ollama uses a different endpoint — check with /api/tags
    if (providerName === 'ollama') {
      const baseUrl = provider.baseUrl || 'http://localhost:11434/v1';
      const tagsUrl = baseUrl.replace('/v1', '/api/tags');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const resp = await fetch(tagsUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok) throw new Error(`Ollama returned ${resp.status}`);
        const data = await resp.json();
        const models = (data.models || []).map(m => m.name);
        const model = getModelForProvider(providerName);
        const modelAvailable = models.some(name => name.includes(model));
        const result = {
          status: 'available',
          model: modelAvailable ? model : models[0] || model,
          modelAvailable,
          error: null,
          validatedAt: Date.now(),
          availableModels: models.slice(0, 10),
        };
        validationCache.set(providerName, result);
        return result;
      } catch (e) {
        clearTimeout(timeout);
        throw e;
      }
    }

    const OpenAI = require('openai');
    const model = getModelForProvider(providerName);
    
    const client = new OpenAI({
      apiKey: process.env[provider.keyEnv],
      baseURL: provider.baseUrl || undefined,
    });

    // Use models.list() — cheapest possible API call
    const response = await client.models.list();
    
    // Check if our model is in the available list
    const modelIds = response.data.map(m => m.id);
    const modelAvailable = modelIds.some(id => 
      id === model || id.includes(model.split('/').pop())
    );

    const result = {
      status: 'available',
      model: modelAvailable ? model : modelIds[0] || model,
      modelAvailable,
      error: null,
      validatedAt: Date.now(),
      availableModels: modelIds.slice(0, 10), // first 10 for UI display
    };
    validationCache.set(providerName, result);
    return result;

  } catch (error) {
    const status = classifyError(error);
    const result = {
      status,
      model: getModelForProvider(providerName),
      error: error.message || String(error),
      validatedAt: Date.now(),
      nextRetryAt: status === 'rate_limited' ? Date.now() + RATE_LIMIT_BACKOFF_MS : null,
    };
    validationCache.set(providerName, result);
    return result;
  }
}

/**
 * Classify an API error into status categories
 */
function classifyError(error) {
  const msg = (error.message || '').toLowerCase();
  const status = error.status || error.statusCode || 0;

  // Rate limiting
  if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('quota')) {
    return 'rate_limited';
  }

  // Authentication
  if (status === 401 || msg.includes('invalid') && msg.includes('key') || msg.includes('unauthorized')) {
    return 'error';
  }

  // Other errors
  return 'error';
}

/**
 * Get status of all providers (for UI model selector)
 */
async function getAllProviderStatuses() {
  const activeProvider = getActiveProvider();
  
  const statuses = {};
  for (const [name, provider] of Object.entries(PROVIDERS)) {
    const validation = await validateProvider(name);
    statuses[name] = {
      name: provider.name,
      icon: provider.icon,
      description: provider.description,
      model: getModelForProvider(name),
      isActive: name === activeProvider,
      keyDefined: isKeyDefined(name),
      ...validation,
    };
  }
  return statuses;
}

/**
 * Create an OpenAI-compatible client for the active provider
 * Returns { client, model, provider } or null if nothing available
 */
function createClient() {
  const OpenAI = require('openai');
  const providerName = getActiveProvider();
  const provider = PROVIDERS[providerName];
  if (!provider) return null;

  const model = getModelForProvider(providerName);
  // Ollama doesn't need a real key — use a dummy value
  const apiKey = provider.keyEnv ? process.env[provider.keyEnv] : 'ollama-local';

  const client = new OpenAI({
    apiKey,
    baseURL: provider.baseUrl || undefined,
  });

  return { client, model, provider: providerName, providerName: provider.name };
}

/**
 * Clear validation cache (for testing or forced refresh)
 */
function clearCache(providerName) {
  if (providerName) {
    validationCache.delete(providerName);
  } else {
    validationCache.clear();
  }
}

/**
 * Get a summary of current configuration (for logging / diagnostics)
 */
function getConfigSummary() {
  const active = getActiveProvider();
  return {
    activeProvider: active,
    activeModel: getModelForProvider(active),
    providers: Object.keys(PROVIDERS).map(name => ({
      name,
      keyDefined: isKeyDefined(name),
      model: getModelForProvider(name),
    })),
  };
}

module.exports = {
  PROVIDERS,
  getActiveProvider,
  getModelForProvider,
  isKeyDefined,
  validateProvider,
  getAllProviderStatuses,
  createClient,
  clearCache,
  getConfigSummary,
};
