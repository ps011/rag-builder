// Search and retrieval module
/**
 * Performs hybrid search combining semantic similarity and keyword matching
 * @param {Chroma} vectorStore - The vector store instance
 * @param {string} query - Search query
 * @param {number} k - Number of results to return
 * @returns {Promise<Array>} Array of search results with metadata
 */
export async function performHybridSearch(vectorStore, query, k = 5) {
  const results = [];
  
  try {
    // 1. Semantic similarity search
    const semanticResults = await vectorStore.similaritySearchWithScore(query, k * 2);
    semanticResults.forEach(([doc, score]) => {
      results.push({
        document: doc,
        score: score,
        type: 'semantic',
        relevance: score > 0.7 ? 'high' : score > 0.5 ? 'medium' : 'low'
      });
    });
    
    // 2. Exact keyword matching (case-insensitive)
    const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const allDocs = await vectorStore.similaritySearch("", 1000); // Get all docs for keyword search
    
    for (const doc of allDocs) {
      const content = doc.pageContent.toLowerCase();
      const fileName = (doc.metadata?.fileName || '').toLowerCase();
      const relativePath = (doc.metadata?.relativePath || '').toLowerCase();
      
      let keywordMatches = 0;
      for (const keyword of keywords) {
        if (content.includes(keyword) || fileName.includes(keyword) || relativePath.includes(keyword)) {
          keywordMatches++;
        }
      }
      
      if (keywordMatches > 0) {
        const keywordScore = keywordMatches / keywords.length;
        results.push({
          document: doc,
          score: keywordScore,
          type: 'keyword',
          relevance: keywordScore > 0.7 ? 'high' : keywordScore > 0.5 ? 'medium' : 'low',
          keywordMatches: keywordMatches
        });
      }
    }
    
    // 3. Combine and deduplicate results
    const uniqueResults = new Map();
    results.forEach(result => {
      const key = result.document.metadata?.source || result.document.pageContent.substring(0, 100);
      if (!uniqueResults.has(key) || result.score > uniqueResults.get(key).score) {
        uniqueResults.set(key, result);
      }
    });
    
    // 4. Sort by relevance and return top k
    return Array.from(uniqueResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
      
  } catch (error) {
    console.error("Error in hybrid search:", error);
    // Fallback to simple similarity search
    const fallbackResults = await vectorStore.similaritySearch(query, k);
    return fallbackResults.map(doc => ({
      document: doc,
      score: 0.5,
      type: 'fallback',
      relevance: 'medium'
    }));
  }
}

/**
 * Filters search results by relevance threshold
 * @param {Array} searchResults - Array of search results
 * @param {number} threshold - Minimum relevance score (default: 0.3)
 * @returns {Array} Filtered results above threshold
 */
export function filterResultsByRelevance(searchResults, threshold = 0.3) {
  return searchResults.filter(result => result.score > threshold);
}

/**
 * Builds context string from search results
 * @param {Array} results - Array of search results
 * @returns {string} Formatted context string
 */
export function buildContextFromResults(results) {
  return results.map((result, index) => {
    const source = result.document.metadata?.fileName || result.document.metadata?.source || 'Unknown';
    const relevance = result.relevance;
    const searchType = result.type;
    const score = result.score.toFixed(3);
    return `[Source ${index + 1}: ${source} | Relevance: ${relevance} | Score: ${score} | Type: ${searchType}]\n${result.document.pageContent}`;
  }).join("\n\n---\n\n");
}

/**
 * Gets vector store statistics for debugging
 * @param {Chroma} vectorStore - The vector store instance
 * @returns {Promise<Object>} Statistics object
 */
export async function getVectorStoreStats(vectorStore) {
  try {
    const allDocs = await vectorStore.similaritySearch("", 1000);
    const sources = new Set(allDocs.map(doc => doc.metadata?.source));
    const avgLength = allDocs.reduce((sum, doc) => sum + doc.pageContent.length, 0) / allDocs.length;
    
    return {
      totalDocuments: allDocs.length,
      uniqueFiles: sources.size,
      averageChunkLength: avgLength,
      sampleSources: Array.from(sources).slice(0, 5)
    };
  } catch (error) {
    console.error("Error getting vector store stats:", error);
    return null;
  }
}
