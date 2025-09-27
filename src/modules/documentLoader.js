// Document loading module
import fs from "fs/promises";
import path from "path";

/**
 * Recursively loads all Markdown documents from a directory
 * @param {string} dirPath - Path to the directory containing markdown files
 * @param {string} basePath - Base path for calculating relative paths
 * @returns {Promise<Array>} Array of document objects with content and metadata
 */
export async function loadMarkdownDocuments(dirPath, basePath) {
  const documents = [];
  const excludeDirs = [".obsidian", ".git", ".DS_Store", "_templates"];
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      if (file.isDirectory() && !excludeDirs.includes(file.name)) {
        // Recursively load documents from subdirectories
        documents.push(...await loadMarkdownDocuments(fullPath, basePath));
      } else if (file.name.endsWith(".md")) {
        // Read the content of the Markdown file
        const content = await fs.readFile(fullPath, "utf-8");
        const fileName = path.basename(fullPath, '.md');
        const relativePath = path.relative(basePath, fullPath);
        
        documents.push({
          pageContent: content,
          metadata: { 
            source: fullPath,
            fileName: fileName,
            relativePath: relativePath,
            fileType: 'markdown'
          },
        });
      }
    }
  } catch (error) {
    console.error(`Error loading documents from ${dirPath}: ${error.message}`);
  }
  return documents;
}

/**
 * Validates that the documents path exists and contains markdown files
 * @param {string} docsPath - Path to the documents directory
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
export async function validateDocumentsPath(docsPath) {
  try {
    const docs = await loadMarkdownDocuments(docsPath, docsPath);
    if (docs.length === 0) {
      console.error(`No Markdown files found in the specified path: ${docsPath}.`);
      return false;
    }
    console.log(`Found ${docs.length} markdown documents.`);
    return true;
  } catch (error) {
    console.error(`Error validating documents path ${docsPath}: ${error.message}`);
    return false;
  }
}
