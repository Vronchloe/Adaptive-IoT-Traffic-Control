/**
 * Interactions.js - User interface event handling (UPDATED)
 * 
 * NEW FEATURES:
 * - Play button (starts new simulation with duration)
 * - Pause button (pauses and changes to Resume)
 * - Resume button (resumes and changes to Pause)
 * - Stop button (stops simulation)
 * - Reset button (clears and resets)
 * - Duration input for timed simulations
 * - Lane rankings display in metrics panel
 */

class InteractionManager {
    /**
     * Initialize interaction manager
     * 
     * @param {Simulator} simulator - Simulator instance
     * @param {Dashboard} dashboard - Dashboard instance
     * @param {StorageManager} storage - Storage manager instance
     */
    constructor(simulator, dashboard, storage) {
        this.simulator = simulator;
        this.dashboard = dashboard;
        this.storage = storage;
        this._timerInterval = null;

        this.attachEventListeners();
        this.loadScenariosIntoDropdown();
        this.updatePlayButtonState();
        console.log('[InteractionManager] Initialized');
    }

    /**
     * Attach all event listeners to DOM elements
     * @private
     */
    attachEventListeners() {
        // Play/Pause/Resume Controls (NEW LOGIC)
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.handlePlay());
        }

        const pauseResumeBtn = document.getElementById('pauseResumeBtn');
        if (pauseResumeBtn) {
            pauseResumeBtn.addEventListener('click', () => this.handlePauseResume());
        }

        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.handleStop());
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset());
        }

        const stepBtn = document.getElementById('stepBtn');
        if (stepBtn) {
            stepBtn.addEventListener('click', () => this.handleStep());
        }

        // Speed Control
        const speedSelect = document.getElementById('speedControl');
        if (speedSelect) {
            speedSelect.addEventListener('change', (e) => {
                this.simulator.setSpeed(parseFloat(e.target.value));
            });
        }

        // Duration Input (NEW)
        const durationInput = document.getElementById('simulationDuration');
        if (durationInput) {
            durationInput.addEventListener('change', (e) => {
                const duration = parseInt(e.target.value) || 0;
                console.log(`[InteractionManager] Duration set to ${duration}s`);
            });
        }

        // Density Sliders
        const lanes = ['north', 'south', 'east', 'west'];
        for (const lane of lanes) {
            const slider = document.getElementById(`density${lane.charAt(0).toUpperCase() + lane.slice(1)}`);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    this.handleDensityChange(lane, e.target.value);
                    this.updateDensityDisplay(lane, e.target.value);
                });
            }
        }

        // Configuration Inputs
        const cycleInput = document.getElementById('cycleLength');
        if (cycleInput) {
            cycleInput.addEventListener('change', (e) => {
                this.simulator.controller.updateConfig({ cycleLength: parseInt(e.target.value) });
            });
        }

        const minGreenInput = document.getElementById('minGreen');
        if (minGreenInput) {
            minGreenInput.addEventListener('change', (e) => {
                this.simulator.controller.updateConfig({ minGreen: parseInt(e.target.value) });
            });
        }

        const maxGreenInput = document.getElementById('maxGreen');
        if (maxGreenInput) {
            maxGreenInput.addEventListener('change', (e) => {
                this.simulator.controller.updateConfig({ maxGreen: parseInt(e.target.value) });
            });
        }

        // Scenario Management
        const saveScenarioBtn = document.getElementById('saveScenarioBtn');
        if (saveScenarioBtn) {
            saveScenarioBtn.addEventListener('click', () => this.handleSaveScenario());
        }

        const loadScenarioBtn = document.getElementById('loadScenarioBtn');
        if (loadScenarioBtn) {
            loadScenarioBtn.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.handleLoadScenario(e.target.value);
                }
            });
        }

        const deleteScenarioBtn = document.getElementById('deleteScenarioBtn');
        if (deleteScenarioBtn) {
            deleteScenarioBtn.addEventListener('click', () => this.handleDeleteScenario());
        }

        // Export Functions
        const exportCSVBtn = document.getElementById('exportCSVBtn');
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => this.handleExportCSV());
        }

        const exportJSONBtn = document.getElementById('exportJSONBtn');
        if (exportJSONBtn) {
            exportJSONBtn.addEventListener('click', () => this.handleExportJSON());
        }

        const exportScreenshotBtn = document.getElementById('exportScreenshotBtn');
        if (exportScreenshotBtn) {
            exportScreenshotBtn.addEventListener('click', () => this.handleExportScreenshot());
        }

        // ---------- Info / About / Made By buttons ----------
        const aboutBtn = document.getElementById('aboutBtn');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', () => this.toggleInfoWindow('about'));
        }
        
        const referenceBtn = document.getElementById('referenceBtn');
        if (referenceBtn) {
            referenceBtn.addEventListener('click', () => this.toggleInfoWindow('reference'));
        }

        const madeByBtn = document.getElementById('madeByBtn');
        if (madeByBtn) {
            madeByBtn.addEventListener('click', () => this.toggleInfoWindow('madeby'));
        }

        // Info window close button
        const infoClose = document.getElementById('infoWindowClose');
        if (infoClose) {
            infoClose.addEventListener('click', () => this.hideInfoWindow());
        }
    }

    /**
     * Handle Play button - Start new simulation
     * Reads duration from input if set
     * @private
     */
    handlePlay() {
        const duration = parseInt(document.getElementById('simulationDuration')?.value || 0);
        this.simulator.start(duration);
        this.startTimerUpdates();  // ← ADD THIS LINE
        this.updatePlayButtonState();
        console.log(`[InteractionManager] Play clicked, duration: ${duration}s`);
    }

    /**
     * Handle Pause/Resume button - Toggle between states
     * Button changes text and function based on state
     * @private
     */
    handlePauseResume() {
        if (!this.simulator.isRunning) {
            console.log('[InteractionManager] Simulation not running');
            return;
        }

        if (this.simulator.isPaused) {
            // Currently paused - resume
            this.simulator.resume();
            console.log('[InteractionManager] Resumed');
        } else {
            // Currently running - pause
            this.simulator.pause();
            console.log('[InteractionManager] Paused');
        }

        this.updatePlayButtonState();
    }

    /**
     * Handle Stop button - Stop and don't allow resume
     * @private
     */
    handleStop() {
        this.simulator.stop();
        this.stopTimerUpdates();
        this.updatePlayButtonState();
        console.log('[InteractionManager] Stopped');
    }

    /**
     * Handle Reset button - Clear everything and go to initial state
     * @private
     */
    handleReset() {
        this.simulator.reset();
        this.stopTimerUpdates();
        this.updatePlayButtonState();
        console.log('[InteractionManager] Reset');
    }

    /**
     * Handle Step button - Advance one cycle manually while paused
     * @private
     */
    handleStep() {
        if (!this.simulator.isPaused || !this.simulator.isRunning) {
            console.log('[InteractionManager] Can only step while paused');
            return;
        }
        this.simulator.step();
        console.log('[InteractionManager] Stepped');
    }

    /**
     * Update button states based on simulator state
     * Changes Pause/Resume button text and enables/disables controls
     * @private
     */
    updatePlayButtonState() {
        const playBtn = document.getElementById('playBtn');
        const pauseResumeBtn = document.getElementById('pauseResumeBtn');
        const stopBtn = document.getElementById('stopBtn');
        const stepBtn = document.getElementById('stepBtn');

        // Update Pause/Resume button
        if (pauseResumeBtn) {
            if (this.simulator.isRunning) {
                pauseResumeBtn.disabled = false;
                
                if (this.simulator.isPaused) {
                    pauseResumeBtn.innerHTML = '▶️ Resume';
                    pauseResumeBtn.title = 'Resume the paused simulation';
                } else {
                    pauseResumeBtn.innerHTML = '⏸️ Pause';
                    pauseResumeBtn.title = 'Pause the running simulation';
                }
            } else {
                pauseResumeBtn.disabled = true;
                pauseResumeBtn.innerHTML = '⏸️ Pause';
            }
        }

        // Update Play button
        if (playBtn) {
            if (this.simulator.isRunning) {
                playBtn.disabled = true;
                playBtn.style.opacity = '0.5';
            } else {
                playBtn.disabled = false;
                playBtn.style.opacity = '1';
            }
        }

        // Update Stop button
        if (stopBtn) {
            stopBtn.disabled = !this.simulator.isRunning;
        }

        // Update Step button
        if (stepBtn) {
            stepBtn.disabled = !(this.simulator.isRunning && this.simulator.isPaused);
        }

        // Update time display
        this.updateRemainingTimeDisplay();
    }

    startTimerUpdates() {
        // don't create multiple intervals
        if (this._timerInterval) return;

        // update immediately then start frequent updates
        this.updateRemainingTimeDisplay();
        this._timerInterval = setInterval(() => {
            this.updateRemainingTimeDisplay();
        }, 100);
    }

    stopTimerUpdates() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
        // final update so UI is consistent (shows "—" when stopped)
        this.updateRemainingTimeDisplay();
    }

    /**
     * Single source-of-truth time renderer (displays remaining or ∞ or —)
     */
    updateRemainingTimeDisplay() {
        const timeEl = document.getElementById('simulationTime');
        const remainingEl = document.getElementById('remainingTimeValue');
        if (!timeEl || !remainingEl) return;

        const totalDuration = this.simulator.simulationDurationSeconds;
        const isRunning = this.simulator.isRunning;

        if (!isRunning) {
            remainingEl.textContent = '—';
            timeEl.classList.remove('time-critical', 'time-ended');
            return;
        }

        if (totalDuration === 0) {
            remainingEl.textContent = '∞';
            timeEl.classList.remove('time-critical', 'time-ended');
            return;
        }

        const remaining = this.simulator.getRemainingTime();
        remainingEl.textContent = Math.max(0, remaining).toFixed(1);

        const percentageRemaining = (remaining / totalDuration) * 100;
        if (remaining <= 0) {
            timeEl.classList.add('time-ended');
            timeEl.classList.remove('time-critical');
        } else if (percentageRemaining <= 10) {
            timeEl.classList.add('time-critical');
            timeEl.classList.remove('time-ended');
        } else {
            timeEl.classList.remove('time-critical', 'time-ended');
        }
    }

    /**
     * Handle density slider change
     * @private
     */
    handleDensityChange(lane, value) {
        const percent = Math.max(0, Math.min(100, Number(value)));
        if (this.simulator.sensors && this.simulator.sensors[lane]) {
            this.simulator.sensors[lane].setDensity(percent);
        }
    }

    /**
     * Update density display label
     * @private
     */
    updateDensityDisplay(lane, value) {
        const displayEl = document.getElementById(`density${lane.charAt(0).toUpperCase() + lane.slice(1)}Display`);
        if (displayEl) {
            displayEl.textContent = value + '%';
        }
    }

    /**
     * Handle save scenario
     * @private
     */
    handleSaveScenario() {
        const name = prompt('Enter scenario name:');
        if (!name) return;

        const scenario = {
            name,
            timestamp: new Date().toISOString(),
            state: this.dashboard.state,
            history: this.dashboard.history,
            config: this.simulator.controller.getConfig(),
            simulationDuration: this.simulator.simulationDurationSeconds
        };

        this.storage.saveScenario(scenario);
        this.loadScenariosIntoDropdown();
        console.log(`[InteractionManager] Scenario saved: ${name}`);
    }

    /**
     * Handle load scenario
     * @private
     */
    handleLoadScenario(name) {
        const scenario = this.storage.loadScenario(name);
        if (!scenario) {
            alert('Scenario not found');
            return;
        }

        // Prefer 'state' (saved by saveScenario), fall back to 'stateSnapshot'
        const savedState = scenario.state || scenario.stateSnapshot || null;

        // Restore controller config (if present)
        if (scenario.config) {
            if (this.simulator.controller.updateConfig) {
                this.simulator.controller.updateConfig(scenario.config);
            } else {
                this.simulator.controller.cycleLength = scenario.config.cycleLength;
                this.simulator.controller.minGreen = scenario.config.minGreen;
                this.simulator.controller.maxGreen = scenario.config.maxGreen;
            }
        }

        // Restore duration
        this.simulator.simulationDurationSeconds = scenario.simulationDuration || 0;

        // Restore history and state
        if (scenario.history) {
            this.dashboard.history = scenario.history;
        }
        if (savedState) {
            this.dashboard.state = savedState;
        }

        // Sync controls (cycle/min/max/duration)
        const cycleInput = document.getElementById('cycleLength');
        const minGreenInput = document.getElementById('minGreen');
        const maxGreenInput = document.getElementById('maxGreen');
        const durationInput = document.getElementById('simulationDuration');

        if (cycleInput && scenario.config?.cycleLength != null) cycleInput.value = scenario.config.cycleLength;
        if (minGreenInput && scenario.config?.minGreen != null) minGreenInput.value = scenario.config.minGreen;
        if (maxGreenInput && scenario.config?.maxGreen != null) maxGreenInput.value = scenario.config.maxGreen;
        if (durationInput && (scenario.simulationDuration != null)) durationInput.value = scenario.simulationDuration;

        // Sync density sliders — accept densities stored either as 0..1 or 0..100
        const lanes = ['north','south','east','west'];
        const densities = (savedState && savedState.densities) || {};

        lanes.forEach(lane => {
            const slider = document.getElementById(`density${lane.charAt(0).toUpperCase() + lane.slice(1)}`);
            const display = document.getElementById(`density${lane.charAt(0).toUpperCase() + lane.slice(1)}Display`);
            const density = densities[lane];

            if (slider && density != null) {
                // if density looks normalized (<=1) convert to percent
                const percent = density <= 1 ? Math.round(density * 100) : Math.round(density);
                slider.value = percent;
                if (display) display.textContent = `${percent}%`;

                // keep sensor in sync (sensor expects percent 0..100 from our earlier change)
                if (this.simulator.sensors && this.simulator.sensors[lane]) {
                    this.simulator.sensors[lane].setDensity(percent);
                }
            }
        });

        // Update visuals
        this.dashboard.updateMetrics();
        this.dashboard.updateCharts();
        this.dashboard.updateIntersectionView();
        if (this.dashboard.updateLaneRankings) {
            this.dashboard.updateLaneRankings();
        }

        this.lastLoadedScenarioName = name;
        this.updateRemainingTimeDisplay();
        console.log(`[InteractionManager] Scenario loaded: ${name}`);
    }

    /**
     * Handle delete scenario
     * @private
     */
    handleDeleteScenario() {
        const dropdown = document.getElementById('loadScenarioBtn');
        if (!dropdown || !dropdown.value) {
            alert('No scenario selected to delete');
            return;
        }

        const name = dropdown.value;
        if (confirm(`Delete scenario "${name}"?`)) {
            this.storage.deleteScenario(name);
            this.loadScenariosIntoDropdown();
            console.log(`[InteractionManager] Scenario deleted: ${name}`);
        }
    }

    /**
     * Load scenarios into dropdown from storage
     * @private
     */
    loadScenariosIntoDropdown() {
        const dropdown = document.getElementById('loadScenarioBtn');
        if (!dropdown) return;

        const scenarios = this.storage.getAllScenarios();
        dropdown.innerHTML = '<option value="">-- Load Scenario --</option>';

        for (const scenario of scenarios) {
            const option = document.createElement('option');
            option.value = scenario.name;
            option.textContent = `${scenario.name} (${new Date(scenario.timestamp).toLocaleDateString()})`;
            dropdown.appendChild(option);
        }
    }

    /**
     * Handle CSV export
     * @private
     */
    handleExportCSV() {
        const csv = this.dashboard.exportAsCSV();
        this.downloadFile(csv, 'simulation_data.csv', 'text/csv');
    }

    /**
     * Handle JSON export
     * @private
     */
    handleExportJSON() {
        const json = this.dashboard.exportAsJSON();
        this.downloadFile(json, 'simulation_data.json', 'application/json');
    }

    /**
     * Handle screenshot export
     * @private
     */
    handleExportScreenshot() {
        if (typeof html2canvas === 'undefined') {
            alert('Screenshot library not loaded. Please refresh and try again.');
            return;
        }

        const dashboardEl = document.getElementById('dashboard');
        if (!dashboardEl) {
            alert('Dashboard not found');
            return;
        }

        html2canvas(dashboardEl, {
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `traffic_dashboard_${new Date().toISOString().slice(0, 10)}.png`;
            link.click();
            console.log('[InteractionManager] Screenshot exported');
        }).catch(err => {
            console.error('Screenshot export failed:', err);
            alert('Failed to export screenshot');
        });
    }

    /**
     * Download file helper
     * @private
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        console.log(`[InteractionManager] File exported: ${filename}`);
    }

    /**
     * Toggle the info window.
     * If same section is already visible -> collapse.
     * If different section -> replace content.
     * @param {string} section - 'about' | 'reference' | 'madeby'
     */
    toggleInfoWindow(section) {
        const win = document.getElementById('infoWindow');
        const body = document.getElementById('infoWindowBody');
        const title = document.getElementById('infoWindowTitle');

        if (!win || !body || !title) return;

        // If currently visible and same section, collapse
        if (!win.classList.contains('hidden') && this._activeInfoSection === section) {
            this.hideInfoWindow();
            return;
        }

        // Otherwise render requested section
        this._activeInfoSection = section;
        win.classList.remove('hidden');
        win.setAttribute('aria-hidden', 'false');

        // Update tab pressed states for accessibility / visuals
        ['aboutBtn','referenceBtn','madeByBtn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.setAttribute('aria-pressed', id.startsWith(section) ? 'true' : 'false');
        });

        if (section === 'about') {
            title.textContent = 'About this Project';

            // Show temporary loading message
            body.innerHTML = `<p>Loading guide...</p>`;

            // Fetch the Markdown file
            fetch('APP_USER_GUIDE')     // The file you uploaded into /mnt/data
                .then(res => res.text())
                .then(md => {
                    const html = this.markdownToHtml(md);
                    body.innerHTML = html;
                })
                .catch(err => {
                    body.innerHTML = `<p style="color:red;">Failed to load guide.</p>`;
                    console.error("Markdown load error:", err);
                });
        } else if (section === 'reference') {
            title.textContent = 'Reference & Video';
            body.innerHTML = `
                <strong>📘 Book Inspiration</strong><br>
                <em>"Smart Cities: Big Data, Civic Hackers, and the Quest for a New Utopia"</em> by Anthony M. Townsend<br><br>
                "We should not underestimate the benefits of technology that effectively manage traffic 
                flows and energy loads; monitor and proactively react to changing levels in water basins, 
                rivers and ocean fronts; and otherwise make our cities work better. This frees it to serve 
                the needs of the 'autocatalytic city' ... a place where supple adaptive processes are 
                founded on accurate, real-time local intelligence, citydwellers are empowered to respond 
                appropriately to highly dynamic conditions, and emergent urban order is shaped by the 
                feedback of millions of daily choices."<br><br>
                <hr>
                <strong>🎥 Animated Video Explanation</strong><br><br>
                <div class="video-box">
                    <iframe
                        src="https://www.youtube.com/embed/OnjX0O9dPMc?autoplay=1&mute=1"
                        title="Adaptive IoT Traffic Systems"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen>
                    </iframe>
                </div>
                <br>

                <hr style="border:1px dotted currentColor;">

                <h4>📚 Research Papers & Articles</h4>
                <ul style="text-align:left; display:inline-block; max-width:90%;">
                    <li><b>I. Zrigui et al., "Adaptive Traffic Signal Control Using AI and Distributed Messaging," JATIT, 2025.</b><br>
                        Proposes a real-time urban traffic control system using sensor data, adaptive algorithms, and an MQTT-based messaging infrastructure for efficient, scalable communication between modules.<br>
                        <a href="http://www.jatit.org/volumes/Vol103No8/35Vol103No8.pdf" target="_blank">[Read PDF]</a>
                    </li><br>
                    <li><b>U. K. Lilhore et al., "Design and Implementation of an ML and IoT Based Adaptive Traffic-management System," 2022.</b><br>
                        Presents an IoT-powered adaptive traffic system using machine learning for dynamic signal control, supporting real-time responses to traffic conditions.<br>
                        <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9024789/" target="_blank">[Read article]</a>
                    </li><br>
                    <li><b>A. Agarwal et al., "Fusing crowdsourced data to an adaptive wireless traffic signal control architecture," Elsevier, 2024.</b><br>
                        Discusses how wireless protocols and distributed sensor networks can feed adaptive traffic controllers to optimize flows in real time.<br>
                        <a href="https://www.sciencedirect.com/science/article/abs/pii/S2542660524001100" target="_blank">[Read abstract]</a>
                    </li><br>
                    <li><b>M. Saleem et al., "Smart cities: Fusion-based intelligent traffic congestion control system for vehicular networks," ScienceDirect, 2022.</b><br>
                        Describes ML-powered smart city traffic systems that use dense, real-time sensor inputs for congestion mitigation and route optimization.<br>
                        <a href="https://www.sciencedirect.com/science/article/pii/S111086652200024X" target="_blank">[Read article]</a>
                    </li><br>
                    <li><b>Anthony M. Townsend, "Smart Cities: Big Data, Civic Hackers, and the Quest for a New Utopia," 2013.</b><br>
                        A foundational book on real-time adaptive city infrastructure and the transformative power of connected, sensor-driven feedback systems.<br>
                        <a href="https://ssir.org/books/excerpts/entry/smart_cities_big_data_civic_hackers_and_the_quest_for_a_new_utopia" target="_blank">[More info]</a>
                    </li><br>
                </ul>

                <hr style="border:1px dotted currentColor;">

                <h4>🧩 Practical and Technical Sources</h4>
                <ul style="text-align:left; display:inline-block; max-width:90%;">
                    <li><b>Eclipse Mosquitto Documentation</b><br>
                        Official Guide to open-source MQTT Broker Technology (used as the backbone for project messaging).<br>
                        <a href="https://mosquitto.org/documentation/" target="_blank">[Mosquitto Docs]</a>
                    </li><br>
                    <li><b>Flask-SocketIO Documentation</b><br>
                        How to build real-time dashboards that update with backend events using Python (core of your project’s web interface).<br>
                        <a href="https://flask-socketio.readthedocs.io/" target="_blank">[Flask-SocketIO]</a>
                    </li>
                </ul>
            `;
        } else if (section === 'madeby') {
            title.textContent = 'Made By';
            body.innerHTML = `
                <div class="madeby-grid">
                    <div class="madeby-card">
                        <img src="images/arman.jpg" alt="Arman">
                        <div class="name">Arman Ranjan</div>
                        <div class="role">Project Leader & Developer</div>
                    </div>

                    <div class="madeby-card">
                        <img src="images/professor.jpg" alt="Professor">
                        <div class="name">Dr. Swaminathan Annadurai</div>
                        <div class="role">Supervisor and Guide</div>
                    </div>
                </div>

                <p style="margin-top:12px; font-size:0.92rem; color:var(--color-text-secondary);">
                    A big thanks to the supervisor for guidance and opportunity to develop this project. 
                </p>
            `;
        } else {
            // default fallback
            title.textContent = 'Info';
            body.innerHTML = `<p>No information available.</p>`;
        }
    }

    hideInfoWindow() {
        const win = document.getElementById('infoWindow');
        if (!win) return;
        win.classList.add('hidden');
        win.setAttribute('aria-hidden', 'true');
        this._activeInfoSection = null;

        // reset pressed states
        ['aboutBtn','referenceBtn','madeByBtn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.setAttribute('aria-pressed', 'false');
        });
    }

    markdownToHtml(md) {
        if (!md) return "";

        let html = md;

        // --------------------------
        // Escape HTML
        // --------------------------
        html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // --------------------------
        // Code blocks ```...```
        // --------------------------
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
            return `<pre class="md-code-block"><code>${code}</code></pre>`;
        });

        // Inline code `code`
        html = html.replace(/`([^`]+)`/g, `<code class="md-inline-code">$1</code>`);

        // --------------------------
        // Headings
        // --------------------------
        html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
        html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
        html = html.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
        html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
        html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
        html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

        // --------------------------
        // Bold / Italic / Underline
        // --------------------------
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
        html = html.replace(/__(.*?)__/g, "<u>$1</u>");

        // --------------------------
        // Blockquotes
        // --------------------------
        html = html.replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>");

        // --------------------------
        // Horizontal Rules
        // --------------------------
        html = html.replace(/^(---|\*\*\*|___)$/gm, "<hr>");

        // --------------------------
        // Images ![alt](url)
        // --------------------------
        html = html.replace(/!\[(.*?)\]\((.*?)\)/g, `<img alt="$1" src="$2" class="md-image"/>`);

        // --------------------------
        // Links [text](url)
        // --------------------------
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, `<a href="$2" target="_blank">$1</a>`);

        // --------------------------
        // Unordered lists
        // --------------------------
        html = html.replace(/^\s*[-+*] (.*)$/gm, "<li>$1</li>");
        html = html.replace(/(<li>[\s\S]*?<\/li>)/gm, "<ul>$1</ul>");

        // --------------------------
        // Ordered lists
        // --------------------------
        html = html.replace(/^\s*\d+\. (.*)$/gm, "<li>$1</li>");
        html = html.replace(/(<li>[\s\S]*?<\/li>)/gm, "<ol>$1</ol>");

        // --------------------------
        // Tables
        // --------------------------
        const tableRegex = /^\|(.+)\|\s*\n\|([-\s\|:]+)\|\s*\n((\|.*\|\s*\n)*)/gm;
        html = html.replace(tableRegex, (match, headerRow, separator, bodyRows) => {
            const headers = headerRow.split("|").map(h => `<th>${h.trim()}</th>`).join("");
            const rows = bodyRows
                .trim()
                .split("\n")
                .map(r => {
                    const cols = r.split("|").map(c => `<td>${c.trim()}</td>`).join("");
                    return `<tr>${cols}</tr>`;
                })
                .join("");

            return `
                <table class="md-table">
                    <thead><tr>${headers}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        });

        // --------------------------
        // Paragraphs
        // Only wrap lines not already HTML elements
        // --------------------------
        html = html.replace(/^(?!<h|<ul|<ol|<li|<img|<blockquote|<pre|<hr|<table|<tr|<td|<th)(.+)$/gm,
            "<p>$1</p>"
        );

        return html;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InteractionManager;
}
