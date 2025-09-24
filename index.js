// Import necessary modules
import fs from "fs/promises";
import path from "path";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import 'dotenv/config'; // Loads environment variables from a .env file
import { Chroma } from "@langchain/community/vectorstores/chroma";

// --- Configuration ---
// Path to your Obsidian vault, read from the environment variables
const docs_path = process.env.OBSIDIAN_VAULT_PATH;

// --- Utility function to load Markdown files recursively ---
async function loadMarkdownDocuments(dirPath) {
  const documents = [];
  const files = await fs.readdir(dirPath, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      // Recursively load documents from subdirectories
      documents.push(...await loadMarkdownDocuments(fullPath));
    } else if (file.name.endsWith(".md")) {
      // Read the content of the Markdown file
      const content = await fs.readFile(fullPath, "utf-8");
      documents.push({
        pageContent: content,
        metadata: { source: fullPath },
      });
    }
  }
  return documents;
}

// --- Main RAG process ---
async function runRAG() {
  // Verify that all necessary variables are available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Please create a .env file with your key.");
    return;
  }
  
  if (!docs_path) {
    console.error("OBSIDIAN_VAULT_PATH is not set in your .env file.");
    return;
  }

  console.log("Step 1: Loading Markdown documents...");
  let docs;
  try {
    docs = await loadMarkdownDocuments(docs_path);
    if (docs.length === 0) {
      console.error(`No Markdown files found in the specified path: ${docs_path}.`);
      return;
    }
    console.log(`Loaded ${docs.length} documents.`);
  } catch (e) {
    console.error(`Error loading documents from ${docs_path}: ${e.message}`);
    return;
  }

  console.log("\nStep 2: Splitting documents into chunks...");
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  const chunks = await textSplitter.createDocuments(docs.map(doc => doc.pageContent));
  console.log(`Created ${chunks.length} chunks.`);
  
  console.log("\nStep 3: Creating embeddings and vector store...");
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-ada-002"
  });
  
  // This is the corrected approach for a local, persistent vector store.
  // It automatically handles the client and document adding in one step.
  const vectorStore = await Chroma.fromDocuments(
    chunks,
    embeddings,
    {
      collectionName: "obsidian_notes",
      persist_directory: "./chroma_db",
    }
  );
  
  console.log("Vector store created and documents indexed.");

  console.log("\n--- RAG System Ready ---");
  
  // A simple CLI loop to query the system
  const readline = import('node:readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function promptUser() {
    rl.question("\nEnter your question (or 'exit' to quit): ", async (query) => {
      if (query.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      console.log("\nStep 4: Retrieving relevant information...");
      
      // Use the vector store as a retriever to get relevant documents
      const retriever = vectorStore.asRetriever({ k: 3 });
      const relevantDocs = await retriever.getRelevantDocuments(query);

      if (!relevantDocs || relevantDocs.length === 0) {
        console.log("No relevant information found in your notes.");
        promptUser();
        return;
      }
      
      const context = relevantDocs.map(doc => doc.pageContent).join("\n\n---\n\n");
      console.log("Found relevant context from your notes.");
      
      console.log("\nStep 5: Generating the final answer with LLM...");
      const llm = new ChatOpenAI({ modelName: "gpt-3.5-turbo" });
      const prompt = `Based on the following context, answer the question. Do not use any information outside of the provided context.
      
      Context:
      ${context}

      Question:
      ${query}
      
      Answer:`;

      const response = await llm.invoke(new HumanMessage({ content: prompt }));
      
      console.log("\n--- Final Answer ---");
      console.log(response.content);
      console.log("--------------------");

      promptUser();
    });
  }

  promptUser();
}

// Run the main function
runRAG().catch(console.error);
