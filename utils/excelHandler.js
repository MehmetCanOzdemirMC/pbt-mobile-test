/**
 * Excel Handler for React Native
 *
 * Replaces web's exceljs with xlsx library (React Native compatible)
 * Port from: /Users/ridvandereci/Documents/GitHub/PBTv1/src/utils/bulkImporter.js
 */

import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';

/**
 * Parse Excel file from URI
 * @param {string} fileUri - File URI from document picker
 * @returns {Promise<Array>} Parsed data as JSON
 */
export const parseExcelFile = async (fileUri) => {
  try {
    console.log('📄 Parsing Excel file:', fileUri);

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64
    });

    // Parse with xlsx
    const workbook = XLSX.read(base64, {
      type: 'base64',
      cellDates: true,
      cellNF: false,
      cellText: false
    });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON (raw: false for formatted strings)
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null,
      blankrows: false
    });

    console.log(`✅ Parsed ${data.length} rows from Excel`);

    return data;
  } catch (error) {
    console.error('❌ Excel parsing error:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Validate Excel data structure
 * @param {Array} data - Parsed Excel data
 * @param {Array} requiredColumns - Required column names
 * @returns {Object} { valid: boolean, errors: Array }
 */
export const validateExcelStructure = (data, requiredColumns = []) => {
  const errors = [];

  // Check if data exists
  if (!data || data.length === 0) {
    errors.push('Excel file is empty');
    return { valid: false, errors };
  }

  // Check required columns
  const firstRow = data[0];
  const actualColumns = Object.keys(firstRow);

  const missingColumns = requiredColumns.filter(
    col => !actualColumns.includes(col)
  );

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Check row limit (max 5000 for mobile performance)
  if (data.length > 5000) {
    errors.push(`File has ${data.length} rows. Maximum 5000 rows allowed on mobile.`);
  }

  // Warning for large files
  if (data.length > 3000) {
    console.warn(`⚠️ Large file: ${data.length} rows. Performance may be affected.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    rowCount: data.length,
    columns: actualColumns
  };
};

/**
 * Chunk data for batch processing
 * @param {Array} data - Data to chunk
 * @param {number} chunkSize - Size of each chunk (default 500)
 * @returns {Array<Array>} Chunked data
 */
export const chunkData = (data, chunkSize = 500) => {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Export data to Excel (for download/share)
 * @param {Array} data - Data to export
 * @param {string} fileName - Output file name
 * @returns {Promise<string>} File URI
 */
export const exportToExcel = async (data, fileName = 'export.xlsx') => {
  try {
    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Convert to base64
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // Save to file system
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64
    });

    console.log(`✅ Exported to: ${fileUri}`);
    return fileUri;
  } catch (error) {
    console.error('❌ Excel export error:', error);
    throw new Error(`Failed to export Excel: ${error.message}`);
  }
};
