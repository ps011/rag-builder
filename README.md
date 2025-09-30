# RAG Builder

A Retrieval-Augmented Generation (RAG) system that builds a searchable knowledge base from your Obsidian vault and allows you to query it using natural language. This implementation runs entirely locally using Ollama for the language model and Hugging Face embeddings.

## Overview

This project creates a RAG system that:
1. Loads Markdown documents from your Obsidian vault
2. Splits them into manageable chunks
3. Creates vector embeddings using Hugging Face's local embedding model
4. Stores them in a ChromaDB vector database
5. Provides an interactive CLI to query your knowledge base using Ollama

## Features

- **Document Processing**: Recursively loads all Markdown files from your Obsidian vault
- **Text Chunking**: Intelligently splits documents into overlapping chunks for better retrieval
- **Local Vector Storage**: Uses ChromaDB for persistent vector storage
- **Local Embeddings**: Uses Hugging Face's `all-MiniLM-L6-v2` model for reliable semantic understanding
- **Local LLM**: Uses Ollama for running language models locally (no API keys required)
- **Interactive Querying**: CLI interface to ask questions about your notes
- **Context-Aware Responses**: Generates answers based on retrieved context from your notes
- **Hybrid Search**: Combines semantic similarity and exact keyword matching for better accuracy
- **Enhanced Retrieval**: Improved relevance scoring and filtering for more precise results
- **Debugging Tools**: Built-in tools to analyze search quality and vector store statistics
- **Web Interface**: Modern, responsive web application with beautiful UI
- **REST API**: HTTP endpoints for integration with other applications
- **Force Refresh**: Option to rebuild the vector store with `--refresh` flag

## Prerequisites

- Node.js (v14 or higher)
- Ollama installed and running locally
- ChromaDB server running locally
- Obsidian vault with Markdown files

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rag-builder
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root with your configuration:
```env
OBSIDIAN_VAULT_PATH=/path/to/your/obsidian/vault
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
CHROMA_URL=http://localhost:8000
```

4. Install and start Ollama:
```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the model you want to use (default is llama3)
ollama pull llama3

# Start Ollama server
ollama serve
```

5. Install and start ChromaDB:
```bash
# Install ChromaDB
pip install chromadb

# Start ChromaDB server
chroma run --host localhost --port 8000
```

## Usage

1. Make sure your `.env` file is properly configured with:
   - `OBSIDIAN_VAULT_PATH`: Absolute path to your Obsidian vault directory
   - `OLLAMA_HOST`: Ollama server URL (default: http://localhost:11434)
   - `OLLAMA_MODEL`: Model name to use (default: llama3)
   - `CHROMA_URL`: ChromaDB server URL (default: http://localhost:8000)

2. Ensure Ollama and ChromaDB are running:
```bash
# In separate terminals:
ollama serve
chroma run --host localhost --port 8000
```

3. Run the RAG system:

**CLI Mode:**
```bash
npm start
# or
node src/main.js
```

**Web Interface:**
```bash
npm run web
# or
npm run dev
```

Then open your browser and navigate to `http://localhost:3000`

4. Optional: Force refresh the vector store:
```bash
node src/main.js --refresh
# or
node src/web.js --refresh
```

## Configuration

### Environment Variables

- `OBSIDIAN_VAULT_PATH`: Required. Absolute path to your Obsidian vault directory
- `OLLAMA_HOST`: Optional. Ollama server URL (default: http://localhost:11434)
- `OLLAMA_MODEL`: Optional. Model name to use (default: llama3)
- `CHROMA_URL`: Optional. ChromaDB server URL (default: http://localhost:8000)

### Text Splitting Parameters

The system uses the following optimized parameters for text chunking:
- `chunkSize`: 1000 characters (increased for better context)
- `chunkOverlap`: 200 characters (reduced for less redundancy)
- `separators`: ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""]
- `keepSeparator`: true (preserves separators for better context)

These can be modified in the `index.js` file if needed.

### Retrieval Parameters

- `k`: 5 (number of relevant documents retrieved for each query)
- `relevance_threshold`: 0.3 (minimum relevance score for retrieved documents)
- `hybrid_search`: Combines semantic similarity and keyword matching
- `exact_match_fallback`: Provides keyword-based search for precise queries

## Dependencies

- `@huggingface/transformers`: Hugging Face transformers for local embeddings
- `@langchain/community`: LangChain community integrations including ChromaDB
- `@langchain/core`: Core LangChain functionality
- `@langchain/ollama`: Ollama integration for LangChain
- `@langchain/openai`: OpenAI integration (optional, not used in current implementation)
- `chromadb`: Vector database for storing embeddings
- `dotenv`: Environment variable management

## Project Structure

```
rag-builder/
├── src/
│   ├── main.js                 # CLI entry point
│   ├── web.js                  # Web server entry point
│   ├── README.md              # Modular architecture documentation
│   └── modules/
│       ├── config.js          # Configuration management
│       ├── documentLoader.js   # Document loading and validation
│       ├── vectorStore.js      # Embedding and vector store management
│       ├── search.js          # Search and retrieval logic
│       ├── cli.js             # CLI interface and user interaction
│       └── webServer.js       # Web server and API endpoints
├── public/
│   ├── index.html             # Web interface HTML
│   ├── styles.css            # Modern CSS styling
│   └── script.js             # Frontend JavaScript
├── package.json               # Project dependencies and scripts
├── README.md                  # This file
├── .env                       # Environment variables (create this)
└── index.js.backup           # Backup of original monolithic file
```

## Modular Architecture

The project has been refactored into a clean, modular architecture for better maintainability and readability:

- **`src/main.js`**: Main entry point that orchestrates all components
- **`src/modules/config.js`**: Configuration management and validation
- **`src/modules/documentLoader.js`**: Document loading and file system operations
- **`src/modules/vectorStore.js`**: Embedding model and vector store management
- **`src/modules/search.js`**: Search and retrieval functionality
- **`src/modules/cli.js`**: Command-line interface and user interaction

Each module has a single responsibility and can be tested independently. See `src/README.md` for detailed module documentation.

## Web Interface

The RAG Builder now includes a modern, responsive web interface that provides the same functionality as the CLI but with a much better user experience.

### Features

- **Modern UI**: Clean, responsive design with dark/light mode support
- **Real-time Search**: Instant query processing with loading indicators
- **Source Attribution**: See which documents contributed to each answer
- **Debug Tools**: Built-in debugging panel for system analysis
- **Search Suggestions**: Quick-start suggestions for common queries
- **Vector Store Refresh**: Rebuild knowledge base directly from the web interface
- **Progress Tracking**: Visual progress indicators for long-running operations
- **Mobile Friendly**: Responsive design that works on all devices

### Web Interface Usage

1. **Start the web server**:
   ```bash
   npm run web
   ```

2. **Open your browser** and navigate to `http://localhost:3000`

3. **Initialize the system** by clicking the initialization button (first time only)

4. **Ask questions** using the search interface

5. **Refresh knowledge base** by clicking the "Refresh" button in the header (when you add new documents)

6. **Use debug tools** by clicking the debug panel at the bottom right

### API Endpoints

The web interface also exposes REST API endpoints for integration:

- `GET /api/health` - Health check
- `POST /api/init` - Initialize RAG system
- `POST /api/query` - Process a query
- `POST /api/refresh` - Refresh/rebuild vector store
- `GET /api/debug/stats` - Get system statistics
- `POST /api/debug/search` - Test search functionality

## How It Works

1. **Document Loading**: Recursively scans your Obsidian vault for `.md` files
2. **Text Processing**: Splits documents into overlapping chunks using LangChain's RecursiveCharacterTextSplitter
3. **Embedding Creation**: Generates vector embeddings using Hugging Face's `all-MiniLM-L6-v2` model locally
4. **Vector Storage**: Stores embeddings in ChromaDB with persistent storage
5. **Query Processing**: 
   - Takes your natural language question
   - Retrieves the most relevant document chunks using similarity search
   - Uses Ollama (with your chosen model) to generate a contextual answer
6. **Interactive Interface**: Provides a CLI for continuous querying with special commands:
   - `exit`: Quit the application
   - `test`: View sample documents from the vector store
   - `debug`: Access debugging tools for analyzing search quality

## Troubleshooting

### Common Issues

1. **"OBSIDIAN_VAULT_PATH is not set"**: Make sure your `.env` file contains the correct path to your Obsidian vault
2. **"Could not connect to Ollama"**: Ensure Ollama is installed and running (`ollama serve`)
3. **"The model 'llama3' is not available"**: Run `ollama pull llama3` to download the model
4. **"No Markdown files found"**: Verify that your Obsidian vault path is correct and contains `.md` files
5. **ChromaDB connection errors**: Ensure ChromaDB server is running (`chroma run --host localhost --port 8000`)
6. **Embedding model download issues**: The first run downloads the Hugging Face model - ensure you have internet connectivity

### Debugging Tools

The system includes built-in debugging tools to help analyze search quality and troubleshoot issues:

1. **Access Debug Mode**: Type `debug` in the main interface
2. **Available Commands**:
   - `debug stats`: Show vector store statistics (total documents, unique files, average chunk length)
   - `debug search <query>`: Test search with detailed results showing scores and relevance
   - `debug chunks`: Display sample chunks to verify text splitting quality
   - `back`: Return to normal mode

These tools help identify issues with:
- Document indexing quality
- Search relevance scoring
- Text chunking effectiveness
- Vector store content

### Performance Tips

- For large vaults, consider adjusting chunk size and overlap parameters
- The first run will take longer as it downloads the embedding model and processes all documents
- Subsequent runs will be faster as ChromaDB persists the vector store
- Use `--refresh` flag to rebuild the vector store if you've added new documents
- Ollama models require sufficient RAM - consider using smaller models for lower-resource systems

## Improving Answer Accuracy

The RAG system includes several advanced features to maximize answer accuracy:

### Advanced Search Features

1. **Query Expansion**: Automatically expands queries with synonyms and related terms
2. **Multi-Query Search**: Searches multiple query variations to find more relevant documents
3. **Result Reranking**: Reranks results based on multiple factors including:
   - Exact phrase matches
   - Title/filename relevance
   - Word frequency
   - Document recency

### Directory-Aware Context

To further improve accuracy, the system now includes the directory structure of your notes in the metadata. Folder names are used as additional context during search and reranking, giving more weight to documents where keywords match the folder names. This helps the model better understand the topic of your notes.

### Configuration Options

You can fine-tune accuracy by setting these environment variables in your `.env` file:

```env
# Search parameters
SEARCH_RESULTS_COUNT=8          # Number of documents to retrieve (default: 8)
RELEVANCE_THRESHOLD=0.25        # Minimum relevance score (default: 0.25)
ENABLE_QUERY_EXPANSION=true     # Enable query expansion (default: true)
ENABLE_RERANKING=true           # Enable result reranking (default: true)

# Chunking parameters
CHUNK_SIZE=1200                 # Chunk size in characters (default: 1200)
CHUNK_OVERLAP=300               # Chunk overlap in characters (default: 300)
```

### Tips for Better Results

1. **Use Specific Queries**: Be specific in your questions rather than vague
2. **Include Context**: Mention relevant context in your questions
3. **Use Keywords**: Include important keywords from your notes
4. **Ask Follow-up Questions**: Break complex questions into smaller parts
5. **Check Sources**: Review the source documents to understand the context better

### Example Queries

**Good (Specific):**
- "What did I learn about machine learning in my September notes?"
- "What are the main points from my meeting with John about the project?"

**Less Effective (Vague):**
- "Tell me about my notes"
- "What did I write about?"

## License

ISC

## Contributing

Feel free to submit issues and enhancement requests!
