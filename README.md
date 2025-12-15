# FLLgatool
A slim game announcer tool UI for FLL, using Google Sheets as a data source.

## Features

- **Simple URL Input**: Enter your Google Sheet URL to load tournament schedule data
- **Match Navigation**: Navigate between matches with Previous/Next buttons
- **Clean Display**: Formatted view showing team details for each match
- **Public & Private Sheets**: Works with both public sheets (CSV) and private sheets (API key)

## Usage

### For Public Sheets (No API Key Required)

1. Open `index.html` in a web browser
2. Make sure your Google Sheet is set to "Anyone with the link can view"
3. Copy the Google Sheet URL and paste it into the input field
4. Leave the API Key field empty
5. Click "Load Schedule" to fetch and display the data
6. Use the navigation buttons to move between matches

### For Private Sheets (API Key Required)

1. Get a Google Sheets API key (see instructions below)
2. Open `index.html` in a web browser
3. Paste your Google Sheet URL into the input field
4. Paste your API key into the API Key field
5. Click "Load Schedule" to fetch and display the data
6. Use the navigation buttons to move between matches

## Getting a Google Sheets API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Google Sheets API" for your project:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create an API key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key
5. (Recommended) Restrict the API key:
   - Click "Restrict Key" on the API key page
   - Under "API restrictions", select "Restrict key" and choose "Google Sheets API"
   - This limits what the key can access for security

## Google Sheet Format

The tool automatically detects common column patterns:
- **Match Number**: Columns named "Match", "Match Number", "Match #", etc.
- **Team Information**: Columns containing "Team", "Name", "Score", "Points", etc.

The tool will try to intelligently parse your sheet structure. If your sheet has a different format, you may need to adjust the column detection logic in `app.js`.

## Technical Details

- **Public Sheets**: Uses Google Sheets CSV export API (no authentication needed)
- **Private Sheets**: Uses Google Sheets API v4 (requires API key)
- Pure vanilla JavaScript (no dependencies)
- Responsive design that works on desktop and mobile devices
- Automatically detects sheet structure and matches teams to matches

## Browser Compatibility

Works in all modern browsers that support:
- ES6+ JavaScript
- Fetch API
- CSS Grid
