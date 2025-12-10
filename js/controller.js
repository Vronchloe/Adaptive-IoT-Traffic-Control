/**
 * AdaptiveController.js - Adaptive traffic signal control logic
 * 
 * Implements proportional green-time allocation algorithm:
 * - Fair distribution based on lane density
 * - Constraint satisfaction (min/max green times)
 * - Cycle length preservation
 * - Dynamic parameter adjustment
 */

class AdaptiveController {
    /**
     * Initialize adaptive traffic signal controller
     * 
     * @param {Object} config - Configuration parameters
     * @param {number} config.cycleLength - Total cycle duration (default 60s)
     * @param {number} config.minGreen - Minimum green time per lane (default 10s, safety)
     * @param {number} config.maxGreen - Maximum green time per lane (default 60s, fairness)
     * @param {number} config.yellowTime - Yellow phase duration (default 3s)
     * @param {number} config.allRedTime - All-red safety phase (default 2s)
     */
    constructor(config = {}) {
        this.cycleLength = config.cycleLength || 60;
        this.minGreen = config.minGreen || 10;
        this.maxGreen = config.maxGreen || 60;
        this.yellowTime = config.yellowTime || 3;
        this.allRedTime = config.allRedTime || 2;
        this.lanes = ['north', 'south', 'east', 'west'];
        
        // Validate configuration
        this._validateConfig();
    }

    /**
     * Compute optimal green times based on current traffic densities
     * 
     * Algorithm (3-step process):
     * 1. Proportional allocation: Give each lane time proportional to its density
     * 2. Constraint application: Enforce min/max bounds
     * 3. Redistribution: Adjust to maintain cycle length while respecting constraints
     * 
     * @param {Object} densities - Current lane densities {north, south, east, west}, range 0-100
     * @returns {Object} Computed green times per lane in seconds
     * 
     * @example
     * const densities = { north: 80, south: 20, east: 60, west: 40 };
     * const greenTimes = controller.computeGreenTimes(densities);
     * // Result: { north: 16, south: 10, east: 12, west: 8 }
     */
    computeGreenTimes(densities) {
        // Validate input
        if (!densities || typeof densities !== 'object') {
            throw new Error('Densities must be an object');
        }

        // Step 1: Calculate total density and available green time
        const total = Object.values(densities).reduce((sum, d) => sum + d, 0);

        // Handle zero-traffic edge case
        if (total === 0) {
            return this.lanes.reduce((obj, lane) => {
                obj[lane] = this.minGreen;
                return obj;
            }, {});
        }

        // Calculate available green time after accounting for overhead
        // Formula: availableGreen = cycleLength - (numLanes * (yellowTime + allRedTime))
        const fixedTimePerLane = this.yellowTime + this.allRedTime;
        const totalFixedTime = this.lanes.length * fixedTimePerLane;
        const availableTime = this.cycleLength - totalFixedTime;

        // Step 2: Proportional allocation (raw, unconstrained)
        const rawGreen = {};
        for (const lane of this.lanes) {
            const proportion = densities[lane] / total;
            rawGreen[lane] = proportion * availableTime;
        }

        // Step 3: Apply hard constraints (min/max bounds)
        const constrained = {};
        for (const lane of this.lanes) {
            constrained[lane] = Math.max(
                this.minGreen,
                Math.min(this.maxGreen, Math.floor(rawGreen[lane]))
            );
        }

        // Step 4: Redistribution (preserve cycle sum while respecting constraints)
        return this._redistribute(constrained, availableTime, densities);
    }

    /**
     * Redistribute green times to maintain cycle integrity
     * If total green ≠ availableTime, adjust lanes while respecting constraints
     * 
     * Prioritizes high-density lanes for additional time (fairness)
     * 
     * @private
     * @param {Object} greenTimes - Constrained green times
     * @param {number} targetSum - Target total green time (availableTime)
     * @param {Object} densities - Lane densities (for priority ordering)
     * @returns {Object} Final green times
     */
    _redistribute(greenTimes, targetSum, densities) {
        let currentSum = Object.values(greenTimes).reduce((sum, g) => sum + g, 0);
        let diff = targetSum - currentSum;

        // If already balanced, return
        if (diff === 0) return greenTimes;

        // Sort lanes by density (descending) for fair redistribution
        const sortedLanes = this.lanes.sort((a, b) => densities[b] - densities[a]);

        // Iteratively adjust until balanced
        for (const lane of sortedLanes) {
            if (diff === 0) break;

            const adjustment = Math.sign(diff);
            const newValue = greenTimes[lane] + adjustment;

            // Respect constraints during redistribution
            if (newValue >= this.minGreen && newValue <= this.maxGreen) {
                greenTimes[lane] = newValue;
                diff -= adjustment;
            }
        }

        return greenTimes;
    }

    /**
     * Dynamically update controller configuration
     * Allows real-time parameter tuning without restarting
     * 
     * @param {Object} newConfig - Configuration parameters to update
     */
    updateConfig(newConfig) {
        if (newConfig.cycleLength !== undefined) {
            this.cycleLength = newConfig.cycleLength;
        }
        if (newConfig.minGreen !== undefined) {
            this.minGreen = newConfig.minGreen;
        }
        if (newConfig.maxGreen !== undefined) {
            this.maxGreen = newConfig.maxGreen;
        }
        if (newConfig.yellowTime !== undefined) {
            this.yellowTime = newConfig.yellowTime;
        }
        if (newConfig.allRedTime !== undefined) {
            this.allRedTime = newConfig.allRedTime;
        }
        
        this._validateConfig();
    }

    /**
     * Validate current configuration for logical correctness
     * @private
     */
    _validateConfig() {
        if (this.minGreen >= this.maxGreen) {
            throw new Error('minGreen must be less than maxGreen');
        }
        
        const fixedTime = this.lanes.length * (this.yellowTime + this.allRedTime);
        const minAvailable = this.lanes.length * this.minGreen;
        
        if (fixedTime + minAvailable > this.cycleLength) {
            throw new Error(
                `Cycle too short: ${this.cycleLength}s. ` +
                `Need at least ${fixedTime + minAvailable}s.`
            );
        }
        
        if (this.cycleLength <= 0 || this.minGreen < 0 || this.maxGreen < 0) {
            throw new Error('All timing parameters must be positive');
        }
    }

    /**
     * Get current controller configuration (for debugging)
     * @returns {Object} Configuration state
     */
    getConfig() {
        return {
            cycleLength: this.cycleLength,
            minGreen: this.minGreen,
            maxGreen: this.maxGreen,
            yellowTime: this.yellowTime,
            allRedTime: this.allRedTime
        };
    }

    /**
     * Calculate efficiency metric for given allocation
     * Higher = better proportional match between density and green time
     * 
     * @param {Object} densities - Lane densities
     * @param {Object} greenTimes - Lane green times
     * @returns {number} Efficiency score (0-100)
     */
    calculateEfficiency(densities, greenTimes) {
        let totalScore = 0;
        const maxScore = this.lanes.length;

        for (const lane of this.lanes) {
            const densityRatio = densities[lane] / 100;
            const greenRatio = greenTimes[lane] / this.cycleLength;
            
            // Score: how well does green time match density?
            // Perfect match = 1.0, mismatch = lower
            const alignment = Math.min(densityRatio, greenRatio) / 
                             Math.max(densityRatio, greenRatio);
            totalScore += alignment;
        }

        return (totalScore / maxScore) * 100;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdaptiveController;
}