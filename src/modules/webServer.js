// Web server module for RAG system
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, validateOllama, updateVaultPath } from './config.js';
import { loadMarkdownDocuments, validateDocumentsPath } from './documentLoader.js';
import { 
  createEmbeddings, 
  createVectorStore, 
  checkCollectionExists, 
  splitDocumentsIntoChunks, 
  addChunksToVectorStore 
} from './vectorStore.js';
import { performHybridSearch, getVectorStoreStats } from './search.js';
import { performAdvancedSearch, rerankResults, buildEnhancedContext, createEnhancedPrompt } from './advancedSearch.js';
import { Ollama } from "@langchain/ollama";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RAGWebServer {
  constructor() {
    this.app = express();
    this.vectorStore = null;
    this.config = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../../public')));
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Initialize RAG system
    this.app.post('/api/init', async (req, res) => {
      try {
        if (this.vectorStore) {
          return res.json({ 
            success: true, 
            message: 'RAG system already initialized',
            stats: await this.getSystemStats()
          });
        }

        console.log('Initializing RAG system...');
        
        // Load configuration
        this.config = loadConfig();
        
        // Validate Ollama
        await validateOllama(this.config.ollamaHost, this.config.ollamaModel);
        
        // Create embeddings and vector store
        const embeddings = await createEmbeddings();
        this.vectorStore = createVectorStore(embeddings, this.config.chromaUrl);
        
        // Check if collection exists
        const collectionExists = await checkCollectionExists(this.vectorStore);
        
        if (!collectionExists) {
          // Validate documents path
          const isValidPath = await validateDocumentsPath(this.config.docsPath);
          if (!isValidPath) {
            return res.status(400).json({ 
              success: false, 
              error: 'Invalid documents path' 
            });
          }
          
          // Load and process documents
          const docs = await loadMarkdownDocuments(this.config.docsPath, this.config.docsPath);
          const chunks = await splitDocumentsIntoChunks(docs);
          await addChunksToVectorStore(this.vectorStore, chunks);
        }

        const stats = await this.getSystemStats();
        res.json({ 
          success: true, 
          message: 'RAG system initialized successfully',
          stats 
        });
      } catch (error) {
        console.error('Error initializing RAG system:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Query endpoint
    this.app.post('/api/query', async (req, res) => {
      try {
        if (!this.vectorStore) {
          return res.status(400).json({ 
            success: false, 
            error: 'RAG system not initialized. Please initialize first.' 
          });
        }

        const { query } = req.body;
        if (!query || query.trim().length === 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'Query is required' 
          });
        }

        console.log(`Processing query: ${query}`);
        
        // Perform advanced search with query expansion and reranking
        const searchResults = await performAdvancedSearch(this.vectorStore, query, 8);
        
        // Rerank results for better accuracy
        const rerankedResults = rerankResults(searchResults, query);
        
        if (!rerankedResults || rerankedResults.length === 0) {
          return res.json({
            success: true,
            answer: "No relevant information found in your notes. Try using different keywords or phrases.",
            sources: [],
            searchTypes: []
          });
        }

        // Filter results by relevance (using reranked scores)
        const relevantResults = rerankedResults.filter(result => 
          (result.rerankScore || result.score) > 0.25
        );
        
        if (relevantResults.length === 0) {
          return res.json({
            success: true,
            answer: "Found some matches but they have low relevance scores. Try rephrasing your question or using more specific terms from your notes.",
            sources: [],
            searchTypes: []
          });
        }

        // Build enhanced context with reranked results
        const context = buildEnhancedContext(relevantResults);
        
        // Generate answer with LLM using enhanced prompt
        const llm = new Ollama({ 
          model: this.config.ollamaModel, 
          baseUrl: this.config.ollamaHost 
        });
        
        const prompt = createEnhancedPrompt(context, query);

        const response = await llm.invoke(prompt);
        const answer = response.content || response.text || response;

        // Prepare sources for display with enhanced information
        const sources = relevantResults.map((result, index) => ({
          id: index + 1,
          fileName: result.document.metadata?.fileName || 'Unknown',
          directory: result.document.metadata?.directory || null,
          source: result.document.metadata?.source || 'Unknown',
          relevance: result.relevance,
          score: (result.rerankScore || result.score).toFixed(3),
          originalScore: result.originalScore ? result.originalScore.toFixed(3) : null,
          type: result.type,
          expandedQuery: result.expandedQuery || null,
          preview: result.document.pageContent.substring(0, 200) + '...'
        }));

        const searchTypes = [...new Set(relevantResults.map(r => r.type))];

        res.json({
          success: true,
          answer,
          sources,
          searchTypes,
          query,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Refresh vector store endpoint
    this.app.post('/api/refresh', async (req, res) => {
      try {
        console.log('Refreshing vector store...');
        
        // Load configuration
        this.config = loadConfig();
        
        // Validate documents path
        const isValidPath = await validateDocumentsPath(this.config.docsPath);
        if (!isValidPath) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid documents path' 
          });
        }
        
        // Load and process documents
        const docs = await loadMarkdownDocuments(this.config.docsPath, this.config.docsPath);
        const chunks = await splitDocumentsIntoChunks(docs);
        
        // Clear existing collection and recreate
        if (this.vectorStore) {
          try {
            // Try to delete the existing collection
            await this.vectorStore.deleteCollection();
          } catch (error) {
            console.log('Collection deletion failed (may not exist):', error.message);
          }
        }
        
        // Create new embeddings and vector store
        const embeddings = await createEmbeddings();
        this.vectorStore = createVectorStore(embeddings, this.config.chromaUrl);
        
        // Add chunks to vector store
        await addChunksToVectorStore(this.vectorStore, chunks);
        
        const stats = await this.getSystemStats();
        
        res.json({ 
          success: true, 
          message: 'Vector store refreshed successfully',
          stats,
          documentsProcessed: docs.length,
          chunksCreated: chunks.length
        });
      } catch (error) {
        console.error('Error refreshing vector store:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Settings endpoints
    this.app.get('/api/settings/vault-path', (req, res) => {
      try {
        // Load the current config to get the latest vault path
        const config = loadConfig();
        res.json({ 
          success: true, 
          vaultPath: config.docsPath 
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
    
    this.app.post('/api/settings/vault-path', async (req, res) => {
      try {
        const { vaultPath } = req.body;
        
        if (!vaultPath) {
          return res.status(400).json({
            success: false,
            error: 'Vault path is required'
          });
        }
        
        // Validate that the path exists
        const isValidPath = await validateDocumentsPath(vaultPath);
        if (!isValidPath) {
          return res.status(400).json({
            success: false,
            error: 'Invalid vault path. Path must exist and contain markdown files.'
          });
        }
        
        // Update the vault path
        const updated = await updateVaultPath(vaultPath);
        
        if (!updated) {
          throw new Error('Failed to update vault path');
        }
        
        res.json({
          success: true,
          message: 'Vault path updated successfully',
          vaultPath
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Debug endpoint
    this.app.get('/api/debug/stats', async (req, res) => {
      try {
        if (!this.vectorStore) {
          return res.status(400).json({ 
            success: false, 
            error: 'RAG system not initialized' 
          });
        }

        const stats = await getVectorStoreStats(this.vectorStore);
        res.json({ success: true, stats });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Test search endpoint
    this.app.post('/api/debug/search', async (req, res) => {
      try {
        if (!this.vectorStore) {
          return res.status(400).json({ 
            success: false, 
            error: 'RAG system not initialized' 
          });
        }

        const { query } = req.body;
        if (!query) {
          return res.status(400).json({ 
            success: false, 
            error: 'Query is required' 
          });
        }

        const results = await performHybridSearch(this.vectorStore, query, 3);
        const formattedResults = results.map((result, index) => ({
          id: index + 1,
          type: result.type,
          score: result.score.toFixed(3),
          relevance: result.relevance,
          fileName: result.document.metadata?.fileName || 'Unknown',
          content: result.document.pageContent.substring(0, 300) + '...'
        }));

        res.json({ success: true, results: formattedResults });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Serve the main HTML page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  async getSystemStats() {
    if (!this.vectorStore) return null;
    return await getVectorStoreStats(this.vectorStore);
  }

  start(port = 3000) {
    this.app.listen(port, () => {
      console.log(`\n🌐 RAG Web Interface running at http://localhost:${port}`);
      console.log(`📚 Open your browser and navigate to the URL above`);
      console.log(`⚡ Make sure Ollama and ChromaDB are running`);
      console.log(`\nPress Ctrl+C to stop the server\n`);
    });
  }
}

export { RAGWebServer };
