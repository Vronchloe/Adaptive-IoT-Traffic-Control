/**
 * Main.js - Application initialization (UPDATED)
 * 
 * CRITICAL CHANGE:
 * - Simulation does NOT start automatically
 * - Components are initialized but simulator NOT started
 * - Simulator only starts when user clicks "Play" button
 */

// Global application state (for debugging in console)
window.appState = {};

/**
 * Initialize application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚦 Adaptive Traffic Control System - Initializing...');
    console.log('📅 Time:', new Date().toLocaleTimeString());

    try {
        // Step 1: Create virtual sensors
        console.log('📡 Creating virtual sensors...');
        const sensors = {
            north: new VirtualSensor('north', { initialDensity: 40 }),
            south: new VirtualSensor('south', { initialDensity: 35 }),
            east: new VirtualSensor('east', { initialDensity: 45 }),
            west: new VirtualSensor('west', { initialDensity: 38 })
        };
        console.log('✅ Sensors created');

        // Step 2: Create adaptive controller
        console.log('🧠 Creating adaptive controller...');
        const controller = new AdaptiveController({
            cycleLength: 60,
            minGreen: 10,
            maxGreen: 60,
            yellowTime: 3,
            allRedTime: 2
        });
        console.log('✅ Controller created');
        console.log('   Config:', controller.getConfig());

        // Step 3: Create dashboard
        console.log('📊 Creating dashboard...');
        const dashboard = new Dashboard();
        console.log('✅ Dashboard created');

        // Step 4: Create simulator (BUT DO NOT START IT)
        console.log('▶️  Creating simulator...');
        const simulator = new Simulator(sensors, controller, dashboard);
        console.log('✅ Simulator created (NOT STARTED - waiting for Play button)');

        // Step 5: Create storage manager
        console.log('💾 Creating storage manager...');
        const storage = new StorageManager();
        console.log('✅ Storage manager created');
        const storageInfo = storage.getStorageInfo();
        if (storageInfo) {
            console.log(`   Storage: ${storageInfo.scenarioCount} scenarios, ${storageInfo.estimatedSizeKB}KB used`);
        }

        // Step 6: Create interaction manager
        console.log('🖱️  Creating interaction manager...');
        const interactions = new InteractionManager(simulator, dashboard, storage);
        console.log('✅ Interaction manager created');

        // Step 7: Store references in global state (for debugging)
        window.appState = {
            sensors,
            controller,
            dashboard,
            simulator,
            storage,
            interactions
        };

        // Step 8: Update system status
        const systemStatusEl = document.getElementById('systemStatus');
        if (systemStatusEl) {
            systemStatusEl.textContent = 'Ready - Click Play to Start';
        }

        // Step 9: Log initialization complete
        console.log('\n=== INITIALIZATION COMPLETE ===');
        console.log('Status: READY (waiting for Play button)');
        console.log('Dashboard status:', dashboard.getStatus());
        console.log('Simulator status:', simulator.getStatus());
        console.log('\n📖 Instructions:');
        console.log('1. Set duration (optional, 0 = infinite)');
        console.log('2. Adjust density sliders (optional)');
        console.log('3. Click "▶️ Play" button to START simulation');
        console.log('\n📖 Console commands:');
        console.log('  appState.simulator.pause()         - Pause simulation');
        console.log('  appState.simulator.resume()        - Resume simulation');
        console.log('  appState.simulator.stop()          - Stop simulation');
        console.log('  appState.simulator.setSpeed(2)     - Set speed (2x)');
        console.log('  appState.simulator.reset()         - Reset everything');
        console.log('  appState.simulator.start(300)      - Start with 300s duration');
        console.log('======================\n');

    } catch (error) {
        console.error('❌ Initialization failed:', error);
        console.error(error.stack);
        alert('Failed to initialize application. Check console for details.');
        
        const systemStatusEl = document.getElementById('systemStatus');
        if (systemStatusEl) {
            systemStatusEl.textContent = 'Error - Check Console';
        }
    }
});

/**
 * Global keyboard shortcuts
 */
document.addEventListener('keydown', (event) => {
    if (!window.appState.simulator) return;

    switch(event.code) {
        case 'Space':
            if (window.appState.simulator.isRunning) {
                event.preventDefault();
                if (window.appState.simulator.isPaused) {
                    window.appState.simulator.resume();
                    console.log('▶️ Resumed via Space key');
                } else {
                    window.appState.simulator.pause();
                    console.log('⏸️ Paused via Space key');
                }
            }
            break;

        case 'KeyR':
            if (event.ctrlKey) {
                event.preventDefault();
                window.appState.simulator.reset();
                console.log('🔄 Simulation reset via Ctrl+R');
            }
            break;

        case 'KeyS':
            if (event.ctrlKey) {
                event.preventDefault();
                const json = window.appState.dashboard.exportAsJSON();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `backup_${Date.now()}.json`;
                link.click();
                URL.revokeObjectURL(url);
                console.log('💾 Auto-backup saved via Ctrl+S');
            }
            break;
    }
});

/**
 * Auto-save session every 30 seconds (only if running)
 */
setInterval(() => {
    if (window.appState.storage && window.appState.dashboard && window.appState.simulator.isRunning) {
        window.appState.storage.saveSession(window.appState.dashboard.state);
    }
}, 30000);

/**
 * Handle page unload (warn if simulation has unsaved data)
 */
window.addEventListener('beforeunload', (event) => {
    if (window.appState.dashboard && window.appState.dashboard.history.timestamps.length > 10) {
        event.preventDefault();
        event.returnValue = '';
    }
});

// Log application version
console.log('🔧 Version: 1.0.2 (Updated)');
console.log('📌 KEY CHANGE: Simulation does NOT auto-start. Click "▶️ Play" to begin.');
console.log('📚 Components:');
console.log('   - VirtualSensor (traffic simulation)');
console.log('   - AdaptiveController (proportional allocation algorithm)');
console.log('   - Simulator (event loop - PAUSED UNTIL PLAY CLICKED)');
console.log('   - Dashboard (visualization & state management)');
console.log('   - InteractionManager (UI controls)');
console.log('   - StorageManager (persistence)');
console.log('');