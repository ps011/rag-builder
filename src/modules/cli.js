// CLI interface module
import { Ollama } from "@langchain/ollama";
import { performHybridSearch, filterResultsByRelevance, buildContextFromResults, getVectorStoreStats } from './search.js';

/**
 * Creates the enhanced prompt for the LLM
 * @param {string} context - Context from retrieved documents
 * @param {string} query - User's question
 * @returns {string} Formatted prompt
 */
function createEnhancedPrompt(context, query) {
  return `You are an expert assistant that answers questions based on the user's personal notes and documents. 

CRITICAL INSTRUCTIONS:
- Answer ONLY using the information provided in the context below
- If the context doesn't contain enough information to answer the question completely, say "I don't have enough information in my notes to answer this question completely"
- Be specific, accurate, and direct in your answers
- If you find relevant information, provide it clearly and cite the source
- Don't make assumptions or add information not present in the context
- If multiple sources contain conflicting information, mention this
- Pay attention to the relevance scores and search types - higher scores indicate better matches

CONTEXT FROM USER'S NOTES:
${context}

QUESTION: ${query}

Please provide a comprehensive answer based on the context above. If the information is insufficient, clearly state what's missing.`;
}

/**
 * Handles the test command to show sample documents
 * @param {Chroma} vectorStore - The vector store instance
 * @param {Function} promptUser - Function to continue the CLI loop
 */
async function handleTestCommand(vectorStore, promptUser) {
  console.log("\nTesting vector store - retrieving some sample documents...");
  try {
    const testDocs = await vectorStore.similaritySearch("", 5); // Get 5 random documents
    console.log(`Found ${testDocs.length} documents in vector store:`);
    testDocs.forEach((doc, index) => {
      console.log(`\n--- Document ${index + 1} ---`);
      console.log(`Source: ${doc.metadata?.source || 'Unknown'}`);
      console.log(`Content preview: ${doc.pageContent.substring(0, 150)}...`);
    });
  } catch (error) {
    console.log("Error testing vector store:", error.message);
  }
  promptUser();
}

/**
 * Handles debug commands
 * @param {Chroma} vectorStore - The vector store instance
 * @param {Function} promptUser - Function to continue the CLI loop
 * @param {Object} rl - Readline interface
 */
async function handleDebugCommand(vectorStore, promptUser, rl) {
  console.log("\n=== DEBUG MODE ===");
  console.log("Available debug commands:");
  console.log("- 'debug stats': Show vector store statistics");
  console.log("- 'debug search <query>': Test search with detailed results");
  console.log("- 'debug chunks': Show sample chunks");
  console.log("Enter a debug command or 'back' to return to normal mode:");
  
  rl.question("Debug> ", async (debugCmd) => {
    if (debugCmd.toLowerCase() === 'back') {
      promptUser();
      return;
    }
    
    if (debugCmd.toLowerCase() === 'debug stats') {
      try {
        const stats = await getVectorStoreStats(vectorStore);
        if (stats) {
          console.log(`\nVector Store Statistics:`);
          console.log(`- Total documents: ${stats.totalDocuments}`);
          console.log(`- Unique files: ${stats.uniqueFiles}`);
          console.log(`- Average chunk length: ${stats.averageChunkLength.toFixed(0)} characters`);
          console.log(`- Sample sources:`);
          stats.sampleSources.forEach(source => {
            console.log(`  * ${source}`);
          });
        }
      } catch (error) {
        console.log("Error getting stats:", error.message);
      }
    } else if (debugCmd.toLowerCase().startsWith('debug search ')) {
      const searchQuery = debugCmd.substring(13);
      console.log(`\nTesting search for: "${searchQuery}"`);
      try {
        const results = await performHybridSearch(vectorStore, searchQuery, 3);
        console.log(`Found ${results.length} results:`);
        results.forEach((result, index) => {
          console.log(`\n--- Result ${index + 1} ---`);
          console.log(`Type: ${result.type}`);
          console.log(`Score: ${result.score.toFixed(3)}`);
          console.log(`Relevance: ${result.relevance}`);
          console.log(`Source: ${result.document.metadata?.fileName || 'Unknown'}`);
          console.log(`Content: ${result.document.pageContent.substring(0, 200)}...`);
        });
      } catch (error) {
        console.log("Error in debug search:", error.message);
      }
    } else if (debugCmd.toLowerCase() === 'debug chunks') {
      try {
        const sampleDocs = await vectorStore.similaritySearch("", 3);
        console.log(`\nSample chunks:`);
        sampleDocs.forEach((doc, index) => {
          console.log(`\n--- Chunk ${index + 1} ---`);
          console.log(`Source: ${doc.metadata?.source || 'Unknown'}`);
          console.log(`Length: ${doc.pageContent.length} characters`);
          console.log(`Content: ${doc.pageContent}`);
        });
      } catch (error) {
        console.log("Error getting sample chunks:", error.message);
      }
    } else {
      console.log("Unknown debug command. Available: stats, search <query>, chunks");
    }
    
    // Continue debug mode
    rl.question("Debug> ", arguments.callee);
  });
}

/**
 * Processes a user query and generates a response
 * @param {string} query - User's question
 * @param {Chroma} vectorStore - The vector store instance
 * @param {string} ollamaModel - Ollama model name
 * @param {string} ollamaHost - Ollama host URL
 * @param {Function} promptUser - Function to continue the CLI loop
 */
async function processQuery(query, vectorStore, ollamaModel, ollamaHost, promptUser) {
  console.log("\nRetrieving relevant information...");
  
  // Use enhanced hybrid search
  const searchResults = await performHybridSearch(vectorStore, query, 5);
  
  if (!searchResults || searchResults.length === 0) {
    console.log("No relevant information found in your notes.");
    console.log("This could mean:");
    console.log("1. Your query doesn't match any content in your notes");
    console.log("2. The vector store is empty or not properly indexed");
    console.log("3. Try using different keywords or phrases from your notes");
    promptUser();
    return;
  }
  
  // Filter results by relevance threshold
  const relevantResults = filterResultsByRelevance(searchResults, 0.3);
  
  if (relevantResults.length === 0) {
    console.log("Found some matches but they have low relevance scores.");
    console.log("Try rephrasing your question or using more specific terms from your notes.");
    promptUser();
    return;
  }
  
  // Build context with relevance information
  const context = buildContextFromResults(relevantResults);
  
  console.log(`Found relevant context from your notes (${relevantResults.length} documents).`);
  console.log(`Search types: ${[...new Set(relevantResults.map(r => r.type))].join(', ')}`);
  
  console.log("\nGenerating the final answer with LLM...");
  const llm = new Ollama({ model: ollamaModel, baseUrl: ollamaHost });
  
  // Enhanced prompt with better instructions
  const prompt = createEnhancedPrompt(context, query);
  
  const response = await llm.invoke(prompt);
  
  console.log("\n--- Final Answer ---");
  // Handle different response structures from Ollama
  const answer = response.content || response.text || response;
  console.log(answer);
  console.log("--------------------");
  
  promptUser();
}

/**
 * Creates and starts the CLI interface
 * @param {Chroma} vectorStore - The vector store instance
 * @param {string} ollamaModel - Ollama model name
 * @param {string} ollamaHost - Ollama host URL
 */
export async function startCLI(vectorStore, ollamaModel, ollamaHost) {
  const readline = await import('node:readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function promptUser() {
    rl.question("\nEnter your question (or 'exit' to quit, 'test' to see stored documents, 'debug' for debugging tools): ", async (query) => {
      if (query.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      if (query.toLowerCase() === 'test') {
        await handleTestCommand(vectorStore, promptUser);
        return;
      }

      if (query.toLowerCase() === 'debug') {
        await handleDebugCommand(vectorStore, promptUser, rl);
        return;
      }

      await processQuery(query, vectorStore, ollamaModel, ollamaHost, promptUser);
    });
  }

  promptUser();
}
