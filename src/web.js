// Web entry point for RAG Builder
import { RAGWebServer } from './modules/webServer.js';

const server = new RAGWebServer();
const port = process.env.PORT || 3000;

server.start(port);
