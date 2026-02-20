import { google } from 'googleapis';

const PRODUCT_HEADERS = [
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
  'Live Stock Data',
  'Final Stock Data',
];

const DEFAULT_LIVE_STOCK = {
  rawMaterial: { min: '', current: '', wip: '', location: '' },
  rawSetting: { min: '', current: '', wip: '', location: '' },
  tyre: { min: '', current: '', wip: '', location: '' },
  dustunuing: { min: '', current: '', wip: '', location: '' },
  wipLiquidCasting: { min: '', current: '', wip: '', location: '' },
  postCasting: { min: '', current: '', wip: '', location: '' },
  filing: { min: '', current: '', wip: '', location: '' },
  packing: { min: '', current: '', wip: '', location: '' },
  setting: { min: '', current: '', wip: '', location: '' },
  finalPolish: { min: '', current: '', wip: '', location: '' },
  readyForPlacing: { min: '', current: '', wip: '', location: '' },
};

function normalizeLiveStockKeys(rawStock = {}) {
  const normalized = {
    ...DEFAULT_LIVE_STOCK,
    ...rawStock,
  };

  const aliases = [
    ['filing', ['filling']],
    ['packing', ['prePolish']],
    ['wipLiquidCasting', ['casting', 'tyre']],
    ['postCasting', ['finalCasting', 'dustunuing']],
    ['readyForPlacing', ['readyForPlating']],
  ];

  aliases.forEach(([targetKey, sourceKeys]) => {
    if (
      normalized[targetKey] &&
      Object.values(normalized[targetKey]).some((value) => String(value || '').trim() !== '')
    ) {
      return;
    }

    const match = sourceKeys
      .map((key) => normalized[key])
      .find((value) => value && typeof value === 'object');

    if (match) {
      normalized[targetKey] = {
        ...DEFAULT_LIVE_STOCK[targetKey],
        ...match,
      };
    }
  });

  return normalized;
}

function safeParseJson(value, fallback) {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function mapLiveStockData(rawValue) {
  const parsed = safeParseJson(rawValue, {});

  return normalizeLiveStockKeys(parsed);
}

async function getSheetIdByTitle(sheets, spreadsheetId, title) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))',
  });

  const sheet = (metadata.data.sheets || []).find(
    (entry) => entry.properties?.title === title
  );

  return sheet?.properties?.sheetId;
}

async function applyMasterProductWrapping(sheets, spreadsheetId, sheetTitle = 'Sheet1') {
  const sheetId = await getSheetIdByTitle(sheets, spreadsheetId, sheetTitle);

  if (typeof sheetId !== 'number') {
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              startColumnIndex: 0,
              endColumnIndex: PRODUCT_HEADERS.length,
            },
            cell: {
              userEnteredFormat: {
                wrapStrategy: 'WRAP',
                verticalAlignment: 'TOP',
              },
            },
            fields: 'userEnteredFormat.wrapStrategy,userEnteredFormat.verticalAlignment',
          },
        },
      ],
    },
  });
}

function getCredentials() {
  return {
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
}

function getSheetsClient() {
  return google.sheets({
    version: 'v4',
    auth: new google.auth.GoogleAuth({
      credentials: getCredentials(),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }),
  });
}

function mapSheetRowsToProducts(rows) {
  if (!rows || rows.length === 0) {
    return [];
  }

  const firstRow = rows[0] || [];
  const hasHeader = String(firstRow[1] || '').trim().toLowerCase() === 'sku';
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .map((row, index) => {
      const getValue = (columnIndex) => row[columnIndex] || '';
      const hasAnyValue = row.some((cell) => String(cell || '').trim() !== '');

      if (!hasAnyValue) {
        return null;
      }

      return {
        id: index,
        lastUpdated: getValue(0),
        sku: getValue(1),
        listingName: getValue(2),
        material: getValue(3),
        weight: getValue(4),
        category: getValue(5),
        collection: getValue(6),
        settingType: getValue(7),
        enamelType: getValue(8),
        activeChannels: getValue(9),
        shopifyStatus: getValue(10),
        dieNumberFindings: getValue(11),
        masterSku: getValue(12),
        color: getValue(13),
        enamel: getValue(14),
        stoneName: getValue(15),
        stoneCut: getValue(16),
        stoneColor: getValue(17),
        stoneSize: getValue(18),
        stoneQuantity: getValue(19),
        platingType: getValue(20),
        platingColor: getValue(21),
        notes: getValue(22),
        images: getValue(23),
        liveStock: mapLiveStockData(getValue(24)),
        finalStock: safeParseJson(getValue(25), []),
      };
    })
    .filter(Boolean);
}

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:Z',
    });

    const rows = response.data.values || [];
    const products = mapSheetRowsToProducts(rows);

    return Response.json({
      success: true,
      products,
      total: products.length,
    });
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to fetch from Google Sheets',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Get credentials from environment variables
    const sheets = getSheetsClient();

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
    
    // Extract color and enamel from variations (support multiple rows per field)
    const formatVariationEntry = (left, right) => {
      const leftValue = String(left || '').trim();
      const rightValue = String(right || '').trim();

      if (leftValue && rightValue) {
        return `${leftValue} (${rightValue})`;
      }

      return leftValue || rightValue || '';
    };

    const colorValue = (data.variations || [])
      .filter((v) => String(v.label || '').toUpperCase() === 'COLOR')
      .map((v) => formatVariationEntry(v.col1, v.col2))
      .filter(Boolean)
      .join('; ');

    const enamelValue = (data.variations || [])
      .filter((v) => String(v.label || '').toUpperCase() === 'ENAMEL')
      .map((v) => formatVariationEntry(v.col1, v.col2))
      .filter(Boolean)
      .join('; ');

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
      JSON.stringify(normalizeLiveStockKeys(data.liveStock || DEFAULT_LIVE_STOCK)),
      JSON.stringify(data.finalStock || []),
    ];

    // Define comprehensive headers matching your fields
    const headerValues = [PRODUCT_HEADERS];

    // Always update headers to ensure they match the current structure
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource: {
        values: headerValues,
      },
    });

    await applyMasterProductWrapping(sheets, spreadsheetId, 'Sheet1');

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

export async function DELETE(request) {
  try {
    const { sku } = await request.json();
    
    if (!sku) {
      return Response.json(
        { success: false, message: 'SKU is required' },
        { status: 400 }
      );
    }
    
    // Get credentials from environment variables
    const sheets = getSheetsClient();

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Get all data to find the SKU
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:B',
    });

    const rows = getResponse.data.values || [];
    
    // Find the row with matching SKU (Column B)
    const rowIndex = rows.findIndex((row, index) => {
      if (index === 0) return false; // Skip header
      return row[1] === sku; // Column B is SKU
    });

    if (rowIndex === -1) {
      return Response.json(
        { success: false, message: `Product with SKU "${sku}" not found` },
        { status: 404 }
      );
    }

    // Delete the row (rowIndex is 0-based, but sheet rows are 1-based)
    const rowNumber = rowIndex + 1;
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // First sheet
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    return Response.json({
      success: true,
      message: `Product with SKU "${sku}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting from Google Sheets:', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to delete from Google Sheets',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
