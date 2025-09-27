// Main RAG application entry point
import { loadConfig, validateOllama } from './modules/config.js';
import { loadMarkdownDocuments, validateDocumentsPath } from './modules/documentLoader.js';
import { 
  createEmbeddings, 
  createVectorStore, 
  checkCollectionExists, 
  splitDocumentsIntoChunks, 
  addChunksToVectorStore 
} from './modules/vectorStore.js';
import { startCLI } from './modules/cli.js';

/**
 * Main RAG process that orchestrates all components
 */
async function runRAG() {
  try {
    // Load and validate configuration
    const config = loadConfig();
    
    // Validate Ollama connection
    await validateOllama(config.ollamaHost, config.ollamaModel);
    
    console.log("\nStep 1: Initializing embeddings and vector store...");
    console.log("Downloading the embedding model from Hugging Face for local use. This may take a moment on the first run.");
    
    // Create embeddings and vector store
    const embeddings = await createEmbeddings();
    const vectorStore = createVectorStore(embeddings, config.chromaUrl);
    
    // Check if collection exists
    const collectionExists = await checkCollectionExists(vectorStore);
    
    if (collectionExists && !config.forceRefresh) {
      console.log("Vector store already exists and contains documents. Skipping document processing.");
      console.log("Tip: Use '--refresh' or '-r' flag to force refresh the vector store.");
    } else {
      if (config.forceRefresh && collectionExists) {
        console.log("Force refresh requested. Rebuilding vector store...");
      }
      
      // Validate documents path
      const isValidPath = await validateDocumentsPath(config.docsPath);
      if (!isValidPath) {
        return;
      }
      
      console.log("\nStep 2: Loading Markdown documents...");
      let docs;
      try {
        docs = await loadMarkdownDocuments(config.docsPath, config.docsPath);
        console.log(`Loaded ${docs.length} documents.`);
      } catch (e) {
        console.error(`Error loading documents from ${config.docsPath}: ${e.message}`);
        return;
      }
      
      // Split documents into chunks
      const chunks = await splitDocumentsIntoChunks(docs);
      
      // Add chunks to vector store
      await addChunksToVectorStore(vectorStore, chunks);
    }
    
    console.log("\n--- RAG System Ready ---");
    
    // Start the CLI interface
    await startCLI(vectorStore, config.ollamaModel, config.ollamaHost);
    
  } catch (error) {
    console.error("Error in RAG system:", error.message);
    process.exit(1);
  }
}

// Run the main function
runRAG().catch(console.error);
