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

    // Format all the detailed data
    const dieNumberDetails = data.manufacturing?.dieNumbers?.filter(d => d.dieNumber).map(d => `${d.dieNumber} (Qty: ${d.quantity})`).join('; ') || '';
    
    const stoneInfoDetails = data.stoneInfo?.filter(s => s.name).map(s => 
      `Name: ${s.name}, Cut: ${s.cut || ''}, Color: ${s.color || ''}, Size: ${s.size || ''}, Qty: ${s.quantity || ''}`
    ).join('; ') || '';
    
    const platingTypeDetails = data.platingType?.filter(p => p.col1 || p.col2).map(p => 
      `Type: ${p.col1 || ''}, Color: ${p.col2 || ''}`
    ).join('; ') || '';

    const manufacturingNotes = data.manufacturing?.notes || '';
    
    const manufacturingImages = data.manufacturing?.images?.length > 0 ? `${data.manufacturing.images.length} image(s) uploaded` : '';
    
    // Extract color and enamel from variations
    const colorVariation = data.variations?.find(v => v.label === 'COLOR');
    const enamelVariation = data.variations?.find(v => v.label === 'ENAMEL');
    const colorValue = colorVariation ? (colorVariation.col1 || colorVariation.col2 || '') : '';
    const enamelValue = enamelVariation ? (enamelVariation.col1 || enamelVariation.col2 || '') : '';

    // Prepare the complete row data matching your form fields exactly
    const rowData = [
      new Date().toLocaleString(),
      data.sku || '',
      data.listingName || '',
      data.dropdown1 || '',  // Material
      data.weightValue && data.weightUnit ? `${data.weightValue} ${data.weightUnit}` : '',
      data.dropdown2 || '',  // Category
      data.dropdown3 || '',  // Collection
      data.settingType || '',
      data.enamelType || '',
      data.activeChannels?.join(', ') || '',
      data.shopifyStatus || '',
      dieNumberDetails,
      data.materialSku || '',  // Master SKU
      colorValue,  // Color from variations
      enamelValue,  // Enamel from variations
      data.stoneInfo?.map(s => s.name || '').join('; ') || '',
      data.stoneInfo?.map(s => s.cut || '').join('; ') || '',
      data.stoneInfo?.map(s => s.color || '').join('; ') || '',
      data.stoneInfo?.map(s => s.size || '').join('; ') || '',
      data.stoneInfo?.map(s => s.quantity || '').join('; ') || '',
      data.platingType?.map(p => p.col1 || '').join('; ') || '',  // Plating Type from col1
      data.platingType?.map(p => p.col2 || '').join('; ') || '',  // Plating Color from col2
      manufacturingNotes,
      manufacturingImages,
    ];

    // Define comprehensive headers matching your fields
    const headerValues = [
      [
        'Last Updated',
        'SKU',
        'Listing Name',
        'Material',
        'Weight',
        'Category',
        'Collection',
        'Setting Type',
        'Enamel Type',
        'Active Channels',
        'Shopify Status',
        'Die Number/Findings',
        'Master SKU',
        'Color',
        'Enamel',
        'Stone Name',
        'Stone Cut',
        'Stone Color',
        'Stone Size',
        'Stone Quantity',
        'Plating Type',
        'Plating Color',
        'Notes',
        'Images',
      ],
    ];

    // Always update headers to ensure they match the current structure
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource: {
        values: headerValues,
      },
    });

    // Get all existing data (starting from row 2 to skip header)
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:B',
    });

    const existingRows = getResponse.data.values || [];

    // Find if SKU already exists
    const skuIndex = existingRows.findIndex((row, index) => {
      if (index === 0) return false; // Skip header
      return row[1] === data.sku; // Column B is SKU
    });

    if (skuIndex > 0) {
      // Update existing row
      const rowNumber = skuIndex + 1;
      const colEnd = String.fromCharCode(64 + headerValues[0].length); // Convert number to column letter
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!A${rowNumber}:${colEnd}${rowNumber}`,
        valueInputOption: 'RAW',
        resource: {
          values: [rowData],
        },
      });

      return Response.json({
        success: true,
        message: `Product updated successfully in row ${rowNumber}`,
        isUpdate: true,
      });
    } else {
      // Append new row
      const colEnd = String.fromCharCode(64 + headerValues[0].length);
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `Sheet1!A:${colEnd}`,
        valueInputOption: 'RAW',
        resource: {
          values: [rowData],
        },
      });

      return Response.json({
        success: true,
        message: 'Product added successfully to Google Sheets',
        isUpdate: false,
        response: response.data,
      });
    }
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
