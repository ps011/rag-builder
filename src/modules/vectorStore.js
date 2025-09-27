// Vector store and embedding management module
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

/**
 * Creates and configures the embedding model
 * @returns {Promise<HuggingFaceTransformersEmbeddings>} Configured embedding model
 */
export async function createEmbeddings() {
  console.log("Initializing embedding model...");
  
  // Temporarily suppress console warnings during initialization
  const originalWarn = console.warn;
  console.warn = () => {};
  
  let embeddings;
  try {
    embeddings = new HuggingFaceTransformersEmbeddings({ 
      model: "Xenova/all-MiniLM-L6-v2" // Most reliable and stable model
    });
    console.log("Embedding model loaded successfully.");
  } catch (error) {
    console.error("Failed to load embedding model:", error.message);
    console.log("Trying alternative approach...");
    
    // Try with different configuration
    try {
      embeddings = new HuggingFaceTransformersEmbeddings({ 
        model: "Xenova/all-MiniLM-L6-v2",
        maxRetries: 3,
        retryDelay: 1000
      });
      console.log("Embedding model loaded with retry configuration.");
    } catch (retryError) {
      console.error("Failed to load embedding model after retries:", retryError.message);
      console.log("Please try:");
      console.log("1. Clear all caches: rm -rf node_modules/@huggingface/transformers/.cache ~/.cache/huggingface");
      console.log("2. Reinstall dependencies: npm install");
      console.log("3. Check your internet connection");
      throw retryError;
    }
  }
  
  // Restore console.warn after embeddings are initialized
  setTimeout(() => {
    console.warn = originalWarn;
  }, 1000);
  
  return embeddings;
}

/**
 * Creates and configures the ChromaDB vector store
 * @param {HuggingFaceTransformersEmbeddings} embeddings - The embedding model
 * @param {string} chromaUrl - ChromaDB server URL
 * @returns {Chroma} Configured vector store
 */
export function createVectorStore(embeddings, chromaUrl) {
  // Parse the URL to extract host and port
  const chromaUrlParsed = new URL(chromaUrl);
  const vectorStore = new Chroma(embeddings, {
    collectionName: "obsidian_notes",
    host: chromaUrlParsed.hostname,
    port: chromaUrlParsed.port || "8000",
    ssl: chromaUrlParsed.protocol === "https:",
    collectionMetadata: {
      "hnsw:space": "cosine"
    }
  });
  
  return vectorStore;
}

/**
 * Checks if the vector store collection exists and has documents
 * @param {Chroma} vectorStore - The vector store instance
 * @returns {Promise<boolean>} True if collection exists and has documents
 */
export async function checkCollectionExists(vectorStore) {
  console.log("Checking if vector store already exists...");
  
  // Temporarily suppress warnings during collection check
  const originalWarn = console.warn;
  console.warn = () => {};
  
  try {
    const existingDocs = await vectorStore.similaritySearch("test", 1);
    return existingDocs.length > 0;
  } catch (error) {
    // Collection doesn't exist yet, which is fine
    console.log("Vector store doesn't exist yet, will create it.");
    return false;
  } finally {
    // Restore console.warn
    console.warn = originalWarn;
  }
}

/**
 * Splits documents into chunks using RecursiveCharacterTextSplitter
 * @param {Array} documents - Array of document objects
 * @returns {Promise<Array>} Array of document chunks
 */
export async function splitDocumentsIntoChunks(documents) {
  console.log("Splitting documents into chunks...");
  
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200, // Slightly larger for better context
    chunkOverlap: 300, // Increased overlap for better continuity
    separators: [
      "\n\n## ", // Markdown headers
      "\n\n# ",  // Markdown headers
      "\n\n",    // Paragraph breaks
      "\n",      // Line breaks
      ". ",      // Sentence endings
      "! ",      // Exclamations
      "? ",      // Questions
      "; ",      // Semicolons
      ", ",      // Commas
      " ",       // Spaces
      ""         // Character level
    ],
    keepSeparator: true, // Keep separators for better context
  });
  
  // Create chunks while preserving metadata
  const chunks = [];
  for (const doc of documents) {
    const docChunks = await textSplitter.createDocuments([doc.pageContent], [doc.metadata]);
    chunks.push(...docChunks);
  }
  
  console.log(`Created ${chunks.length} chunks.`);
  return chunks;
}

/**
 * Adds document chunks to the vector store in batches
 * @param {Chroma} vectorStore - The vector store instance
 * @param {Array} chunks - Array of document chunks
 */
export async function addChunksToVectorStore(vectorStore, chunks) {
  console.log("Creating embeddings and indexing documents...");
  
  // Define a batch size, slightly less than ChromaDB's limit
  const batchSize = 5000;
  
  // Loop through chunks and add them in batches
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    console.log(`Adding batch ${i / batchSize + 1} of ${Math.ceil(chunks.length / batchSize)}...`);
    await vectorStore.addDocuments(batch);
  }
  
  console.log("Vector store created and documents indexed.");
}
