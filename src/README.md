# RAG Builder - Modular Architecture

This document describes the modular architecture of the RAG Builder system.

## Project Structure

```
rag-builder/
├── src/
│   ├── main.js                 # Main entry point
│   └── modules/
│       ├── config.js          # Configuration management
│       ├── documentLoader.js   # Document loading and validation
│       ├── vectorStore.js      # Embedding and vector store management
│       ├── search.js          # Search and retrieval logic
│       └── cli.js             # CLI interface and user interaction
├── package.json               # Project configuration
├── README.md                  # Main documentation
└── .env                       # Environment variables
```

## Module Descriptions

### `src/main.js`
- **Purpose**: Main entry point that orchestrates all components
- **Responsibilities**: 
  - Loads configuration
  - Validates external dependencies (Ollama)
  - Coordinates document processing and vector store creation
  - Starts the CLI interface

### `src/modules/config.js`
- **Purpose**: Configuration management and validation
- **Exports**:
  - `loadConfig()`: Loads and validates environment variables
  - `validateOllama()`: Checks Ollama connection and model availability

### `src/modules/documentLoader.js`
- **Purpose**: Document loading and file system operations
- **Exports**:
  - `loadMarkdownDocuments()`: Recursively loads markdown files
  - `validateDocumentsPath()`: Validates document directory and files

### `src/modules/vectorStore.js`
- **Purpose**: Embedding model and vector store management
- **Exports**:
  - `createEmbeddings()`: Creates and configures embedding model
  - `createVectorStore()`: Creates ChromaDB vector store
  - `checkCollectionExists()`: Checks if vector store exists
  - `splitDocumentsIntoChunks()`: Splits documents into chunks
  - `addChunksToVectorStore()`: Adds chunks to vector store

### `src/modules/search.js`
- **Purpose**: Search and retrieval functionality
- **Exports**:
  - `performHybridSearch()`: Combines semantic and keyword search
  - `filterResultsByRelevance()`: Filters results by relevance score
  - `buildContextFromResults()`: Builds context string from results
  - `getVectorStoreStats()`: Gets vector store statistics for debugging

### `src/modules/cli.js`
- **Purpose**: Command-line interface and user interaction
- **Exports**:
  - `startCLI()`: Creates and starts the interactive CLI
- **Features**:
  - Query processing
  - Debug commands
  - Test commands
  - Enhanced prompting

## Benefits of Modular Architecture

1. **Maintainability**: Each module has a single responsibility
2. **Testability**: Modules can be tested independently
3. **Reusability**: Modules can be reused in other projects
4. **Readability**: Code is organized logically and easy to navigate
5. **Scalability**: Easy to add new features or modify existing ones
6. **Debugging**: Issues can be isolated to specific modules

## Usage

The modular system maintains the same interface as before:

```bash
# Start the system
npm start

# Force refresh the vector store
npm start -- --refresh
```

All functionality remains the same, but the code is now much more organized and maintainable.
