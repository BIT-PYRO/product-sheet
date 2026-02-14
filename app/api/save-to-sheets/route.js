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
    const platingTypeDetails = data.platingType?.filter(p => p.col1 || p.col2 || p.col3).map(p => `${p.col1}|${p.col2}|${p.col3}`).join('; ') || '';
    
    const dieNumberDetails = data.manufacturing?.dieNumbers?.filter(d => d.dieNumber).map(d => `${d.dieNumber} (Qty: ${d.quantity})`).join('; ') || '';
    
    const variationDetails = data.variations?.filter(v => v.col1 || v.col2).map(v => `${v.label}: ${v.col1}/${v.col2}`).join('; ') || '';
    
    const stoneInfoDetails = data.stoneInfo?.filter(s => s.name).map(s => `${s.name} (Cut: ${s.cut}, Color: ${s.color}, Size: ${s.size}, Qty: ${s.quantity})`).join('; ') || '';
    
    const finalStockDetails = data.finalStock?.filter(f => f.sku).map(f => `${f.sku} - ${f.value} ${f.unit}`).join('; ') || '';

    const manufacturingNotes = data.manufacturing?.notes || '';
    
    const manufacturingImages = data.manufacturing?.images?.length > 0 ? `${data.manufacturing.images.length} image(s) uploaded` : '';

    const othersDetails = data.others?.filter(o => o.key).map(o => `${o.key}: ${o.value}`).join('; ') || '';

    // Format liveStock data
    const liveStockStages = ['rawMaterial', 'rawSetting', 'tyre', 'dustunuing', 'wipLiquidCasting', 'postCasting', 'filing', 'packing', 'setting', 'finalPolish', 'readyForPlacing'];
    
    const liveStockData = {};
    liveStockStages.forEach(stage => {
      const stageData = data.liveStock?.[stage] || { min: '', current: '', wip: '', location: '' };
      liveStockData[`${stage}_min`] = stageData.min || '';
      liveStockData[`${stage}_current`] = stageData.current || '';
      liveStockData[`${stage}_wip`] = stageData.wip || '';
      liveStockData[`${stage}_location`] = stageData.location || '';
    });

    // Prepare the complete row data
    const rowData = [
      new Date().toLocaleString(),
      data.sku || '',
      data.listingName || '',
      data.material || '',
      data.materialSku || '',
      data.dropdown1 || '',
      data.weightValue ? `${data.weightValue} ${data.weightUnit || ''}` : '',
      data.dropdown2 || '',
      data.dropdown3 || '',
      data.settingType || '',
      data.enamelType || '',
      data.activeChannels?.join(', ') || '',
      data.shopifyStatus || '',
      platingTypeDetails,
      data.platingType?.filter(p => p.col1 || p.col2 || p.col3).length || 0,
      dieNumberDetails,
      data.manufacturing?.dieNumbers?.filter(d => d.dieNumber).length || 0,
      variationDetails,
      data.variations?.filter(v => v.col1 || v.col2).length || 0,
      stoneInfoDetails,
      data.stoneInfo?.filter(s => s.name).length || 0,
      finalStockDetails,
      data.finalStock?.filter(f => f.sku).length || 0,
      manufacturingNotes,
      manufacturingImages,
      othersDetails,
      // Add all liveStock data
      ...liveStockStages.flatMap(stage => [
        liveStockData[`${stage}_min`],
        liveStockData[`${stage}_current`],
        liveStockData[`${stage}_wip`],
        liveStockData[`${stage}_location`],
      ]),
    ];

    // Define comprehensive headers
    const headerValues = [
      [
        'Last Updated',
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
        'Plating Types Details',
        'Plating Types Count',
        'Die Numbers Details',
        'Die Numbers Count',
        'Variations Details',
        'Variations Count',
        'Stone Info Details',
        'Stone Info Count',
        'Final Stock Details',
        'Final Stock Count',
        'Manufacturing Notes',
        'Manufacturing Images',
        'Others Details',
        // LiveStock Headers
        'Raw Material - Min',
        'Raw Material - Current',
        'Raw Material - WIP',
        'Raw Material - Location',
        'Raw Setting - Min',
        'Raw Setting - Current',
        'Raw Setting - WIP',
        'Raw Setting - Location',
        'Tyre - Min',
        'Tyre - Current',
        'Tyre - WIP',
        'Tyre - Location',
        'Dustunuing - Min',
        'Dustunuing - Current',
        'Dustunuing - WIP',
        'Dustunuing - Location',
        'WIP Liquid Casting - Min',
        'WIP Liquid Casting - Current',
        'WIP Liquid Casting - WIP',
        'WIP Liquid Casting - Location',
        'Post Casting - Min',
        'Post Casting - Current',
        'Post Casting - WIP',
        'Post Casting - Location',
        'Filing - Min',
        'Filing - Current',
        'Filing - WIP',
        'Filing - Location',
        'Packing - Min',
        'Packing - Current',
        'Packing - WIP',
        'Packing - Location',
        'Setting - Min',
        'Setting - Current',
        'Setting - WIP',
        'Setting - Location',
        'Final Polish - Min',
        'Final Polish - Current',
        'Final Polish - WIP',
        'Final Polish - Location',
        'Ready For Placing - Min',
        'Ready For Placing - Current',
        'Ready For Placing - WIP',
        'Ready For Placing - Location',
      ],
    ];

    // Get all existing data
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:A',
    });

    const existingRows = getResponse.data.values || [];
    const headerExists = existingRows.length > 0;

    // Add header if it doesn't exist
    if (!headerExists) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        resource: {
          values: headerValues,
        },
      });
    }

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
