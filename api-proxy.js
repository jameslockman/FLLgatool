// Serverless function to proxy Google Sheets API calls
// This keeps the API key secure on the server side
// Deploy this to Netlify Functions, Vercel Functions, or similar

exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Get API key from environment variable
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured' })
        };
    }

    // Get parameters from query string
    const { sheetId, range, gid } = event.queryStringParameters || {};
    
    if (!sheetId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'sheetId parameter required' })
        };
    }

    try {
        // Build the Google Sheets API URL
        let apiUrl;
        if (range) {
            // Get specific range
            apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
        } else if (gid) {
            // Get sheet metadata to find sheet name from GID
            const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
            const metadataResponse = await fetch(metadataUrl);
            const metadata = await metadataResponse.json();
            
            if (!metadataResponse.ok) {
                throw new Error(metadata.error?.message || 'Failed to fetch sheet metadata');
            }
            
            const matchingSheet = metadata.sheets?.find(sheet => 
                sheet.properties.sheetId.toString() === gid
            );
            
            if (!matchingSheet) {
                throw new Error(`Sheet with GID ${gid} not found`);
            }
            
            const sheetName = matchingSheet.properties.title;
            apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName + '!A:ZZ')}?key=${apiKey}`;
        } else {
            // Get first sheet
            apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:ZZ?key=${apiKey}`;
        }

        // Fetch data from Google Sheets API
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: data.error?.message || 'Failed to fetch sheet data' })
            };
        }

        // Return the data
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Allow CORS
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};

