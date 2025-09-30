// JavaScript for RAG Builder Web Interface

class RAGWebApp {
    constructor() {
        this.isInitialized = false;
        this.isDarkMode = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeSystem();
        this.loadTheme();
    }

    setupEventListeners() {
        // Query input and button
        const queryInput = document.getElementById('queryInput');
        const queryButton = document.getElementById('queryButton');
        
        queryInput.addEventListener('input', () => {
            queryButton.disabled = !queryInput.value.trim();
        });

        queryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!queryButton.disabled) {
                    this.processQuery();
                }
            }
        });

        queryButton.addEventListener('click', () => this.processQuery());

        // Suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                queryInput.value = chip.dataset.query;
                queryButton.disabled = false;
                this.processQuery();
            });
        });

        // Retry button
        document.getElementById('retryButton').addEventListener('click', () => {
            this.hideError();
            this.initializeSystem();
        });

        // Settings modal
        document.getElementById('settingsButton').addEventListener('click', () => {
            this.showSettingsModal();
        });

        document.getElementById('closeSettingsButton').addEventListener('click', () => {
            this.hideSettingsModal();
        });

        document.getElementById('saveVaultPathButton').addEventListener('click', () => {
            this.updateVaultPath();
        });

        // Debug panel
        document.getElementById('toggleDebug').addEventListener('click', () => {
            this.toggleDebugPanel();
        });

        document.getElementById('getStatsButton').addEventListener('click', () => {
            this.getSystemStats();
        });

        document.getElementById('debugSearchButton').addEventListener('click', () => {
            this.testSearch();
        });

        // Theme toggle
        document.getElementById('toggleTheme').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Refresh button
        document.getElementById('refreshButton').addEventListener('click', () => {
            this.refreshVectorStore();
        });
    }

    async initializeSystem() {
        this.updateStatus('Initializing...', 'warning');
        
        try {
            const response = await fetch('/api/init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.isInitialized = true;
                this.updateStatus('Ready', 'connected');
                this.enableRefreshButton();
                this.showNotification('RAG system initialized successfully!', 'success');
                
                if (data.stats) {
                    this.displaySystemStats(data.stats);
                }
                
                // Fetch and display the current vault path
                this.fetchVaultPath();
            } else {
                throw new Error(data.error || 'Failed to initialize system');
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateStatus('Error', 'error');
            this.showError('Failed to initialize RAG system: ' + error.message);
        }
    }

    async processQuery() {
        const queryInput = document.getElementById('queryInput');
        const query = queryInput.value.trim();

        if (!query || !this.isInitialized) {
            return;
        }

        this.showLoading();
        this.hideResults();
        this.hideError();

        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });

            const data = await response.json();

            if (data.success) {
                this.displayResults(data);
            } else {
                throw new Error(data.error || 'Query failed');
            }
        } catch (error) {
            console.error('Query error:', error);
            this.showError('Failed to process query: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    displayResults(data) {
        const resultsSection = document.getElementById('resultsSection');
        const answerContent = document.getElementById('answerContent');
        const sourcesList = document.getElementById('sourcesList');
        const searchMeta = document.getElementById('searchMeta');

        // Display answer
        answerContent.textContent = data.answer;

        // Display search metadata
        const searchTypes = data.searchTypes.join(', ');
        searchMeta.innerHTML = `
            <span><i class="fas fa-search"></i> Found ${data.sources.length} sources</span>
            <span><i class="fas fa-tags"></i> Search types: ${searchTypes}</span>
            <span><i class="fas fa-clock"></i> ${new Date(data.timestamp).toLocaleTimeString()}</span>
        `;

        // Display sources
        sourcesList.innerHTML = '';
        data.sources.forEach(source => {
            const sourceElement = document.createElement('div');
            sourceElement.className = 'source-item';
            const directoryDisplay = source.directory ? `<div class="source-directory"><i class="fas fa-folder-open"></i> ${source.directory}</div>` : '';

            sourceElement.innerHTML = `
                <div class="source-header">
                    <div class="source-title">
                        ${directoryDisplay}
                        <span>${source.fileName}</span>
                    </div>
                    <div class="source-meta">
                        <span class="meta-badge relevance-${source.relevance}">${source.relevance}</span>
                        <span class="meta-badge type-${source.type}">${source.type}</span>
                        <span class="meta-badge">${source.score}</span>
                    </div>
                </div>
                <div class="source-preview">${source.preview}</div>
            `;
            sourcesList.appendChild(sourceElement);
        });

        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async getSystemStats() {
        try {
            const response = await fetch('/api/debug/stats');
            const data = await response.json();

            if (data.success) {
                const statsDisplay = document.getElementById('statsDisplay');
                statsDisplay.textContent = JSON.stringify(data.stats, null, 2);
                statsDisplay.classList.remove('hidden');
            } else {
                throw new Error(data.error || 'Failed to get stats');
            }
        } catch (error) {
            console.error('Stats error:', error);
            this.showNotification('Failed to get system stats: ' + error.message, 'error');
        }
    }

    async testSearch() {
        const debugSearchInput = document.getElementById('debugSearchInput');
        const query = debugSearchInput.value.trim();

        if (!query) {
            this.showNotification('Please enter a test query', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/debug/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });

            const data = await response.json();

            if (data.success) {
                const debugResults = document.getElementById('debugSearchResults');
                debugResults.innerHTML = '';
                
                data.results.forEach(result => {
                    const resultElement = document.createElement('div');
                    resultElement.innerHTML = `
                        <div><strong>${result.fileName}</strong> (${result.type}, ${result.score})</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 0.25rem;">
                            ${result.content}
                        </div>
                    `;
                    debugResults.appendChild(resultElement);
                });
                
                debugResults.classList.remove('hidden');
            } else {
                throw new Error(data.error || 'Test search failed');
            }
        } catch (error) {
            console.error('Test search error:', error);
            this.showNotification('Test search failed: ' + error.message, 'error');
        }
    }

    showSettingsModal() {
        const settingsModal = document.getElementById('settingsModal');
        settingsModal.classList.remove('hidden');
        
        // Add click outside to close functionality
        settingsModal.addEventListener('click', (e) => {
            // Close the modal if the click is outside the modal content
            if (e.target === settingsModal) {
                this.hideSettingsModal();
            }
        });
        
        // Add escape key to close functionality
        const escKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideSettingsModal();
            }
        };
        document.addEventListener('keydown', escKeyHandler);
        
        // Store the handler for later removal
        this.escKeyHandler = escKeyHandler;
        
        // Fetch the current vault path when opening the modal
        this.fetchVaultPath();
    }
    
    hideSettingsModal() {
        const settingsModal = document.getElementById('settingsModal');
        settingsModal.classList.add('hidden');
        
        // Remove the click event listener when hiding the modal
        settingsModal.removeEventListener('click', () => {});
        
        // Remove escape key handler
        if (this.escKeyHandler) {
            document.removeEventListener('keydown', this.escKeyHandler);
            this.escKeyHandler = null;
        }
    }
    
    toggleDebugPanel() {
        const debugPanel = document.getElementById('debugPanel');
        const toggleButton = document.getElementById('toggleDebug');
        const icon = toggleButton.querySelector('i');

        debugPanel.classList.toggle('expanded');
        
        if (debugPanel.classList.contains('expanded')) {
            icon.className = 'fas fa-chevron-up';
        } else {
            icon.className = 'fas fa-chevron-down';
        }
    }
    
    async fetchVaultPath() {
        try {
            const response = await fetch('/api/settings/vault-path');
            const data = await response.json();
            
            if (data.success) {
                const currentVaultPath = document.getElementById('currentVaultPath');
                currentVaultPath.textContent = data.vaultPath || 'Not set';
                
                // Also update the input field with the current value
                const vaultPathInput = document.getElementById('vaultPathInput');
                vaultPathInput.value = data.vaultPath || '';
            } else {
                throw new Error(data.error || 'Failed to fetch vault path');
            }
        } catch (error) {
            console.error('Error fetching vault path:', error);
            this.showNotification('Failed to fetch vault path: ' + error.message, 'error');
        }
    }
    
    async updateVaultPath() {
        const vaultPathInput = document.getElementById('vaultPathInput');
        const newPath = vaultPathInput.value.trim();
        
        if (!newPath) {
            this.showNotification('Please enter a valid path', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/settings/vault-path', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vaultPath: newPath })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Update the displayed path
                const currentVaultPath = document.getElementById('currentVaultPath');
                currentVaultPath.textContent = newPath;
                
                this.showNotification('Obsidian vault path updated successfully!', 'success');
                
                // Hide the settings modal
                this.hideSettingsModal();
                
                // Ask if the user wants to refresh the vector store with the new path
                if (confirm('Would you like to refresh the vector store with the new vault path?')) {
                    this.refreshVectorStore();
                }
            } else {
                throw new Error(data.error || 'Failed to update vault path');
            }
        } catch (error) {
            console.error('Error updating vault path:', error);
            this.showNotification('Failed to update vault path: ' + error.message, 'error');
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
        
        const themeButton = document.getElementById('toggleTheme');
        const icon = themeButton.querySelector('i');
        
        if (this.isDarkMode) {
            icon.className = 'fas fa-sun';
            themeButton.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        } else {
            icon.className = 'fas fa-moon';
            themeButton.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        }
        
        localStorage.setItem('rag-theme', this.isDarkMode ? 'dark' : 'light');
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('rag-theme');
        if (savedTheme === 'dark') {
            this.isDarkMode = true;
            this.toggleTheme();
        }
    }

    updateStatus(text, type) {
        const statusText = document.getElementById('statusText');
        const statusDot = document.getElementById('statusDot');
        
        statusText.textContent = text;
        statusDot.className = `status-dot ${type}`;
    }

    showLoading() {
        document.getElementById('loadingIndicator').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingIndicator').classList.add('hidden');
    }

    showResults() {
        document.getElementById('resultsSection').classList.remove('hidden');
    }

    hideResults() {
        document.getElementById('resultsSection').classList.add('hidden');
    }

    showError(message) {
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorSection.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('errorSection').classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            padding: 1rem;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    displaySystemStats(stats) {
        // This could be expanded to show stats in a dedicated section
        console.log('System Stats:', stats);
    }

    async refreshVectorStore() {
        if (!this.isInitialized) {
            this.showNotification('Please initialize the system first', 'warning');
            return;
        }

        // Show confirmation dialog
        if (!confirm('This will rebuild your entire knowledge base. This may take several minutes. Continue?')) {
            return;
        }

        this.showRefreshModal();
        this.updateRefreshProgress(0, 'Starting refresh...');

        try {
            const response = await fetch('/api/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.updateRefreshProgress(100, 'Refresh completed successfully!');
                this.showNotification('Knowledge base refreshed successfully!', 'success');
                
                // Update stats display
                if (data.stats) {
                    this.displaySystemStats(data.stats);
                }
                
                // Show refresh stats
                this.showRefreshStats(data);
                
                // Hide modal after a delay
                setTimeout(() => {
                    this.hideRefreshModal();
                }, 2000);
            } else {
                throw new Error(data.error || 'Refresh failed');
            }
        } catch (error) {
            console.error('Refresh error:', error);
            this.updateRefreshProgress(0, 'Refresh failed: ' + error.message);
            this.showNotification('Failed to refresh knowledge base: ' + error.message, 'error');
            
            setTimeout(() => {
                this.hideRefreshModal();
            }, 3000);
        }
    }

    showRefreshModal() {
        document.getElementById('refreshModal').classList.remove('hidden');
        document.getElementById('refreshButton').classList.add('refreshing');
        document.getElementById('refreshButton').disabled = true;
    }

    hideRefreshModal() {
        document.getElementById('refreshModal').classList.add('hidden');
        document.getElementById('refreshButton').classList.remove('refreshing');
        document.getElementById('refreshButton').disabled = false;
        document.getElementById('refreshStats').classList.add('hidden');
    }

    updateRefreshProgress(percentage, status) {
        const progressBar = document.getElementById('refreshProgressBar');
        const statusElement = document.getElementById('refreshStatus');
        
        progressBar.style.width = percentage + '%';
        statusElement.textContent = status;
    }

    showRefreshStats(data) {
        const statsElement = document.getElementById('refreshStats');
        statsElement.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <strong>Documents Processed:</strong><br>
                    ${data.documentsProcessed || 0}
                </div>
                <div>
                    <strong>Chunks Created:</strong><br>
                    ${data.chunksCreated || 0}
                </div>
            </div>
        `;
        statsElement.classList.remove('hidden');
    }

    enableRefreshButton() {
        document.getElementById('refreshButton').disabled = false;
    }
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification button {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 0.25rem;
    }
    
    .notification button:hover {
        background-color: var(--border-color);
    }
`;
document.head.appendChild(notificationStyles);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RAGWebApp();
});
