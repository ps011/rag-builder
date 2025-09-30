// Advanced search and retrieval enhancements
import { performHybridSearch } from './search.js';

/**
 * Expands a query with synonyms and related terms
 * @param {string} query - Original query
 * @returns {Array} Array of expanded query variations
 */
export function expandQuery(query) {
  const expansions = [query];
  
  // Common synonyms and related terms
  const synonymMap = {
    'learn': ['study', 'understand', 'grasp', 'master', 'acquire'],
    'work': ['job', 'career', 'employment', 'profession'],
    'project': ['task', 'assignment', 'initiative', 'endeavor'],
    'meeting': ['conference', 'discussion', 'session', 'gathering'],
    'idea': ['concept', 'thought', 'notion', 'proposal'],
    'problem': ['issue', 'challenge', 'difficulty', 'obstacle'],
    'solution': ['answer', 'fix', 'resolution', 'remedy'],
    'goal': ['objective', 'target', 'aim', 'purpose'],
    'plan': ['strategy', 'approach', 'method', 'scheme'],
    'result': ['outcome', 'consequence', 'effect', 'conclusion'],
    'bhaiya': ['brother', 'anshul', 'anshul bhaiya'],
  };
  
  const words = query.toLowerCase().split(/\s+/);
  
  // Generate variations with synonyms
  words.forEach(word => {
    if (synonymMap[word]) {
      synonymMap[word].forEach(synonym => {
        const expandedQuery = query.toLowerCase().replace(word, synonym);
        if (!expansions.includes(expandedQuery)) {
          expansions.push(expandedQuery);
        }
      });
    }
  });
  
  return expansions;
}

/**
 * Performs multi-query search with query expansion
 * @param {Chroma} vectorStore - The vector store instance
 * @param {string} query - Search query
 * @param {number} k - Number of results to return
 * @returns {Promise<Array>} Array of search results with metadata
 */
export async function performAdvancedSearch(vectorStore, query, k = 5) {
  const allResults = [];
  
  // 1. Original query search
  const originalResults = await performHybridSearch(vectorStore, query, k);
  allResults.push(...originalResults);
  
  // 2. Query expansion search
  const expandedQueries = expandQuery(query);
  for (const expandedQuery of expandedQueries.slice(1, 4)) { // Limit to 3 expansions
    try {
      const expandedResults = await performHybridSearch(vectorStore, expandedQuery, Math.ceil(k / 2));
      // Mark expanded results
      expandedResults.forEach(result => {
        result.type = 'expanded';
        result.expandedQuery = expandedQuery;
      });
      allResults.push(...expandedResults);
    } catch (error) {
      console.warn(`Error with expanded query "${expandedQuery}":`, error.message);
    }
  }
  
  // 3. Deduplicate and rank results
  const uniqueResults = new Map();
  allResults.forEach(result => {
    const key = result.document.metadata?.source || result.document.pageContent.substring(0, 100);
    if (!uniqueResults.has(key) || result.score > uniqueResults.get(key).score) {
      uniqueResults.set(key, result);
    }
  });
  
  // 4. Sort by relevance and return top k
  return Array.from(uniqueResults.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/**
 * Reranks results based on multiple factors
 * @param {Array} results - Search results
 * @param {string} query - Original query
 * @returns {Array} Reranked results
 */
export function rerankResults(results, query) {
  const queryWords = query.toLowerCase().split(/\s+/);
  
  return results.map(result => {
    let rerankScore = result.score;
    
    // Boost score for exact phrase matches
    const content = result.document.pageContent.toLowerCase();
    const fileName = (result.document.metadata?.fileName || '').toLowerCase();
    const directory = (result.document.metadata?.directory || '').toLowerCase();
    
    // Exact phrase match boost
    if (content.includes(query.toLowerCase())) {
      rerankScore += 0.2;
    }
    
    // Title/filename match boost
    if (fileName.includes(query.toLowerCase())) {
      rerankScore += 0.15;
    }

    // Directory match boost
    if (directory.length > 0 && query.toLowerCase().split(' ').some(word => directory.includes(word))) {
        rerankScore += 0.1;
    }
    
    // Word frequency boost
    let wordFrequency = 0;
    queryWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const contentMatches = (content.match(regex) || []).length;
      const fileNameMatches = (fileName.match(regex) || []).length;
      const directoryMatches = (directory.match(regex) || []).length;
      wordFrequency += contentMatches + (fileNameMatches * 2) + (directoryMatches * 1.5); // Weight directory matches more
    });
    
    rerankScore += Math.min(wordFrequency * 0.05, 0.3); // Cap the boost
    
    // Recency boost (if metadata has dates)
    if (result.document.metadata?.lastModified) {
      const daysSinceModified = (Date.now() - new Date(result.document.metadata.lastModified)) / (1000 * 60 * 60 * 24);
      if (daysSinceModified < 30) {
        rerankScore += 0.1;
      }
    }
    
    return {
      ...result,
      rerankScore,
      originalScore: result.score
    };
  }).sort((a, b) => b.rerankScore - a.rerankScore);
}

/**
 * Builds enhanced context with better formatting and ranking
 * @param {Array} results - Reranked search results
 * @returns {string} Enhanced context string
 */
export function buildEnhancedContext(results) {
  return results.map((result, index) => {
    const source = result.document.metadata?.fileName || 'Unknown';
    const directory = result.document.metadata?.directory;
    const relevance = result.relevance;
    const searchType = result.type;
    const score = result.rerankScore ? result.rerankScore.toFixed(3) : result.score.toFixed(3);
    const originalScore = result.originalScore ? ` (orig: ${result.originalScore.toFixed(3)})` : '';
    const directoryInfo = directory ? ` | Directory: ${directory}` : '';
    
    return `[Source ${index + 1}: ${source}${directoryInfo} | Relevance: ${relevance} | Score: ${score}${originalScore} | Type: ${searchType}]\n${result.document.pageContent}`;
  }).join("\n\n---\n\n");
}

/**
 * Creates an enhanced prompt with better instructions for accuracy
 * @param {string} context - Context from retrieved documents
 * @param {string} query - User's question
 * @returns {string} Enhanced prompt
 */
export function createEnhancedPrompt(context, query) {
  return `You are an expert assistant that provides highly accurate answers based on the user's personal notes and documents.

CRITICAL INSTRUCTIONS FOR MAXIMUM ACCURACY:
- Answer ONLY using the information provided in the context below
- If the context doesn't contain enough information to answer completely, explicitly state "I don't have enough information in my notes to answer this question completely"
- Be extremely specific and accurate - cite exact details when available
- If you find relevant information, provide it clearly with specific references to sources
- Don't make assumptions or add information not present in the context
- If multiple sources contain conflicting information, explicitly mention the conflicts
- Pay attention to relevance scores - higher scores indicate better matches
- If the question asks for specific details (names, dates, numbers), be precise
- Structure your answer logically with clear sections if appropriate
- Use bullet points or numbered lists when presenting multiple items

CONTEXT FROM USER'S NOTES:
${context}

QUESTION: ${query}

Please provide a comprehensive, accurate answer based on the context above. If information is insufficient, clearly state what's missing.`;
}
