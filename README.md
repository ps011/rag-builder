# RAG Builder

A Retrieval-Augmented Generation (RAG) system that builds a searchable knowledge base from your Obsidian vault and allows you to query it using natural language.

## Overview

This project creates a RAG system that:
1. Loads Markdown documents from your Obsidian vault
2. Splits them into manageable chunks
3. Creates vector embeddings using OpenAI's embedding model
4. Stores them in a ChromaDB vector database
5. Provides an interactive CLI to query your knowledge base

## Features

- **Document Processing**: Recursively loads all Markdown files from your Obsidian vault
- **Text Chunking**: Intelligently splits documents into overlapping chunks for better retrieval
- **Vector Storage**: Uses ChromaDB for persistent vector storage
- **Interactive Querying**: CLI interface to ask questions about your notes
- **Context-Aware Responses**: Uses GPT-3.5-turbo to generate answers based on retrieved context

## Prerequisites

- Node.js (v14 or higher)
- OpenAI API key
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
OPENAI_API_KEY=your_openai_api_key_here
OBSIDIAN_VAULT_PATH=/path/to/your/obsidian/vault
```

## Usage

1. Make sure your `.env` file is properly configured with:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `OBSIDIAN_VAULT_PATH`: Absolute path to your Obsidian vault directory

2. Run the RAG system:
```bash
node index.js
```

3. The system will:
   - Load and process your Markdown documents
   - Create embeddings and store them in ChromaDB
   - Start an interactive query interface

4. Ask questions about your notes! Type `exit` to quit.

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Required. Your OpenAI API key for embeddings and chat completion
- `OBSIDIAN_VAULT_PATH`: Required. Absolute path to your Obsidian vault directory

### Text Splitting Parameters

The system uses the following default parameters for text chunking:
- `chunkSize`: 500 characters
- `chunkOverlap`: 50 characters

These can be modified in the `index.js` file if needed.

### Retrieval Parameters

- `k`: 3 (number of relevant documents retrieved for each query)

## Dependencies

- `@langchain/community`: LangChain community integrations
- `@langchain/core`: Core LangChain functionality
- `@langchain/openai`: OpenAI integration for LangChain
- `chromadb`: Vector database for storing embeddings
- `dotenv`: Environment variable management

## Project Structure

```
rag-builder/
├── index.js              # Main application file
├── package.json          # Project dependencies and scripts
├── README.md            # This file
├── .env                 # Environment variables (create this)
```

## How It Works

1. **Document Loading**: Recursively scans your Obsidian vault for `.md` files
2. **Text Processing**: Splits documents into overlapping chunks using LangChain's RecursiveCharacterTextSplitter
3. **Embedding Creation**: Generates vector embeddings using OpenAI's `text-embedding-ada-002` model
4. **Vector Storage**: Stores embeddings in ChromaDB with persistent storage
5. **Query Processing**: 
   - Takes your natural language question
   - Retrieves the most relevant document chunks
   - Uses GPT-3.5-turbo to generate a contextual answer

## Troubleshooting

### Common Issues

1. **"OPENAI_API_KEY is not set"**: Make sure your `.env` file contains a valid OpenAI API key
2. **"OBSIDIAN_VAULT_PATH is not set"**: Ensure the path to your Obsidian vault is correctly set in the `.env` file
3. **"No Markdown files found"**: Verify that your Obsidian vault path is correct and contains `.md` files
4. **ChromaDB errors**: Delete the `chroma_db` directory and restart the application to rebuild the vector store

### Performance Tips

- For large vaults, consider increasing chunk size to reduce the number of chunks
- The first run will take longer as it processes all documents
- Subsequent runs will be faster as ChromaDB persists the vector store

## License

ISC

## Contributing

Feel free to submit issues and enhancement requests!
