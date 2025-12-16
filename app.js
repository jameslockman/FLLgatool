// Google Sheets data loader and tournament schedule viewer

class TournamentScheduleViewer {
    constructor() {
        this.currentMatchIndex = 0;
        this.matches = [];
        this.teams = [];
        this.sheetData = null;
        this.sheetUrl = '';
        this.apiKey = '';
        
        this.initializeEventListeners();
        this.loadSavedSettings();
        
        // Check for API key after DOM is ready and config.js has loaded
        // Use multiple checks to ensure config.js has executed
        // Check immediately
        this.checkProxyAvailability();
        
        // Check after a short delay
        setTimeout(() => {
            this.checkProxyAvailability();
        }, 100);
        
        // Check after requestAnimationFrame
        requestAnimationFrame(() => {
            setTimeout(() => {
                this.checkProxyAvailability();
                this.displayLastLoadStatus();
            }, 200);
        });
        
        // Also check after a longer delay in case config.js loads slowly
        setTimeout(() => {
            this.checkProxyAvailability();
        }, 1000);
        
        // Listen for when config.js script loads
        const configScript = document.querySelector('script[src="config.js"]');
        if (configScript) {
            configScript.addEventListener('load', () => {
                console.log('config.js loaded successfully');
                setTimeout(() => {
                    this.checkProxyAvailability();
                }, 50);
            });
            configScript.addEventListener('error', () => {
                console.warn('config.js failed to load - API key field will be visible');
                // Make sure API key field is visible if config.js fails to load
                const apiKeyGroup = document.getElementById('apiKeyGroup');
                if (apiKeyGroup) {
                    apiKeyGroup.style.display = '';
                }
            });
        } else {
            console.warn('config.js script tag not found in HTML');
        }
        
        // Also check periodically in case config.js loads very late
        let checkCount = 0;
        const maxChecks = 10;
        const checkInterval = setInterval(() => {
            checkCount++;
            if (window.API_KEY || checkCount >= maxChecks) {
                this.checkProxyAvailability();
                if (window.API_KEY || checkCount >= maxChecks) {
                    clearInterval(checkInterval);
                }
            }
        }, 200);
    }

    displayLastLoadStatus() {
        // Show last load time if data was previously loaded
        const lastLoad = localStorage.getItem('fll_last_load');
        if (lastLoad && (this.matches.length > 0 || this.teams.length > 0)) {
            const loadDate = new Date(lastLoad);
            const formattedDate = loadDate.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const infoText = document.querySelector('.info-text');
            if (infoText) {
                const existingStatus = document.getElementById('loadStatus');
                if (existingStatus) {
                    existingStatus.remove();
                }
                
                const statusDiv = document.createElement('div');
                statusDiv.id = 'loadStatus';
                statusDiv.className = 'load-status';
                
                const matchCount = this.matches.length;
                const teamCount = this.teams.length;
                let statusText = '<p><strong>✓ Data loaded</strong>';
                
                if (matchCount > 0 && teamCount > 0) {
                    statusText += ` - ${matchCount} match${matchCount !== 1 ? 'es' : ''}, ${teamCount} team${teamCount !== 1 ? 's' : ''}`;
                } else if (matchCount > 0) {
                    statusText += ` - ${matchCount} match${matchCount !== 1 ? 'es' : ''}`;
                } else if (teamCount > 0) {
                    statusText += ` - ${teamCount} team${teamCount !== 1 ? 's' : ''}`;
                }
                
                statusText += `<br>Last loaded: ${formattedDate}</p>`;
                statusDiv.innerHTML = statusText;
                infoText.appendChild(statusDiv);
            }
        }
    }

    checkProxyAvailability() {
        // Check if API proxy or API key is configured
        const hasApiKey = window.API_PROXY_URL || window.API_KEY;
        const apiKeyGroup = document.getElementById('apiKeyGroup');
        
        console.log('Checking API key availability:', {
            hasApiKey,
            API_KEY: window.API_KEY ? 'Set' : 'Not set',
            API_PROXY_URL: window.API_PROXY_URL || 'Not set',
            apiKeyGroupExists: !!apiKeyGroup
        });
        
        if (hasApiKey) {
            // Hide API key field group if proxy or injected key is available
            if (apiKeyGroup) {
                apiKeyGroup.style.display = 'none';
                console.log('API key field hidden');
            }
            
            // Update info text (but preserve load status if it exists)
            const infoText = document.querySelector('.info-text');
            if (infoText) {
                const hasLoadStatus = document.getElementById('loadStatus');
                const existingHTML = infoText.innerHTML;
                
                // Only update if we don't already have the API key message
                if (!existingHTML.includes('API key is configured')) {
                    const apiKeyMsg = window.API_PROXY_URL 
                        ? '<p><strong>API key is configured server-side.</strong> Just enter your Google Sheet URL and click "Load Data".</p>'
                        : '<p><strong>API key is configured.</strong> Just enter your Google Sheet URL and click "Load Data".</p>';
                    
                    // Prepend the message, preserving any existing content
                    infoText.innerHTML = apiKeyMsg + (hasLoadStatus ? existingHTML : '');
                }
            }
        } else {
            console.log('No API key configured - showing API key field');
            // Make sure API key field is visible if no key is configured
            if (apiKeyGroup) {
                apiKeyGroup.style.display = '';
            }
        }
    }

    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Load button
        document.getElementById('loadBtn').addEventListener('click', () => this.loadAllData());
        
        // Match navigation
        document.getElementById('prevBtn').addEventListener('click', () => this.navigateMatch(-1));
        document.getElementById('nextBtn').addEventListener('click', () => this.navigateMatch(1));
        document.getElementById('matchSelect').addEventListener('change', (e) => {
            const matchIndex = parseInt(e.target.value);
            if (!isNaN(matchIndex)) {
                this.currentMatchIndex = matchIndex;
                this.displayMatch();
            }
        });
        
        // Allow Enter key to load schedule
        document.getElementById('sheetUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadAllData();
            }
        });

        // Save API key when changed
        document.getElementById('apiKey').addEventListener('change', (e) => {
            this.saveApiKey(e.target.value);
        });

        // Team search
        document.getElementById('teamSearch').addEventListener('input', (e) => {
            this.filterTeams(e.target.value);
        });
        
        // API key help modal
        document.getElementById('apiKeyHelp').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('apiKeyHelpModal').classList.remove('hidden');
        });
        
        document.querySelector('.modal-close').addEventListener('click', () => {
            document.getElementById('apiKeyHelpModal').classList.add('hidden');
        });
        
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('apiKeyHelpModal');
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    loadSavedSettings() {
        // Load saved API key from localStorage
        const savedApiKey = localStorage.getItem('fll_api_key');
        if (savedApiKey) {
            document.getElementById('apiKey').value = savedApiKey;
            this.apiKey = savedApiKey;
        }

        // Load saved sheet URL
        const savedSheetUrl = localStorage.getItem('fll_sheet_url');
        if (savedSheetUrl) {
            document.getElementById('sheetUrl').value = savedSheetUrl;
            this.sheetUrl = savedSheetUrl;
        }
    }

    saveApiKey(apiKey) {
        if (apiKey) {
            localStorage.setItem('fll_api_key', apiKey);
        } else {
            localStorage.removeItem('fll_api_key');
        }
        this.apiKey = apiKey;
    }

    saveSheetUrl(url) {
        if (url) {
            localStorage.setItem('fll_sheet_url', url);
        }
        this.sheetUrl = url;
    }

    async loadAllData() {
        const sheetUrl = document.getElementById('sheetUrl').value.trim();
        const apiKeyInput = document.getElementById('apiKey');
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
        
        // Check if proxy is available (API key field might be hidden)
        const useProxy = window.API_PROXY_URL && !apiKey;
        
        if (!sheetUrl) {
            this.showError('Please enter a Google Sheet URL');
            return;
        }

        // Check if we have an API key (from input, config, or proxy)
        const hasApiKey = apiKey || window.API_KEY || window.API_PROXY_URL;
        
        if (!hasApiKey) {
            this.showError('API key is required. Please enter your Google Sheets API key or configure it server-side.');
            return;
        }

        // Save settings
        this.saveSheetUrl(sheetUrl);
        if (apiKey) {
            this.saveApiKey(apiKey);
        }
        this.sheetUrl = sheetUrl;
        this.apiKey = apiKey;

        // Hide error and views, show loading
        this.hideError();
        document.getElementById('scheduleView').classList.add('hidden');
        document.getElementById('teamListContent').classList.add('hidden');
        document.getElementById('teamListEmpty').classList.remove('hidden');
        document.getElementById('matchesEmpty').classList.remove('hidden');
        document.getElementById('loadingIndicator').classList.remove('hidden');

        try {
            // Load match data (EmceePRT tab)
            await this.loadMatchData(sheetUrl, apiKey);
            
            // Load team data (TeamListbyNumber tab)
            await this.loadTeamData(sheetUrl, apiKey);
            
        } catch (error) {
            this.showError(`Error loading data: ${error.message}`);
            console.error('Error:', error);
            document.getElementById('loadSuccessMessage').classList.add('hidden');
        } finally {
            document.getElementById('loadingIndicator').classList.add('hidden');
            
            // Show success message if data was loaded
            if (this.matches.length > 0 || this.teams.length > 0) {
                this.showLoadSuccess();
            }
        }
    }

    showLoadSuccess() {
        const successDiv = document.getElementById('loadSuccessMessage');
        if (!successDiv) return;
        
        const now = new Date();
        const formattedDate = now.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const matchCount = this.matches.length;
        const teamCount = this.teams.length;
        
        let message = '<strong>✓ Data loaded successfully!</strong>';
        if (matchCount > 0 && teamCount > 0) {
            message += ` Loaded ${matchCount} match${matchCount !== 1 ? 'es' : ''} and ${teamCount} team${teamCount !== 1 ? 's' : ''}.`;
        } else if (matchCount > 0) {
            message += ` Loaded ${matchCount} match${matchCount !== 1 ? 'es' : ''}.`;
        } else if (teamCount > 0) {
            message += ` Loaded ${teamCount} team${teamCount !== 1 ? 's' : ''}.`;
        }
        message += `<br><small>Loaded at: ${formattedDate}</small>`;
        
        successDiv.innerHTML = message;
        successDiv.classList.remove('hidden');
        
        // Also update the status in info-text
        this.updateLoadStatus();
    }

    updateLoadStatus() {
        // Save load timestamp
        const now = new Date();
        const timestamp = now.toISOString();
        localStorage.setItem('fll_last_load', timestamp);
        
        // Update the status display
        const infoText = document.querySelector('.info-text');
        if (infoText) {
            // Remove existing status if any
            const existingStatus = document.getElementById('loadStatus');
            if (existingStatus) {
                existingStatus.remove();
            }
            
            // Create status div
            const statusDiv = document.createElement('div');
            statusDiv.id = 'loadStatus';
            statusDiv.className = 'load-status';
            
            const formattedDate = now.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit'
            });
            
            // Count loaded items
            const matchCount = this.matches.length;
            const teamCount = this.teams.length;
            let statusText = '<p><strong>✓ Data loaded successfully</strong>';
            
            if (matchCount > 0 && teamCount > 0) {
                statusText += ` - ${matchCount} match${matchCount !== 1 ? 'es' : ''}, ${teamCount} team${teamCount !== 1 ? 's' : ''}`;
            } else if (matchCount > 0) {
                statusText += ` - ${matchCount} match${matchCount !== 1 ? 'es' : ''}`;
            } else if (teamCount > 0) {
                statusText += ` - ${teamCount} team${teamCount !== 1 ? 's' : ''}`;
            }
            
            statusText += `<br>Last loaded: ${formattedDate}</p>`;
            statusDiv.innerHTML = statusText;
            infoText.appendChild(statusDiv);
        }
    }

    async loadMatchData(sheetUrl, apiKey) {
        try {
            let sheetData;
            
            // Try API method if API key is provided or proxy is available, otherwise try CSV
            if (apiKey || window.API_PROXY_URL || window.API_KEY) {
                // Use API key from config if available
                const keyToUse = apiKey || window.API_KEY || '';
                // Load EmceePRT tab
                sheetData = await this.loadViaAPI(sheetUrl, keyToUse, 'EmceePRT');
            } else {
                // Try CSV first
                try {
                    sheetData = await this.loadViaCSV(sheetUrl);
                } catch (csvError) {
                    throw new Error(`CSV access failed. The sheet may be private. Please provide a Google Sheets API key. Error: ${csvError.message}`);
                }
            }
            
            this.sheetData = sheetData;
            
            // Process data into matches
            this.matches = this.processSheetData(this.sheetData);
            
            if (this.matches.length === 0) {
                // Provide helpful debugging information
                const headers = this.sheetData.headers || [];
                const dataRows = this.sheetData.data ? this.sheetData.data.length : 0;
                const sampleRow = this.sheetData.data && this.sheetData.data.length > 0 ? this.sheetData.data[0] : null;
                
                let errorMsg = 'No match data found in the sheet. ';
                errorMsg += `Found ${dataRows} data rows. `;
                errorMsg += `Columns detected: ${headers.join(', ')}. `;
                
                if (sampleRow) {
                    errorMsg += `Sample row keys: ${Object.keys(sampleRow).join(', ')}.`;
                }
                
                console.error('Sheet data:', this.sheetData);
                throw new Error(errorMsg);
            }

            // Reset to first match and display
            this.currentMatchIndex = 0;
            this.displayMatch();
            this.populateMatchDropdown();
            document.getElementById('scheduleView').classList.remove('hidden');
            document.getElementById('matchesEmpty').classList.add('hidden');
            
        } catch (error) {
            console.error('Error loading match data:', error);
            document.getElementById('matchesEmpty').classList.remove('hidden');
            throw error;
        }
    }

    async loadTeamData(sheetUrl, apiKey) {
        try {
            document.getElementById('teamListLoading').classList.remove('hidden');
            
            let teamSheetData;
            
            if (apiKey || window.API_PROXY_URL || window.API_KEY) {
                // Use API key from config if available
                const keyToUse = apiKey || window.API_KEY || '';
                // Load TeamListbyNumber tab
                teamSheetData = await this.loadViaAPI(sheetUrl, keyToUse, 'TeamListbyNumber');
            } else {
                // For CSV, we'd need the GID for TeamListbyNumber tab
                // For now, skip if no API key
                throw new Error('Team list requires API key access');
            }
            
            // Process team data
            this.teams = this.processTeamData(teamSheetData);
            
            if (this.teams.length > 0) {
                this.displayTeamList();
                document.getElementById('teamListContent').classList.remove('hidden');
                document.getElementById('teamListEmpty').classList.add('hidden');
            } else {
                document.getElementById('teamListEmpty').classList.remove('hidden');
            }
            
        } catch (error) {
            console.error('Error loading team data:', error);
            document.getElementById('teamListEmpty').classList.remove('hidden');
            // Don't throw - team list is optional
        } finally {
            document.getElementById('teamListLoading').classList.add('hidden');
        }
    }

    processTeamData(sheetData) {
        const { headers, data } = sheetData;
        const teams = [];
        
        // Find team-related columns
        const teamNumberCol = this.findColumn(headers, ['team number', 'teamnumber', 'team #', 'team_num', 'team']);
        const teamNameCol = this.findColumn(headers, ['team name', 'teamname', 'name']);
        const organizationCol = this.findColumn(headers, ['organization', 'organizatino', 'org', 'school', 'institution']);
        const cityCol = this.findColumn(headers, ['city']);
        
        data.forEach((row, index) => {
            const team = {
                id: index + 1
            };
            
            if (teamNumberCol) {
                team.teamNumber = row[teamNumberCol] || '';
            }
            if (teamNameCol) {
                team.teamName = row[teamNameCol] || '';
            }
            if (organizationCol) {
                team.organization = row[organizationCol] || '';
            }
            
            // Store city separately for easy access
            team.otherData = {};
            if (cityCol) {
                const cityValue = row[cityCol];
                if (cityValue && cityValue.trim()) {
                    team.otherData.city = cityValue.trim();
                }
            }
            
            if (team.teamNumber || team.teamName) {
                teams.push(team);
            }
        });
        
        return teams;
    }

    displayTeamList(filteredTeams = null) {
        const teamsToShow = filteredTeams || this.teams;
        const container = document.getElementById('teamListGrid');
        
        if (teamsToShow.length === 0) {
            container.innerHTML = '<p class="empty-state">No teams found.</p>';
            return;
        }
        
        container.innerHTML = teamsToShow.map(team => {
            let html = `
                <div class="team-card">
                    <h3>${team.teamNumber ? `Team ${this.escapeHtml(team.teamNumber)}` : 'Unnamed Team'}</h3>
                    <div class="team-info">
            `;
            
            // Only show: Team Name, Organization, City
            if (team.teamName) {
                html += `
                    <div class="team-info-item">
                        <span class="team-info-label">Team Name:</span>
                        <span class="team-info-value">${this.escapeHtml(team.teamName)}</span>
                    </div>
                `;
            }
            
            if (team.organization) {
                html += `
                    <div class="team-info-item">
                        <span class="team-info-label">Organization:</span>
                        <span class="team-info-value">${this.escapeHtml(team.organization)}</span>
                    </div>
                `;
            }
            
            // Look for city in otherData
            if (team.otherData) {
                const cityKey = Object.keys(team.otherData).find(key => 
                    key.toLowerCase() === 'city'
                );
                if (cityKey && team.otherData[cityKey]) {
                    html += `
                        <div class="team-info-item">
                            <span class="team-info-label">City:</span>
                            <span class="team-info-value">${this.escapeHtml(team.otherData[cityKey])}</span>
                        </div>
                    `;
                }
            }
            
            html += `
                    </div>
                </div>
            `;
            
            return html;
        }).join('');
    }

    filterTeams(searchTerm) {
        if (!searchTerm.trim()) {
            this.displayTeamList();
            return;
        }
        
        const term = searchTerm.toLowerCase();
        const filtered = this.teams.filter(team => {
            return (team.teamNumber && team.teamNumber.toLowerCase().includes(term)) ||
                   (team.teamName && team.teamName.toLowerCase().includes(term)) ||
                   (team.organization && team.organization.toLowerCase().includes(term)) ||
                   Object.values(team.otherData || {}).some(val => 
                       String(val).toLowerCase().includes(term)
                   );
        });
        
        this.displayTeamList(filtered);
    }

    populateMatchDropdown() {
        const select = document.getElementById('matchSelect');
        select.innerHTML = '<option value="">Select a match...</option>';
        
        this.matches.forEach((match, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Match ${match.matchNumber}${match.time ? ` - ${match.time}` : ''}`;
            if (index === this.currentMatchIndex) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    async loadViaCSV(sheetUrl) {
        // Convert Google Sheet URL to CSV export URL
        const csvUrl = this.convertSheetUrlToCsv(sheetUrl);
        
        // Fetch CSV data
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        // Check if we got HTML instead of CSV (means authentication required)
        if (csvText.trim().startsWith('<!DOCTYPE') || csvText.includes('<html')) {
            throw new Error('Sheet requires authentication. Please provide an API key.');
        }
        
        // Parse CSV data
        return this.parseCSV(csvText);
    }

    async loadViaAPI(sheetUrl, apiKey, preferredSheetName = null) {
        // Extract sheet ID and GID from URL
        const { sheetId, gid } = this.extractSheetInfo(sheetUrl);
        
        // Check if we should use proxy API (when API key is not provided but proxy is available)
        const useProxy = !apiKey && window.API_PROXY_URL;
        const proxyUrl = window.API_PROXY_URL || '';
        
        // First, get sheet metadata to find the sheet name from GID
        let sheetName = preferredSheetName || 'Sheet1'; // Default fallback
        const commonSheetNames = preferredSheetName 
            ? [preferredSheetName, 'EmceePRT', 'EmceePrt', 'EmceeTablet', 'OfficialSchedule', 'TeamListbyNumber', 'Sheet1']
            : ['EmceePRT', 'EmceePrt', 'EmceeTablet', 'OfficialSchedule', 'TeamListbyNumber', 'Sheet1'];
        
        try {
            let metadataUrl, metadataResponse, metadata;
            
            if (useProxy) {
                // Use proxy for metadata - need to get full spreadsheet metadata first
                // The proxy should handle getting metadata
                metadataUrl = `${proxyUrl}?sheetId=${sheetId}&action=metadata`;
            } else {
                metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
            }
            
            metadataResponse = await fetch(metadataUrl);
            const metadataData = await metadataResponse.json();
            
            // Handle proxy response format
            if (useProxy && metadataData.sheets) {
                metadata = metadataData;
            } else if (useProxy) {
                // Proxy might return data directly
                metadata = { sheets: metadataData.sheets || [] };
            } else {
                metadata = metadataData;
            }
            
            if (metadataResponse.ok && metadata.sheets) {
                if (gid !== '0' && !preferredSheetName) {
                    // Find sheet with matching GID (only if no preferred name)
                    const matchingSheet = metadata.sheets.find(sheet => 
                        sheet.properties.sheetId.toString() === gid
                    );
                    if (matchingSheet) {
                        sheetName = matchingSheet.properties.title;
                    }
                } else if (preferredSheetName) {
                    // Look for the preferred sheet name
                    const foundSheet = metadata.sheets.find(sheet => 
                        sheet.properties.title === preferredSheetName
                    );
                    if (foundSheet) {
                        sheetName = preferredSheetName;
                    } else {
                        throw new Error(`Sheet "${preferredSheetName}" not found. Available sheets: ${metadata.sheets.map(s => s.properties.title).join(', ')}`);
                    }
                } else {
                    // No GID specified, try to find common sheet names
                    for (const name of commonSheetNames) {
                        const foundSheet = metadata.sheets.find(sheet => 
                            sheet.properties.title === name
                        );
                        if (foundSheet) {
                            sheetName = name;
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Could not fetch sheet metadata, will try common sheet names', e);
            // If metadata fetch fails and we have a preferred name, use it
            if (preferredSheetName) {
                sheetName = preferredSheetName;
            } else {
                sheetName = commonSheetNames[0];
            }
        }
        
        // Use Google Sheets API v4 to get values
        // Escape sheet name if it contains special characters
        const range = `${sheetName}!A:ZZ`; // Get all columns
        let apiUrl;
        
        if (useProxy) {
            // Use proxy API
            apiUrl = `${proxyUrl}?sheetId=${sheetId}&sheetName=${encodeURIComponent(sheetName)}&range=${encodeURIComponent(range)}`;
        } else {
            // Direct API call with key
            apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
        }
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (!response.ok) {
            if (data.error) {
                throw new Error(`API Error: ${data.error.message || data.error}`);
            }
            throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
        }
        
        // Convert API response to our format
        const values = data.values || [];
        if (values.length === 0) {
            throw new Error('Sheet appears to be empty');
        }
        
        // First row is headers
        const headers = values[0].map(h => (h || '').trim());
        
        // Check if we have duplicate column names (like multiple "Table/Team" columns)
        const hasDuplicateHeaders = headers.length !== new Set(headers).size;
        
        // Remaining rows are data
        const rows = [];
        for (let i = 1; i < values.length; i++) {
            const rowData = values[i];
            
            // If we have duplicate headers, store as array to preserve all values
            if (hasDuplicateHeaders) {
                // Store both as object (for easy access) and as array (for duplicate columns)
                // Preserve newlines - only trim if value is empty/null
                const row = {
                    _array: rowData.map(v => {
                        if (!v) return '';
                        const str = String(v);
                        // Only trim if it's just whitespace, otherwise preserve internal structure
                        return str.trim() === '' ? '' : str;
                    })
                };
                // Still create object for non-duplicate columns
                headers.forEach((header, index) => {
                    if (!row[header]) {
                        const val = rowData[index];
                        row[header] = val ? String(val) : '';
                    }
                });
                rows.push(row);
            } else {
                // Normal case: no duplicates, use object
                const row = {};
                headers.forEach((header, index) => {
                    const val = rowData[index];
                    row[header] = val ? String(val) : '';
                });
                rows.push(row);
            }
            
            // Skip completely empty rows
            const rowValues = hasDuplicateHeaders ? rows[rows.length - 1]._array : Object.values(rows[rows.length - 1]);
            if (!rowValues.some(v => v)) {
                rows.pop(); // Remove the empty row we just added
            }
        }
        
        return { headers, data: rows, hasDuplicateHeaders };
    }

    extractSheetInfo(url) {
        // Extract sheet ID from Google Sheets URL
        const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        
        if (!sheetIdMatch) {
            throw new Error('Invalid Google Sheet URL format');
        }
        
        const sheetId = sheetIdMatch[1];
        
        // Extract GID if present (for specific sheet tab)
        const gidMatch = url.match(/gid=(\d+)/);
        const gid = gidMatch ? gidMatch[1] : '0';
        
        return { sheetId, gid };
    }

    convertSheetUrlToCsv(url) {
        // Extract sheet ID from Google Sheets URL
        // Format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid={GID}
        const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        
        if (!sheetIdMatch) {
            throw new Error('Invalid Google Sheet URL format');
        }
        
        const sheetId = sheetIdMatch[1];
        
        // Extract GID if present (for specific sheet tab)
        const gidMatch = url.match(/gid=(\d+)/);
        const gid = gidMatch ? gidMatch[1] : '0';
        
        // Return CSV export URL
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];
        
        // Parse header row
        const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
        
        // Check if we have duplicate column names
        const hasDuplicateHeaders = headers.length !== new Set(headers).size;
        
        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === 0 || values.every(v => !v.trim())) continue; // Skip empty rows
            
            if (hasDuplicateHeaders) {
                // Store both as object and as array for duplicate columns
                // Preserve newlines in CSV values
                const row = {
                    _array: values.map(v => {
                        if (!v) return '';
                        // Preserve internal newlines, only trim if entirely whitespace
                        return v.trim() === '' ? '' : v;
                    })
                };
                // Still create object for non-duplicate columns
                headers.forEach((header, index) => {
                    if (!row[header]) {
                        const val = values[index];
                        row[header] = val ? val : '';
                    }
                });
                data.push(row);
            } else {
                const row = {};
                headers.forEach((header, index) => {
                    const val = values[index];
                    row[header] = val ? val : '';
                });
                data.push(row);
            }
        }
        
        return { headers, data, hasDuplicateHeaders };
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);
        
        return values;
    }

    processSheetData(sheetData) {
        // This function processes the sheet data into match objects
        // It tries to detect common column patterns for tournament schedules
        
        const { headers, data } = sheetData;
        
        // Check for EmceePRT format: Match, Time, Team Info, Table/Team (x6)
        const matchColumn = this.findColumn(headers, ['match', 'match number', 'match #', 'match_num', 'match num', 'matchnumber']);
        const timeColumn = this.findColumn(headers, ['time']);
        const teamInfoColumn = this.findColumn(headers, ['team info', 'teaminfo', 'team information']);
        
        // Look for Table/Team columns - they might be named exactly "Table/Team" or variations
        // Since there can be multiple columns with the same name "Table/Team", we need to get all of them
        const tableTeamColumns = [];
        headers.forEach((header, index) => {
            const lower = header.toLowerCase().trim();
            // Match "Table/Team" or "table/team" or similar patterns
            if ((lower.includes('table') && lower.includes('team')) ||
                lower === 'table/team' ||
                /^table\s*\/\s*team$/i.test(lower)) {
                // Store both the header name and index for reference
                tableTeamColumns.push(header);
            }
        });
        
        // If we found Table/Team columns but they're all the same name, we need to handle them by position
        // The data structure should have all columns, so we can access by index if needed
        
        console.log('Column detection:', {
            headers,
            matchColumn,
            timeColumn,
            teamInfoColumn,
            tableTeamColumns,
            tableTeamColumnsCount: tableTeamColumns.length
        });
        
        // Check if this is the EmceePRT format
        // Need at least Match column and some Table/Team columns (could be fewer than 6)
        if (matchColumn && tableTeamColumns.length > 0) {
            console.log('Detected EmceePRT format');
            return this.processEmceePRTFormat(data, headers, matchColumn, timeColumn, teamInfoColumn, tableTeamColumns);
        }
        
        console.log('EmceePRT format not detected, trying other formats...');
        
        // Try to identify key columns
        // Check if this is a "one row per match" format (Match, Team1, Team2, Team3, etc.)
        const teamNumberColumns = headers.filter(h => {
            const lower = h.toLowerCase().trim();
            return /^team\s*\d+$/.test(lower) || 
                   /^team\s*[a-z]$/i.test(lower) ||
                   lower === 'team1' || lower === 'team2' || lower === 'team3' ||
                   lower === 'team 1' || lower === 'team 2' || lower === 'team 3';
        });
        
        if (matchColumn && teamNumberColumns.length > 0) {
            // Format: One row per match with Team1, Team2, Team3 columns
            return this.processOneRowPerMatch(data, headers, matchColumn, teamNumberColumns);
        }
        
        // Check if this is a "one row per team" format
        const teamColumns = this.findTeamColumns(headers);
        
        if (matchColumn && teamColumns.length > 0) {
            // Format: One row per team with Match column
            return this.processOneRowPerTeam(data, headers, matchColumn, teamColumns);
        }
        
        // If we can't find standard columns, try to infer structure
        return this.inferMatchStructure(data, headers);
    }

    processEmceePRTFormat(data, headers, matchColumn, timeColumn, teamInfoColumn, tableTeamColumns) {
        // Format: Each row is a match with columns: Match, Time, Team Info, Table/Team (x6)
        // Teams are paired: (col1, col2), (col3, col4), (col5, col6) representing up to 3 groups
        const matches = [];
        
        // Check if we're dealing with duplicate headers (stored as _array)
        const hasArrayData = data.length > 0 && data[0]._array !== undefined;
        
        console.log('Processing EmceePRT format:', {
            matchColumn,
            timeColumn,
            teamInfoColumn,
            tableTeamColumns,
            tableTeamColumnsCount: tableTeamColumns.length,
            dataRows: data.length,
            headers,
            hasArrayData,
            sampleRow: data.length > 0 ? (hasArrayData ? data[0]._array : data[0]) : null
        });
        
        // Find the indices of Table/Team columns in the headers array
        // This handles the case where multiple columns have the same name "Table/Team"
        const tableTeamIndices = [];
        headers.forEach((header, index) => {
            const lower = header.toLowerCase().trim();
            if ((lower.includes('table') && lower.includes('team')) ||
                lower === 'table/team' ||
                /^table\s*\/\s*team$/i.test(lower)) {
                tableTeamIndices.push(index);
            }
        });
        
        console.log('Table/Team column indices:', tableTeamIndices);
        
        // Find match column index
        const matchColumnIndex = headers.findIndex(h => h === matchColumn);
        console.log('Match column index:', matchColumnIndex);
        
        data.forEach((row, rowIndex) => {
            // Get match number - use array if available, otherwise object
            let matchNum = '';
            if (hasArrayData && matchColumnIndex >= 0) {
                matchNum = row._array[matchColumnIndex] || '';
            } else {
                matchNum = row[matchColumn] || '';
            }
            matchNum = String(matchNum).trim();
            
            if (!matchNum) {
                console.log(`Skipping row ${rowIndex}: no match number. Row data:`, hasArrayData ? row._array : row);
                return; // Skip rows without match number
            }
            
            // Get time and team info
            let time = '';
            let teamInfo = '';
            
            if (hasArrayData) {
                if (timeColumn) {
                    const timeIndex = headers.findIndex(h => h === timeColumn);
                    if (timeIndex >= 0) time = String(row._array[timeIndex] || '').trim();
                }
                if (teamInfoColumn) {
                    const teamInfoIndex = headers.findIndex(h => h === teamInfoColumn);
                    if (teamInfoIndex >= 0) teamInfo = String(row._array[teamInfoIndex] || '').trim();
                }
            } else {
                time = timeColumn ? String(row[timeColumn] || '').trim() : '';
                teamInfo = teamInfoColumn ? String(row[teamInfoColumn] || '').trim() : '';
            }
            
            const match = {
                matchNumber: matchNum,
                time: time,
                teamInfo: teamInfo,
                teams: [],
                groups: []
            };
            
            // Process teams in pairs using column indices
            // Pairs: (indices[0], indices[1]), (indices[2], indices[3]), (indices[4], indices[5])
            for (let i = 0; i < tableTeamIndices.length; i += 2) {
                if (i + 1 < tableTeamIndices.length) {
                    const colIndex1 = tableTeamIndices[i];
                    const colIndex2 = tableTeamIndices[i + 1];
                    
                    // Get values from array if available, otherwise from object
                    // Don't trim here - preserve the raw value with newlines
                    let team1Raw = '';
                    let team2Raw = '';
                    
                    if (hasArrayData) {
                        team1Raw = row._array[colIndex1] || '';
                        team2Raw = row._array[colIndex2] || '';
                    } else {
                        const header1 = headers[colIndex1];
                        const header2 = headers[colIndex2];
                        team1Raw = row[header1] || '';
                        team2Raw = row[header2] || '';
                    }
                    
                    // Convert to string if not already, but preserve newlines
                    team1Raw = team1Raw ? String(team1Raw) : '';
                    team2Raw = team2Raw ? String(team2Raw) : '';
                    
                    // Parse team data: first line is table number, rest is team info (preserve line breaks)
                    const parseTeamData = (rawValue) => {
                        if (!rawValue || !rawValue.trim()) return null;
                        
                        // Split by newlines and preserve them
                        const lines = rawValue.split('\n');
                        if (lines.length === 0) return null;
                        
                        // First line should contain "Table X" or just table number
                        const firstLine = lines[0].trim();
                        let tableNum = null;
                        let teamInfo = '';
                        
                        // Try to extract table number from first line
                        const tableMatch = firstLine.match(/table\s*(\d+)/i);
                        if (tableMatch) {
                            tableNum = parseInt(tableMatch[1]);
                            // Rest of the content starts from line 2, preserve line breaks
                            teamInfo = lines.slice(1).join('\n').trim();
                        } else {
                            // If no "Table X" pattern, try to parse as just number
                            const numMatch = firstLine.match(/^(\d+)/);
                            if (numMatch && lines.length > 1) {
                                tableNum = parseInt(numMatch[1]);
                                teamInfo = lines.slice(1).join('\n').trim();
                            } else {
                                // No table number found, use all content as team info
                                teamInfo = lines.join('\n').trim();
                            }
                        }
                        
                        return {
                            table: tableNum,
                            info: teamInfo,
                            raw: rawValue
                        };
                    };
                    
                    const team1Data = parseTeamData(team1Raw);
                    const team2Data = parseTeamData(team2Raw);
                    
                    // Only create a group if at least one team has a value
                    if (team1Data || team2Data) {
                        const groupNumber = Math.floor(i / 2) + 1;
                        
                        const group = {
                            groupNumber: groupNumber,
                            table1: team1Data?.table || null,
                            table2: team2Data?.table || null,
                            teams: []
                        };
                        
                        if (team1Data && team1Data.info) {
                            group.teams.push({
                                table: team1Data.table,
                                info: team1Data.info,
                                raw: team1Data.raw
                            });
                            match.teams.push({
                                table: team1Data.table,
                                info: team1Data.info,
                                raw: team1Data.raw,
                                group: groupNumber
                            });
                        }
                        
                        if (team2Data && team2Data.info) {
                            group.teams.push({
                                table: team2Data.table,
                                info: team2Data.info,
                                raw: team2Data.raw
                            });
                            match.teams.push({
                                table: team2Data.table,
                                info: team2Data.info,
                                raw: team2Data.raw,
                                group: groupNumber
                            });
                        }
                        
                        if (group.teams.length > 0) {
                            match.groups.push(group);
                        }
                    }
                }
            }
            
            console.log(`Match ${matchNum}: ${match.teams.length} teams, ${match.groups.length} groups`);
            
            if (match.teams.length > 0) {
                matches.push(match);
            } else {
                console.log(`Match ${matchNum} has no teams, skipping`);
            }
        });
        
        // Sort by match number
        matches.sort((a, b) => {
            const numA = parseInt(a.matchNumber) || 0;
            const numB = parseInt(b.matchNumber) || 0;
            return numA - numB;
        });
        
        return matches;
    }

    processOneRowPerMatch(data, headers, matchColumn, teamNumberColumns) {
        // Format where each row is a match with Team1, Team2, Team3 columns
        const matches = [];
        
        data.forEach(row => {
            const matchNum = row[matchColumn] || '';
            if (!matchNum) return; // Skip rows without match number
            
            const match = {
                matchNumber: matchNum,
                teams: []
            };
            
            // Extract teams from Team1, Team2, Team3 columns
            teamNumberColumns.forEach(teamCol => {
                const teamValue = row[teamCol];
                if (teamValue && teamValue.trim()) {
                    const team = {
                        teamNumber: teamValue.trim(),
                        otherData: {}
                    };
                    
                    // Look for team name columns (Team1 Name, Team1Name, etc.)
                    const teamColLower = teamCol.toLowerCase();
                    const teamIndex = teamColLower.match(/\d+/)?.[0] || teamColLower.slice(-1);
                    
                    headers.forEach(header => {
                        const headerLower = header.toLowerCase();
                        if (headerLower.includes(teamIndex) && 
                            (headerLower.includes('name') || headerLower.includes('team'))) {
                            if (headerLower.includes('name')) {
                                team.teamName = row[header] || '';
                            }
                        } else if (header !== matchColumn && !teamNumberColumns.includes(header)) {
                            // Store other match-level data
                            match.otherData = match.otherData || {};
                            match.otherData[header] = row[header] || '';
                        }
                    });
                    
                    match.teams.push(team);
                }
            });
            
            // Also check for any columns that might contain team info
            headers.forEach(header => {
                if (header !== matchColumn && !teamNumberColumns.includes(header)) {
                    const headerLower = header.toLowerCase();
                    // Look for score, time, table, etc.
                    if (headerLower.includes('score') || headerLower.includes('points')) {
                        match.score = row[header] || '';
                    } else if (!match.otherData) {
                        match.otherData = {};
                    }
                    if (!match.otherData[header]) {
                        match.otherData[header] = row[header] || '';
                    }
                }
            });
            
            if (match.teams.length > 0) {
                matches.push(match);
            }
        });
        
        // Sort by match number
        matches.sort((a, b) => {
            const numA = parseInt(a.matchNumber) || 0;
            const numB = parseInt(b.matchNumber) || 0;
            return numA - numB;
        });
        
        return matches;
    }

    processOneRowPerTeam(data, headers, matchColumn, teamColumns) {
        // Format where each row is a team with Match column
        const matchesMap = new Map();
        
        data.forEach(row => {
            const matchNum = row[matchColumn] || 'Unknown';
            
            if (!matchesMap.has(matchNum)) {
                matchesMap.set(matchNum, {
                    matchNumber: matchNum,
                    teams: []
                });
            }
            
            const match = matchesMap.get(matchNum);
            const team = {};
            
            // Extract team information
            teamColumns.forEach(col => {
                const colName = col.toLowerCase();
                if (colName.includes('team') && (colName.includes('number') || colName.includes('num') || colName.includes('#') || /team\s*\d*$/.test(colName))) {
                    team.teamNumber = row[col] || '';
                } else if (colName.includes('name') && !colName.includes('match')) {
                    team.teamName = row[col] || '';
                } else if (colName.includes('score') || colName.includes('points')) {
                    team.score = row[col] || '';
                } else {
                    // Store other team-related data
                    if (!team.otherData) team.otherData = {};
                    team.otherData[col] = row[col] || '';
                }
            });
            
            // Add all other columns as team data
            headers.forEach(header => {
                if (!teamColumns.includes(header) && header !== matchColumn) {
                    if (!team.otherData) team.otherData = {};
                    team.otherData[header] = row[header] || '';
                }
            });
            
            if (team.teamNumber || team.teamName) {
                match.teams.push(team);
            }
        });
        
        // Convert to array and sort by match number
        const matches = Array.from(matchesMap.values());
        matches.sort((a, b) => {
            const numA = parseInt(a.matchNumber) || 0;
            const numB = parseInt(b.matchNumber) || 0;
            return numA - numB;
        });
        
        return matches;
    }

    findColumn(headers, possibleNames) {
        const lowerHeaders = headers.map(h => h.toLowerCase().trim());
        for (const name of possibleNames) {
            const index = lowerHeaders.indexOf(name.toLowerCase());
            if (index !== -1) return headers[index];
        }
        return null;
    }

    findTeamColumns(headers) {
        const teamKeywords = ['team', 'name', 'score', 'points'];
        return headers.filter(header => {
            const lower = header.toLowerCase();
            // Exclude match-related columns
            if (lower.includes('match')) return false;
            return teamKeywords.some(keyword => lower.includes(keyword));
        });
    }

    inferMatchStructure(data, headers) {
        // Fallback: treat each row as a match if we can't find structure
        // This is a simple fallback - you may want to customize this
        const matches = [];
        
        data.forEach((row, index) => {
            const match = {
                matchNumber: row[headers[0]] || `Match ${index + 1}`,
                teams: []
            };
            
            // Try to extract team info from all columns
            const team = {};
            headers.forEach((header, i) => {
                const value = row[header];
                if (value && value.trim()) {
                    if (i === 0) {
                        team.teamNumber = value;
                    } else if (i === 1) {
                        team.teamName = value;
                    } else {
                        if (!team.otherData) team.otherData = {};
                        team.otherData[header] = value;
                    }
                }
            });
            
            if (team.teamNumber || team.teamName) {
                match.teams.push(team);
            }
            
            if (match.teams.length > 0) {
                matches.push(match);
            }
        });
        
        return matches;
    }

    displayMatch() {
        if (this.matches.length === 0) return;
        
        const match = this.matches[this.currentMatchIndex];
        const matchDetailsDiv = document.getElementById('matchDetails');
        
        // Update navigation buttons
        document.getElementById('prevBtn').disabled = this.currentMatchIndex === 0;
        document.getElementById('nextBtn').disabled = this.currentMatchIndex === this.matches.length - 1;
        
        // Update match counter
        document.getElementById('matchNumber').textContent = this.currentMatchIndex + 1;
        document.getElementById('totalMatches').textContent = this.matches.length;
        
        // Update dropdown
        const select = document.getElementById('matchSelect');
        if (select) {
            select.value = this.currentMatchIndex;
        }
        
        // Build match HTML
        let html = `
            <div class="match-header">
                <h2>Match ${match.matchNumber}</h2>
                <div class="match-info">
                    ${match.time ? `Time: ${this.escapeHtml(match.time)}` : ''}
                    ${match.time && match.teams.length ? ' • ' : ''}
                    ${match.teams.length} Team(s)${match.groups && match.groups.length ? ` • ${match.groups.length} Group(s)` : ''}
                </div>
            </div>
        `;
        
        // Check if this is EmceePRT format (has groups)
        if (match.groups && match.groups.length > 0) {
            // Display by groups
            html += `<div class="groups-container">`;
            
            match.groups.forEach((group, groupIndex) => {
                const tableDisplay = [group.table1, group.table2].filter(t => t !== null).join(' & ');
                const groupClass = group.groupNumber === 2 ? 'group-card group-card-2' : 'group-card';
                html += `
                    <div class="${groupClass}">
                        <h3>Group ${group.groupNumber}${tableDisplay ? ` (Tables ${tableDisplay})` : ''}</h3>
                        <div class="teams-container">
                `;
                
                group.teams.forEach((team, teamIndex) => {
                    // Format team info with line breaks preserved
                    // First line is typically team number (bold), second is team name (bold, 18pt)
                    let formattedInfo = 'No team info';
                    
                    if (team.info) {
                        const lines = team.info.split('\n')
                            .map(line => line.trim())
                            .filter(line => line);
                        
                        if (lines.length > 0) {
                            formattedInfo = lines.map((line, index) => {
                                const escapedLine = this.escapeHtml(line);
                                if (index === 0) {
                                    // First line: team number - make it bold
                                    return `<span class="team-number">${escapedLine}</span>`;
                                } else if (index === 1) {
                                    // Second line: team name - make it bold and 18pt
                                    return `<span class="team-name">${escapedLine}</span>`;
                                } else {
                                    // Other lines: regular formatting
                                    return escapedLine;
                                }
                            }).join('<br>');
                        }
                    }
                    
                    html += `
                        <div class="team-card">
                            <h4>Table ${team.table || 'N/A'}</h4>
                            <div class="team-info">
                                <div class="team-info-item team-info-multiline">
                                    <span class="team-info-value">${formattedInfo}</span>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        } else {
            // Standard format - display teams individually
            html += `<div class="teams-container">`;
            
            match.teams.forEach((team, index) => {
                html += `
                    <div class="team-card">
                        <h3>Team ${index + 1}${team.teamNumber ? ` - ${team.teamNumber}` : ''}</h3>
                        <div class="team-info">
                `;
                
                if (team.table) {
                    html += `
                        <div class="team-info-item">
                            <span class="team-info-label">Table:</span>
                            <span class="team-info-value">${team.table}</span>
                        </div>
                    `;
                }
                
                if (team.teamName) {
                    html += `
                        <div class="team-info-item">
                            <span class="team-info-label">Team Name:</span>
                            <span class="team-info-value">${this.escapeHtml(team.teamName)}</span>
                        </div>
                    `;
                }
                
                if (team.teamNumber && !team.teamName) {
                    html += `
                        <div class="team-info-item">
                            <span class="team-info-label">Team Number:</span>
                            <span class="team-info-value">${this.escapeHtml(team.teamNumber)}</span>
                        </div>
                    `;
                }
                
                if (team.score) {
                    html += `
                        <div class="team-info-item">
                            <span class="team-info-label">Score:</span>
                            <span class="team-info-value">${this.escapeHtml(team.score)}</span>
                        </div>
                    `;
                }
                
                // Display other data
                if (team.otherData) {
                    Object.entries(team.otherData).forEach(([key, value]) => {
                        if (value && value.trim()) {
                            html += `
                                <div class="team-info-item">
                                    <span class="team-info-label">${this.escapeHtml(key)}:</span>
                                    <span class="team-info-value">${this.escapeHtml(value)}</span>
                                </div>
                            `;
                        }
                    });
                }
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
            
            // Display match-level data if present
            if (match.otherData) {
                html += `
                    <div class="match-other-data">
                        <h4>Match Details</h4>
                        <div class="team-info">
                `;
                Object.entries(match.otherData).forEach(([key, value]) => {
                    if (value && value.trim()) {
                        html += `
                            <div class="team-info-item">
                                <span class="team-info-label">${this.escapeHtml(key)}:</span>
                                <span class="team-info-value">${this.escapeHtml(value)}</span>
                            </div>
                        `;
                    }
                });
                html += `
                        </div>
                    </div>
                `;
            }
        }
        
        matchDetailsDiv.innerHTML = html;
    }

    navigateMatch(direction) {
        const newIndex = this.currentMatchIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.matches.length) {
            this.currentMatchIndex = newIndex;
            this.displayMatch();
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('errorMessage').classList.add('hidden');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TournamentScheduleViewer();
});

