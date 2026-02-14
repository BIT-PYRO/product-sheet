import { google } from 'googleapis';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Get credentials from environment variables
    const credentials = {
      type: process.env.GOOGLE_TYPE,
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: process.env.GOOGLE_AUTH_URI,
      token_uri: process.env.GOOGLE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
    };

    const sheets = google.sheets({
      version: 'v4',
      auth: new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      }),
    });

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Prepare the row data
    const values = [
      [
        new Date().toLocaleString(),
        data.sku || '',
        data.listingName || '',
        data.material || '',
        data.materialSku || '',
        data.dropdown1 || '',
        data.weightValue ? `${data.weightValue} ${data.weightUnit}` : '',
        data.dropdown2 || '',
        data.dropdown3 || '',
        data.settingType || '',
        data.enamelType || '',
        data.activeChannels?.join(', ') || '',
        data.shopifyStatus || '',
        data.platingType?.length || 0,
        data.manufacturing?.dieNumbers?.length || 0,
        data.variations?.length || 0,
        data.stoneInfo?.length || 0,
        data.finalStock?.length || 0,
      ],
    ];

    // Check if header row exists, if not, add it
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A1:S1',
    });

    const hasHeader = getResponse.data.values && getResponse.data.values.length > 0;

    if (!hasHeader) {
      // Add header row
      const headerValues = [
        [
          'Timestamp',
          'SKU',
          'Listing Name',
          'Material',
          'Material SKU',
          'Category',
          'Weight',
          'Dropdown 2',
          'Dropdown 3',
          'Setting Type',
          'Enamel Type',
          'Active Channels',
          'Shopify Status',
          'Plating Types Count',
          'Die Numbers Count',
          'Variations Count',
          'Stone Info Count',
          'Final Stock Count',
        ],
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        resource: {
          values: headerValues,
        },
      });
    }

    // Append the product data
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:S',
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });

    return Response.json({
      success: true,
      message: 'Product data saved to Google Sheets successfully',
      response: response.data,
    });
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to save to Google Sheets',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
