// Netlify serverless function to proxy Google Sheets API calls
// API key is stored in Netlify environment variables (secure)

exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Get API key from Netlify environment variable
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured' })
        };
    }

    // Get parameters from query string
    const { sheetId, range, sheetName, action } = event.queryStringParameters || {};
    
    if (!sheetId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'sheetId parameter required' })
        };
    }

    try {
        // Handle metadata request
        if (action === 'metadata') {
            const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
            const metadataResponse = await fetch(metadataUrl);
            const metadata = await metadataResponse.json();
            
            if (!metadataResponse.ok) {
                return {
                    statusCode: metadataResponse.status,
                    body: JSON.stringify({ error: metadata.error?.message || 'Failed to fetch sheet metadata' })
                };
            }
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify(metadata)
            };
        }
        
        // Build the Google Sheets API URL for data
        let apiUrl;
        
        if (sheetName) {
            // Use provided sheet name
            const rangeValue = range || 'A:ZZ';
            apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName + '!' + rangeValue)}?key=${apiKey}`;
        } else {
            // Get sheet metadata to find sheet name
            const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
            const metadataResponse = await fetch(metadataUrl);
            const metadata = await metadataResponse.json();
            
            if (!metadataResponse.ok) {
                throw new Error(metadata.error?.message || 'Failed to fetch sheet metadata');
            }
            
            // Use first sheet or specified sheet
            const firstSheet = metadata.sheets?.[0];
            if (!firstSheet) {
                throw new Error('No sheets found in spreadsheet');
            }
            
            const sheetNameToUse = firstSheet.properties.title;
            const rangeValue = range || 'A:ZZ';
            apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetNameToUse + '!' + rangeValue)}?key=${apiKey}`;
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

        // Return the data with CORS headers
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
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

