// Configuration module
import 'dotenv/config';

/**
 * Loads and validates configuration from environment variables
 * @returns {Object} Configuration object
 */
export function loadConfig() {
  const config = {
    docsPath: process.env.OBSIDIAN_VAULT_PATH,
    ollamaHost: process.env.OLLAMA_HOST || "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "llama3",
    chromaUrl: process.env.CHROMA_URL || "http://localhost:8000",
    forceRefresh: process.argv.includes('--refresh') || process.argv.includes('-r'),
    // Accuracy tuning parameters
    searchResultsCount: parseInt(process.env.SEARCH_RESULTS_COUNT) || 8,
    relevanceThreshold: parseFloat(process.env.RELEVANCE_THRESHOLD) || 0.25,
    enableQueryExpansion: process.env.ENABLE_QUERY_EXPANSION !== 'false',
    enableReranking: process.env.ENABLE_RERANKING !== 'false',
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 1200,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 300
  };

  // Validate required configuration
  if (!config.docsPath) {
    throw new Error("OBSIDIAN_VAULT_PATH is not set in your .env file.");
  }

  return config;
}

/**
 * Validates Ollama connection and model availability
 * @param {string} ollamaHost - Ollama host URL
 * @param {string} ollamaModel - Ollama model name
 * @returns {Promise<void>}
 */
export async function validateOllama(ollamaHost, ollamaModel) {
  console.log(`Checking for Ollama model '${ollamaModel}' at ${ollamaHost}...`);
  try {
    const ollamaResponse = await fetch(`${ollamaHost}/api/tags`);
    const ollamaData = await ollamaResponse.json();
    const availableModels = ollamaData.models.map(m => m.name.split(':')[0]);
    if (!availableModels.includes(ollamaModel)) {
        throw new Error(`The model '${ollamaModel}' is not available in your local Ollama instance. Please run 'ollama pull ${ollamaModel}' to download it.`);
    }
    console.log(`Ollama model '${ollamaModel}' found.`);
  } catch (e) {
    throw new Error(`Could not connect to Ollama at ${ollamaHost}. Please ensure Ollama is installed and running. Error: ${e.message}`);
  }
}
