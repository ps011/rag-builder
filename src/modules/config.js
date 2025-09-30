// Configuration module
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/**
 * Updates the vault path in the .env file
 * @param {string} newPath - The new vault path
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function updateVaultPath(newPath) {
  try {
    // Path to the .env file (two directories up from this file)
    const envFilePath = path.join(__dirname, '../../.env');
    
    // Check if .env file exists
    let envContent;
    try {
      envContent = await fs.promises.readFile(envFilePath, 'utf8');
    } catch (error) {
      // If .env doesn't exist, create it with just the vault path
      await fs.promises.writeFile(envFilePath, `OBSIDIAN_VAULT_PATH=${newPath}\n`, 'utf8');
      console.log(`Created new .env file with vault path: ${newPath}`);
      return true;
    }
    
    // If .env exists, update the OBSIDIAN_VAULT_PATH
    if (envContent.includes('OBSIDIAN_VAULT_PATH=')) {
      // Replace the existing path
      const updatedContent = envContent.replace(
        /OBSIDIAN_VAULT_PATH=.*/,
        `OBSIDIAN_VAULT_PATH=${newPath}`
      );
      await fs.promises.writeFile(envFilePath, updatedContent, 'utf8');
    } else {
      // Add the path if it doesn't exist
      await fs.promises.writeFile(envFilePath, envContent + `\nOBSIDIAN_VAULT_PATH=${newPath}\n`, 'utf8');
    }
    
    // Update the environment variable in the current process
    process.env.OBSIDIAN_VAULT_PATH = newPath;
    
    console.log(`Updated vault path to: ${newPath}`);
    return true;
  } catch (error) {
    console.error('Error updating vault path:', error);
    return false;
  }
}
