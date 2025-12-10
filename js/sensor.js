/**
 * VirtualSensor.js - Simulates realistic IoT traffic density sensors
 * 
 * Generates time-aware traffic patterns with:
 * - Gaussian random generation (Box-Muller transform)
 * - Exponential Moving Average smoothing
 * - Time-of-day peak hour bias
 * - Manual density override for testing
 */

class VirtualSensor {
    /**
     * Initialize a virtual traffic sensor for a specific lane
     * @param {string} lane - Lane identifier: 'north', 'south', 'east', 'west'
     * @param {Object} config - Optional configuration
     * @param {number} config.initialDensity - Starting density (0-100), default 50
     * @param {number} config.emaCoefficient - EMA smoothing factor (0-1), default 0.7
     */
    constructor(lane, config = {}) {
        this.lane = lane;
        this.lastDensity = config.initialDensity || 50;
        this.emaCoefficient = config.emaCoefficient || 0.7;
        this.overrideDensity = null;  // For manual user testing
        
        // Validate lane
        if (!['north', 'south', 'east', 'west'].includes(lane)) {
            throw new Error(`Invalid lane: ${lane}. Must be north, south, east, or west.`);
        }
        
        // Clamp EMA coefficient
        if (this.emaCoefficient < 0 || this.emaCoefficient > 1) {
            throw new Error('EMA coefficient must be between 0 and 1');
        }
    }

    /**
     * Generate realistic traffic density for current time
     * Uses Gaussian distribution with time-of-day bias
     * 
     * @param {number} hour - Hour of day (0-23), defaults to current time
     * @returns {number} Traffic density (0-100%)
     */
    generateDensity(timestampMs) {
        const date = new Date(timestampMs);
        const hour = date.getHours();
        
        // Step 1: Calculate time-of-day peak factor
        // Peak hours: 8-9 AM (rush hour), 5-6 PM (rush hour)
        let peakFactor = 1.0;
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
            peakFactor = 1.5; // 50% higher during peak hours
        } else if (hour >= 22 || hour <= 5) {
            peakFactor = 0.3; // 70% lower during night
        }
        
        // Step 2: Generate random variation using Gaussian distribution
        const baseDensity = 50; // Base traffic density
        const stdDev = 15; // Standard deviation
        const randomGaussian = this._gaussianRandom(baseDensity, stdDev);
        
        // Step 3: Apply peak factor and clamp to 0-100
        const computedPercent = Math.max(0, Math.min(100, randomGaussian * peakFactor));
        
        // Step 4: Use override if set, otherwise use computed value
        let targetDensity;
        if (this.overrideDensity !== null) {
            targetDensity = this.overrideDensity;
        } else {
            targetDensity = computedPercent; // NOW PROPERLY DEFINED!
        }

        // Step 5: Apply EMA smoothing
        if (typeof this.smoothedDensity === 'undefined') {
            this.smoothedDensity = targetDensity;
        } else {
            this.smoothedDensity = this.smoothedDensity +
                this.emaCoefficient * (targetDensity - this.smoothedDensity);
        }
        
        const finalDensity = Math.max(0, Math.min(100, this.smoothedDensity));
        this.lastDensity = finalDensity;
        return finalDensity; // RETURNS 0-100 (not NaN)
    }

    /**
     * Manually override the next density reading
     * Used for testing specific scenarios
     * 
     * @param {number} value - Density value (0-100)
     */
    // Accept percent 0..100 (string or number), normalize and store as 0..100
    setDensity(value) {
        const percent = Math.max(0, Math.min(100, Number(value)));
        this.overrideDensity = percent; // store as percent
        // keep internal smoothing/state consistent if you use EMA as percent too:
        this.lastDensity = percent;
        if (typeof this.smoothedDensity !== 'undefined') {
            this.smoothedDensity = percent;
        }
    }


    /**
     * Reset sensor to initial state
     */
    reset() {
        this.lastDensity = 50;
        this.overrideDensity = null;
    }

    /**
     * Generate Gaussian random number using Box-Muller transform
     * Converts uniform random numbers to normal distribution
     * 
     * Box-Muller formula:
     *   z = sqrt(-2 * ln(u1)) * cos(2π * u2)
     * where u1, u2 are uniform random in (0,1)
     * 
     * @private
     * @param {number} mean - Distribution mean (μ)
     * @param {number} stdDev - Standard deviation (σ)
     * @returns {number} Gaussian random value
     */
    _gaussianRandom(mean, stdDev) {
        // Generate two uniform random numbers
        const u1 = Math.random();
        const u2 = Math.random();
        
        // Apply Box-Muller transform
        const magnitude = Math.sqrt(-2 * Math.log(u1));
        const angle = 2 * Math.PI * u2;
        const z = magnitude * Math.cos(angle);
        
        // Scale and shift to desired distribution
        return mean + stdDev * z;
    }

    /**
     * Get sensor metadata (for debugging)
     * @returns {Object} Sensor state information
     */
    getMetadata() {
        return {
            lane: this.lane,
            lastDensity: this.lastDensity.toFixed(2),
            emaCoefficient: this.emaCoefficient,
            hasOverride: this.overrideDensity !== null
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualSensor;
}