/**
 * Storage.js - LocalStorage management for scenario persistence
 * 
 * Handles:
 * - Save scenario to LocalStorage
 * - Load scenarios from LocalStorage
 * - Delete scenarios
 * - Session recovery (restore on page reload)
 */

class StorageManager {
    /**
     * Initialize storage manager
     */
    constructor() {
        this.storageKey = 'adaptive_traffic_scenarios';
        this.sessionKey = 'adaptive_traffic_session';
        
        // Check if LocalStorage is available
        this.isAvailable = this._checkAvailability();
        
        if (!this.isAvailable) {
            console.warn('[StorageManager] LocalStorage not available. Scenarios will not persist.');
        }
    }

    /**
     * Check if LocalStorage is available
     * @private
     * @returns {boolean} True if LocalStorage is available
     */
    _checkAvailability() {
        try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Save scenario to LocalStorage
     * 
     * @param {Object} scenario - Scenario object with name, state, history
     */
    saveScenario(scenario) {
        if (!this.isAvailable) return;

        try {
            let scenarios = this.getAllScenarios();
            
            // Replace if scenario with same name exists
            scenarios = scenarios.filter(s => s.name !== scenario.name);
            scenarios.push(scenario);

            localStorage.setItem(this.storageKey, JSON.stringify(scenarios));
            console.log(`[StorageManager] Scenario saved: ${scenario.name}`);
        } catch (error) {
            console.error('[StorageManager] Error saving scenario:', error);
        }
    }

    /**
     * Load scenario from LocalStorage
     * 
     * @param {string} name - Scenario name
     * @returns {Object|null} Scenario object or null if not found
     */
    loadScenario(name) {
        if (!this.isAvailable) return null;

        try {
            const scenarios = this.getAllScenarios();
            const raw = scenarios.find(s => s.name === name);

            if (!raw) {
                console.warn(`[StorageManager] Scenario not found: ${name}`);
                return null;
            }

            console.log(`[StorageManager] Scenario loaded: ${name}`);

            // --- REHYDRATE TIMESTAMPS SO CHARTS DON'T BREAK ---
            const scenario = { ...raw };

            if (scenario.history &&
                Array.isArray(scenario.history.timestamps)) {
                scenario.history = {
                    ...scenario.history,
                    timestamps: scenario.history.timestamps.map(t => new Date(t))
                };
            }

            // Rehydrate top-level timestamp and any state timestamps
            if (scenario.timestamp) scenario.timestamp = new Date(scenario.timestamp);
            if (scenario.state && scenario.state.timestamp) {
                scenario.state.timestamp = new Date(scenario.state.timestamp);
            }
            
            return scenario;

        } catch (error) {
            console.error('[StorageManager] Error loading scenario:', error);
            return null;
        }
    }

    /**
     * Get all saved scenarios
     * 
     * @returns {Array} Array of scenario objects
     */
    getAllScenarios() {
        if (!this.isAvailable) return [];

        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('[StorageManager] Error retrieving scenarios:', error);
            return [];
        }
    }

    /**
     * Delete scenario from LocalStorage
     * 
     * @param {string} name - Scenario name
     */
    deleteScenario(name) {
        if (!this.isAvailable) return;

        try {
            let scenarios = this.getAllScenarios();
            scenarios = scenarios.filter(s => s.name !== name);
            
            localStorage.setItem(this.storageKey, JSON.stringify(scenarios));
            console.log(`[StorageManager] Scenario deleted: ${name}`);
        } catch (error) {
            console.error('[StorageManager] Error deleting scenario:', error);
        }
    }

    /**
     * Save current session state
     * Allows recovery on page reload
     * 
     * @param {Object} state - Current simulation state
     */
    saveSession(state) {
        if (!this.isAvailable) return;

        try {
            localStorage.setItem(this.sessionKey, JSON.stringify({
                state,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.error('[StorageManager] Error saving session:', error);
        }
    }

    /**
     * Load saved session state
     * 
     * @returns {Object|null} Saved session state or null
     */
    loadSession() {
        if (!this.isAvailable) return null;

        try {
            const stored = localStorage.getItem(this.sessionKey);
            if (stored) {
                const session = JSON.parse(stored);
                console.log('[StorageManager] Session restored');
                return session;
            }
            return null;
        } catch (error) {
            console.error('[StorageManager] Error loading session:', error);
            return null;
        }
    }

    /**
     * Clear all stored data (use carefully!)
     */
    clearAll() {
        if (!this.isAvailable) return;

        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.sessionKey);
            console.log('[StorageManager] All data cleared');
        } catch (error) {
            console.error('[StorageManager] Error clearing data:', error);
        }
    }

    /**
     * Get storage usage info
     * @returns {Object} Storage statistics
     */
    getStorageInfo() {
        if (!this.isAvailable) return null;

        try {
            const scenarios = this.getAllScenarios();
            const totalSize = JSON.stringify(scenarios).length;
            
            return {
                available: this.isAvailable,
                scenarioCount: scenarios.length,
                estimatedSizeKB: (totalSize / 1024).toFixed(2)
            };
        } catch (error) {
            return null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}