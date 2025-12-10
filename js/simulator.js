/**
 * Simulator.js - Main event loop orchestrator (UPDATED)
 * 
 * NEW FEATURES:
 * - Timed simulation (stops after specified duration)
 * - Play/Pause/Resume state management
 * - Start/Stop controls
 * - Automatic pause on time completion
 */

class Simulator {
    /**
     * Initialize simulation engine
     * 
     * @param {Object} sensors - Virtual sensors {north, south, east, west}
     * @param {AdaptiveController} controller - Traffic signal controller
     * @param {Dashboard} dashboard - Dashboard for visualization
     */
    constructor(sensors, controller, dashboard) {
        this.sensors = sensors;
        this.controller = controller;
        this.dashboard = dashboard;
        
        // Playback control state
        this.isPaused = false;
        this.isRunning = false;
        this.speedMultiplier = 1.0;
        this.tickInterval = 2000;    // 2 seconds per cycle
        this.intervalId = null;
        
        // Simulation timing
        this.cycleCount = 0;
        this.simulationDurationSeconds = 0;  // 0 = infinite
        this.simulationStartTime = null;
        this.elapsedTimeSeconds = 0;
        
        // State for pause/resume cycle tracking
        this.pausedAtSeconds = 0;
    }

    /**
     * Start simulation with optional duration limit
     * 
     * @param {number} durationSeconds - How long to run (0 = infinite)
     */
    start(durationSeconds = 0) {
        if (this.isRunning && !this.isPaused) {
            console.log('[Simulator] Already running');
            return;
        }

        // If resuming from pause, continue from where we left off
        if (this.isPaused) {
            this.isPaused = false;
            console.log('[Simulator] Resumed');
            return;
        }

        // New simulation
        this.isRunning = true;
        this.isPaused = false;
        this.simulationDurationSeconds = durationSeconds;
        this.simulationStartTime = Date.now();
        this.cycleCount = 0;
        this.elapsedTimeSeconds = 0;
        this.pausedAtSeconds = 0;
        
        // Reset dashboard for fresh start
        this.dashboard.reset();
        
        const adjustedInterval = this.tickInterval / this.speedMultiplier;
        this.intervalId = setInterval(() => this.tick(), adjustedInterval);
        
        const durationStr = durationSeconds > 0 ? ` for ${durationSeconds}s` : ' (infinite)';
        console.log(`[Simulator] Started${durationStr} with ${adjustedInterval}ms interval (${this.speedMultiplier}x speed)`);
    }

    /**
     * Execute one simulation tick
     * 
     * Sequence:
     * 1. Check if simulation time exceeded (if duration set)
     * 2. Generate density from all sensors
     * 3. Compute green times using adaptive controller
     * 4. Calculate signal phases
     * 5. Update dashboard with new state
     * 6. Increment cycle counter
     */
    tick() {
        if (this.isPaused || !this.isRunning) return;

        try {
            // ✅ Always track elapsed time, even in infinite mode
            const realElapsedMs = Date.now() - this.simulationStartTime;
            const simulationElapsedMs = (realElapsedMs / 1000) * this.speedMultiplier;
            this.elapsedTimeSeconds = simulationElapsedMs;

            // Only stop automatically if a finite duration is set
            if (this.simulationDurationSeconds > 0 &&
                this.elapsedTimeSeconds >= this.simulationDurationSeconds) {
                this.stop();
                return;
            }


            // Step 2: Generate density from all sensors
            const densities = {};
            for (const [lane, sensor] of Object.entries(this.sensors)) {
                densities[lane] = sensor.generateDensity();
            }

            // Step 3: Compute green times
            const greenTimes = this.controller.computeGreenTimes(densities);

            // Step 4: Calculate signal phases
            const signals = this._computeSignals(greenTimes);

            // Step 5: Prepare state for dashboard
            const state = {
                cycleCount: this.cycleCount,
                densities,
                greenTimes,
                signals,
                timestamp: new Date(),
                latency: Math.random() * 10,
                messagesProcessed: this.cycleCount + 1,
                elapsedTime: this.elapsedTimeSeconds,
                totalDuration: this.simulationDurationSeconds
            };

            // Step 6: Update dashboard
            this.dashboard.update(state);

            // Step 7: Increment counter
            this.cycleCount++;

        } catch (error) {
            console.error('[Simulator] Error during tick:', error);
        }
    }

    /**
     * Compute signal states based on green times
     * 
     * @private
     * @param {Object} greenTimes - Green times per lane
     * @returns {Object} Signal states {north, south, east, west}
     */
    _computeSignals(greenTimes) {
        const signals = {};
        
        for (const lane of Object.keys(greenTimes)) {
            signals[lane] = 'RED';
        }

        const maxLane = Object.keys(greenTimes).reduce((a, b) =>
            greenTimes[a] > greenTimes[b] ? a : b
        );

        signals[maxLane] = 'GREEN';
        return signals;
    }

    /**
     * Pause the simulation (without stopping it)
     * Records pause time for duration calculation
     */
    pause() {
        if (!this.isRunning) return;
        
        this.isPaused = true;
        this.pausedAtSeconds = this.elapsedTimeSeconds;
        console.log('[Simulator] Paused at', this.elapsedTimeSeconds.toFixed(2), 'seconds');
    }

    /**
     * Resume paused simulation
     * Continues from where it was paused
     */
    resume() {
        if (!this.isRunning || !this.isPaused) return;
        
        this.isPaused = false;
        // Adjust start time to account for pause duration
        const pauseDurationMs = Date.now() - this.simulationStartTime;
        this.simulationStartTime = Date.now() - (this.pausedAtSeconds * 1000);
        
        console.log('[Simulator] Resumed');
    }

    /**
     * Stop simulation completely
     * Clears all state and stops updates
     */
    stop() {
        clearInterval(this.intervalId);
        this.isRunning = false;
        this.isPaused = false;
        console.log('[Simulator] Stopped at cycle', this.cycleCount);
    }

    /**
     * Reset simulation to initial state
     * Clears all state and history
     */
    reset() {
        clearInterval(this.intervalId);

        this.isPaused = false;
        this.isRunning = false;
        this.speedMultiplier = 1.0;
        this.cycleCount = 0;
        this.simulationDurationSeconds = 0;
        this.simulationStartTime = null;
        this.elapsedTimeSeconds = 0;
        this.pausedAtSeconds = 0;

        for (const sensor of Object.values(this.sensors)) {
            sensor.reset();
        }
        this.dashboard.reset();

        console.log('[Simulator] Reset complete');
    }

    /**
     * Adjust simulation speed multiplier
     * 
     * @param {number} multiplier - Speed multiplier (0.5 to 5.0)
     */
    setSpeed(multiplier) {
        if (multiplier <= 0 || multiplier > 10) {
            throw new Error('Speed multiplier must be between 0.1 and 10');
        }

        this.speedMultiplier = multiplier;

        if (this.isRunning && !this.isPaused) {
            clearInterval(this.intervalId);
            const adjustedInterval = this.tickInterval / this.speedMultiplier;
            this.intervalId = setInterval(() => this.tick(), adjustedInterval);
        }

        console.log(`[Simulator] Speed set to ${multiplier}x`);
    }

    /**
     * Execute single tick while paused (manual stepping)
     */
    step() {
        if (!this.isPaused || !this.isRunning) {
            console.log('[Simulator] Can only step while paused');
            return;
        }
        this.tick();
    }

    /**
     * Get remaining time until simulation stops
     * 
     * @returns {number} Remaining seconds (0 if infinite or stopped)
     */
    getRemainingTime() {
        if (this.simulationDurationSeconds === 0 || !this.isRunning) {
            return 0;
        }
        return Math.max(0, this.simulationDurationSeconds - this.elapsedTimeSeconds);
    }

    /**
     * Get current simulation status
     * 
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            cycleCount: this.cycleCount,
            speedMultiplier: this.speedMultiplier,
            elapsedTime: this.elapsedTimeSeconds.toFixed(2),
            totalDuration: this.simulationDurationSeconds,
            remainingTime: this.getRemainingTime().toFixed(2),
            progress: this.simulationDurationSeconds > 0 ? 
                     ((this.elapsedTimeSeconds / this.simulationDurationSeconds) * 100).toFixed(1) + '%' :
                     'Infinite'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Simulator;
}
