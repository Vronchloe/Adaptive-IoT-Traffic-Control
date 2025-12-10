/**
 * Dashboard.js - State management and visualization coordination
 * 
 * Responsibilities:
 * - Maintain simulation state
 * - Manage data history (rolling buffer)
 * - Update Chart.js instances
 * - Update DOM metrics and visualization
 * - Calculate derived metrics (efficiency, wait times)
 */

class Dashboard {
    /**
     * Initialize dashboard with empty state
     */
    constructor() {
        // Current simulation state
        this.state = {
            cycleCount: 0,
            densities: { north: 0, south: 0, east: 0, west: 0 },
            greenTimes: { north: 10, south: 10, east: 10, west: 10 },
            signals: { north: 'RED', south: 'RED', east: 'RED', west: 'RED' },
            timestamp: new Date(),
            latency: 0,
            messagesProcessed: 0
        };

        // Historical data (rolling buffer)
        this.history = {
            timestamps: [],
            densities: { north: [], south: [], east: [], west: [] },
            greenTimes: { north: [], south: [], east: [], west: [] },
            efficiency: []
        };

        // Chart.js instances
        this.charts = {
            density: null,
            greenTime: null,
            performance: null,
            efficiency: null
        };

        // Configuration
        this.maxHistoryPoints = 100;
        this.lanes = ['north', 'south', 'east', 'west'];

        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initCharts());
        } else {
            this.initCharts();
        }
    }

    /**
     * Update dashboard with new simulation state
     * 
     * @param {Object} newState - New state from simulator
     */
    update(newState) {
        this.state = { ...this.state, ...newState };
        this.addToHistory();
        this.updateMetrics();
        this.updateCharts();
        this.updateIntersectionView();
        this.updateLaneRankings();
    }

    /**
     * Update summary metrics with lane ranking data
     * @private
     */
    updateSummaryMetrics(rankings) {
        // Cycle length
        const cycleLengthEl = document.getElementById('analysisCycleLength');
        if (cycleLengthEl) {
            cycleLengthEl.textContent = this.state.cycleCount;
        }

        // Total cycles
        const totalCyclesEl = document.getElementById('analysisTotalCycles');
        if (totalCyclesEl) {
            totalCyclesEl.textContent = this.state.cycleCount;
        }

        // Average efficiency
        if (rankings && rankings.length > 0) {
            const avgEfficiency = rankings.reduce((sum, item) => sum + item.efficiency, 0) / rankings.length;
            const avgEfficiencyEl = document.getElementById('analysisAvgEfficiency');
            if (avgEfficiencyEl) {
                avgEfficiencyEl.textContent = avgEfficiency.toFixed(1) + '%';
            }
        }

        // Best and worst performing lanes
        if (rankings && rankings.length > 0) {
            const bestLane = rankings[0];
            const worstLane = rankings[rankings.length - 1];
            
            const bestLaneEl = document.getElementById('analysisBestLane');
            if (bestLaneEl) {
                const bestName = bestLane.lane.charAt(0).toUpperCase() + bestLane.lane.slice(1);
                bestLaneEl.textContent = `${bestName} (${bestLane.efficiency.toFixed(0)}%)`;
            }

            const worstLaneEl = document.getElementById('analysisWorstLane');
            if (worstLaneEl) {
                const worstName = worstLane.lane.charAt(0).toUpperCase() + worstLane.lane.slice(1);
                worstLaneEl.textContent = `${worstName} (${worstLane.efficiency.toFixed(0)}%)`;
            }
        }

        // Overall system efficiency
        const overallEfficiency = this.calculateEfficiency();
        const overallEl = document.getElementById('analysisOverallEfficiency');
        if (overallEl) {
            overallEl.textContent = overallEfficiency.toFixed(1) + '%';
        }
    }

    /**
     * Add current state to history buffer
     * Maintains rolling window of last 100 points
     * @private
     */
    addToHistory() {
        // Add timestamp
        this.history.timestamps.push(this.state.timestamp);

        // Add densities for each lane
        for (const lane of this.lanes) {
            this.history.densities[lane].push(this.state.densities[lane]);
        }

        // Add green times for each lane
        for (const lane of this.lanes) {
            this.history.greenTimes[lane].push(this.state.greenTimes[lane]);
        }

        // Calculate and store efficiency
        const efficiency = this.calculateEfficiency();
        this.history.efficiency.push(efficiency);

        // Maintain max size (rolling window)
        if (this.history.timestamps.length > this.maxHistoryPoints) {
            this.history.timestamps.shift();
            for (const lane of this.lanes) {
                this.history.densities[lane].shift();
                this.history.greenTimes[lane].shift();
            }
            this.history.efficiency.shift();
        }
    }

    /**
     * Update metric card displays
     * Updates: Cycle count, Latency, Avg Density, Efficiency
     * @private
     */
    updateMetrics() {
        // Update cycle count
        const cycleEl = document.getElementById('metric-cycle');
        if (cycleEl) {
            cycleEl.textContent = this.state.cycleCount;
        }

        // Update latency
        const latencyEl = document.getElementById('metric-latency');
        if (latencyEl) {
            latencyEl.textContent = this.state.latency.toFixed(2) + ' ms';
        }

        // Update average density
        const avgDensity = Object.values(this.state.densities).reduce((a, b) => a + b) / 4;
        const densityEl = document.getElementById('metric-avgdensity');
        if (densityEl) {
            densityEl.textContent = avgDensity.toFixed(1) + '%';
        }

        // Update efficiency score
        const efficiency = this.calculateEfficiency();
        const efficiencyEl = document.getElementById('metric-efficiency');
        if (efficiencyEl) {
            efficiencyEl.textContent = efficiency.toFixed(0);
        }
    }

    /**
     * Calculate efficiency metric (0-100)
     * Measures how well green-time allocation matches traffic density
     * 
     * @returns {number} Efficiency score
     */
    calculateEfficiency() {
        let totalScore = 0;
        const cycleLength = 60;  // Hardcoded for now, should come from controller

        for (const lane of this.lanes) {
            const density = this.state.densities[lane];
            const greenTime = this.state.greenTimes[lane];

            // Normalize to 0-1 scale
            const densityRatio = density / 100;
            const greenRatio = greenTime / cycleLength;

            // Score: minimum of the two (penalizes mismatch)
            const alignment = Math.min(densityRatio, greenRatio) / 
                             Math.max(densityRatio, greenRatio + 0.01);  // Avoid division by zero
            totalScore += alignment;
        }

        return (totalScore / this.lanes.length) * 100;
    }

    /**
     * Initialize Chart.js instances
     * Creates 4 charts: density, green time, performance, efficiency
     * @private
     */
    initCharts() {
        const chartDefaults = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                filler: true
            }
        };

        // Chart 1: Density Trend (Line Chart)
        const densityCtx = document.getElementById('densityTrendChart');
        if (densityCtx) {
            this.charts.density = new Chart(densityCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'North',
                            data: [],
                            borderColor: '#FF6384',
                            backgroundColor: 'rgba(255, 99, 132, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'South',
                            data: [],
                            borderColor: '#36A2EB',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'East',
                            data: [],
                            borderColor: '#FFCE56',
                            backgroundColor: 'rgba(255, 206, 86, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'West',
                            data: [],
                            borderColor: '#4BC0C0',
                            backgroundColor: 'rgba(75, 192, 192, 0.1)',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        y: { min: 0, max: 100, title: { display: true, text: 'Density (%)' } }
                    }
                }
            });
        }

        // Chart 2: Green Time Allocation (Bar Chart)
        const greenTimeCtx = document.getElementById('greenTimeChart');
        if (greenTimeCtx) {
            this.charts.greenTime = new Chart(greenTimeCtx, {
                type: 'bar',
                data: {
                    labels: ['North', 'South', 'East', 'West'],
                    datasets: [{
                        label: 'Green Time (seconds)',
                        data: [10, 10, 10, 10],
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
                    }]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        y: { beginAtZero: true, max: 60 }
                    }
                }
            });
        }

        // Chart 3: Lane Performance (Stacked Bar)
        const performanceCtx = document.getElementById('performanceChart');
        if (performanceCtx) {
            this.charts.performance = new Chart(performanceCtx, {
                type: 'bar',
                data: {
                    labels: ['North', 'South', 'East', 'West'],
                    datasets: [
                        {
                            label: 'Density',
                            data: [0, 0, 0, 0],
                            backgroundColor: 'rgba(100, 100, 100, 0.3)'
                        },
                        {
                            label: 'Green Time Ratio',
                            data: [0, 0, 0, 0],
                            backgroundColor: 'rgba(75, 192, 192, 0.6)'
                        }
                    ]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, max: 100 }
                    }
                }
            });
        }

        // Chart 4: Efficiency Over Time (Line Chart)
        const efficiencyCtx = document.getElementById('efficiencyChart');
        if (efficiencyCtx) {
            this.charts.efficiency = new Chart(efficiencyCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Efficiency Score',
                        data: [],
                        borderColor: '#7C3AED',
                        backgroundColor: 'rgba(124, 58, 237, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        y: { min: 0, max: 100 }
                    }
                }
            });
        }

        console.log('[Dashboard] Charts initialized');
    }

    /**
     * Update all chart data
     * @private
     */
    updateCharts() {
        if (!this.charts.density) return;

        const timeLabels = this.history.timestamps.map(t => 
            t.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );

        // Update Density Trend Chart
        if (this.charts.density) {
            this.charts.density.data.labels = timeLabels;
            for (let i = 0; i < this.lanes.length; i++) {
                this.charts.density.data.datasets[i].data = this.history.densities[this.lanes[i]];
            }
            this.charts.density.update('none');  // 'none' = no animation
        }

        // Update Green Time Chart
        if (this.charts.greenTime) {
            this.charts.greenTime.data.datasets[0].data = [
                this.state.greenTimes.north,
                this.state.greenTimes.south,
                this.state.greenTimes.east,
                this.state.greenTimes.west
            ];
            this.charts.greenTime.update('none');
        }

        // Update Performance Chart
        if (this.charts.performance) {
            const densityData = this.lanes.map(lane => this.state.densities[lane]);
            const greenRatio = this.lanes.map(lane => (this.state.greenTimes[lane] / 60) * 100);
            
            this.charts.performance.data.datasets[0].data = densityData;
            this.charts.performance.data.datasets[1].data = greenRatio;
            this.charts.performance.update('none');
        }

        // Update Efficiency Chart
        if (this.charts.efficiency) {
            this.charts.efficiency.data.labels = timeLabels;
            this.charts.efficiency.data.datasets[0].data = this.history.efficiency;
            this.charts.efficiency.update('none');
        }
    }

    /**
     * Update intersection visualization (SVG) and status table
     * @private
     */
    updateIntersectionView() {
        // Update SVG signals (change colors based on signal state)
        for (const lane of this.lanes) {
            const signalEl = document.getElementById(`signal-${lane}`);
            if (signalEl) {
                const color = this.state.signals[lane] === 'GREEN' ? '#10B981' : '#EF4444';
                signalEl.setAttribute('fill', color);
            }
        }

        // Update status table
        const tbody = document.getElementById('intersectionTableBody');
        if (tbody) {
            tbody.innerHTML = this.lanes.map(lane => `
                <tr>
                    <td class="lane-name">${lane.charAt(0).toUpperCase() + lane.slice(1)}</td>
                    <td class="density">${this.state.densities[lane].toFixed(1)}%</td>
                    <td class="green-time">${this.state.greenTimes[lane]}s</td>
                    <td class="signal">
                        <span class="signal-light signal-${this.state.signals[lane]}">●</span>
                        ${this.state.signals[lane]}
                    </td>
                </tr>
            `).join('');
        }
    }

    /**
     * Update lane rankings in analysis panel
     * Ranks lanes by efficiency (density-green alignment)
     * @private
     */
    updateLaneRankings() {
        const rankings = [];
        
        // Calculate efficiency for each lane
        for (const lane of this.lanes) {
            const density = this.state.densities[lane];
            const greenTime = this.state.greenTimes[lane];
            const cycleLength = 60; // From controller config
            
            const densityRatio = density / 100;
            const greenRatio = greenTime / cycleLength;
            
            // Efficiency: how well green time matches density
            const alignment = Math.min(densityRatio, greenRatio) / 
                            (Math.max(densityRatio, greenRatio) + 0.01);
            const efficiency = alignment * 100;
            
            rankings.push({
                lane: lane,
                efficiency: efficiency
            });
        }
        
        // Sort by efficiency (descending)
        rankings.sort((a, b) => b.efficiency - a.efficiency);
        
        // Update DOM
        const container = document.getElementById('laneRankings');
        if (container) {
            container.innerHTML = rankings.map((item, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '4️⃣';
                const laneName = item.lane.charAt(0).toUpperCase() + item.lane.slice(1);
                
                return `
                    <div class="rank-item">
                        <span class="rank-number">${medal} ${index + 1}</span>
                        <span class="rank-name">${laneName}</span>
                        <span class="rank-value">${item.efficiency.toFixed(0)}%</span>
                    </div>
                `;
            }).join('');
        }

        this.updateSummaryMetrics(rankings);
    }


    /**
     * Reset dashboard to initial state
     */
    reset() {
        this.state = {
            cycleCount: 0,
            densities: { north: 0, south: 0, east: 0, west: 0 },
            greenTimes: { north: 10, south: 10, east: 10, west: 10 },
            signals: { north: 'RED', south: 'RED', east: 'RED', west: 'RED' },
            timestamp: new Date(),
            latency: 0,
            messagesProcessed: 0
        };

        this.history = {
            timestamps: [],
            densities: { north: [], south: [], east: [], west: [] },
            greenTimes: { north: [], south: [], east: [], west: [] },
            efficiency: []
        };

        this.updateMetrics();
        this.updateCharts();
        this.updateIntersectionView();

        console.log('[Dashboard] Reset complete');
    }

    /**
     * Export current data as CSV
     * @returns {string} CSV formatted data
     */
    exportAsCSV() {
        let csv = 'Timestamp,North Density,South Density,East Density,West Density,North Green,South Green,East Green,West Green,Efficiency\n';
        
        for (let i = 0; i < this.history.timestamps.length; i++) {
            const time = this.history.timestamps[i].toISOString();
            const row = [
                time,
                this.history.densities.north[i],
                this.history.densities.south[i],
                this.history.densities.east[i],
                this.history.densities.west[i],
                this.history.greenTimes.north[i],
                this.history.greenTimes.south[i],
                this.history.greenTimes.east[i],
                this.history.greenTimes.west[i],
                this.history.efficiency[i]
            ];
            csv += row.join(',') + '\n';
        }

        return csv;
    }

    /**
     * Export current data as JSON
     * @returns {string} JSON formatted data
     */
    exportAsJSON() {
        return JSON.stringify({
            state: this.state,
            history: this.history,
            exportedAt: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Get dashboard status for debugging
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            currentCycle: this.state.cycleCount,
            historySize: this.history.timestamps.length,
            chartsInitialized: Object.values(this.charts).filter(c => c !== null).length,
            efficiency: this.calculateEfficiency().toFixed(2)
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}