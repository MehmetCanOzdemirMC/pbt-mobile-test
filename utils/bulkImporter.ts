/**
 * Bulk Importer Utility (React Native)
 *
 * Handles batch import to Firestore
 * Port from: web/src/utils/bulkImporter.js (simplified)
 */

import { db } from '../config/firebase';
import {
  collection,
  writeBatch,
  doc,
  serverTimestamp,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { trackBulkImportCompleted } from './tracking/analytics';
import { trackBulkImport } from './tracking/fbPixel';

const BATCH_SIZE = 500; // Firestore batch write limit (mobile: use 500 for safety)

/**
 * Extract lab name from certification URL
 */
const extractLabFromUrl = (url: string): string => {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('igiworldwide') || lowerUrl.includes('igi.org')) return 'IGI';
  if (lowerUrl.includes('gia.edu') || lowerUrl.includes('gia.org')) return 'GIA';
  if (lowerUrl.includes('hrd') || lowerUrl.includes('hrdantwerp')) return 'HRD';
  if (lowerUrl.includes('gcal')) return 'GCAL';
  if (lowerUrl.includes('ags') || lowerUrl.includes('americangemsociety')) return 'AGS';
  if (lowerUrl.includes('egl')) return 'EGL';
  if (lowerUrl.includes('gsi')) return 'GSI';

  console.warn(`⚠️ Unable to extract lab name from URL: ${url}`);
  return '';
};

/**
 * Extract certificate number from certification URL
 */
const extractCertNumberFromUrl = (url: string): string => {
  try {
    const patterns = [
      /[?&]r=([A-Z0-9]+)/i,
      /[?&]reportno=([A-Z0-9]+)/i,
      /[?&]certificate=([A-Z0-9]+)/i,
      /[?&]cert=([A-Z0-9]+)/i,
      /[?&]number=([A-Z0-9]+)/i,
      /[?&]id=([A-Z0-9]+)/i,
      /\/([A-Z0-9]{8,})[\/?]?$/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    console.warn(`⚠️ Unable to extract certificate number from URL: ${url}`);
    return '';
  } catch (error) {
    console.error('Error extracting cert number:', error);
    return '';
  }
};

/**
 * Get the next PB stock code number
 */
const getNextPBStockNumber = async (): Promise<number> => {
  try {
    const stonesRef = collection(db, 'stones');
    const q = query(stonesRef, orderBy('stoneId', 'desc'), limit(100));
    const snapshot = await getDocs(q);

    let maxNumber = 0;

    snapshot.forEach(docSnap => {
      const stoneId = docSnap.data().stoneId;
      if (stoneId && stoneId.startsWith('PB-')) {
        const numberPart = stoneId.replace('PB-', '');
        const num = parseInt(numberPart, 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    return maxNumber + 1;
  } catch (error) {
    console.error('Failed to get next PB stock number:', error);
    return 1;
  }
};

/**
 * Generate PB stock code with import date
 */
const generatePBStockCode = (number: number): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  return `PB${dateStr}-${number}`;
};

/**
 * Normalize row data
 */
const normalizeRow = (row: any): any => {
  return {
    shape: row.shape || '',
    carat: parseFloat(row.carat) || 0,
    color: row.color || '',
    clarity: row.clarity || '',
    cut: row.cut || '',
    polish: row.polish || '',
    symmetry: row.symmetry || '',
    fluorescence: row.fluorescence || 'None',
    lab: row.lab || '',
    certificate: row.certificate || '',
    report_no: row.report_no || row.reportNo || row.certificateNumber || '',
    video: row.video || '',
    image: row.image || '',
    pricePerCarat: parseFloat(row.pricePerCarat) || 0,
    totalPrice: parseFloat(row.totalPrice) || 0,
    location: row.location || '',
    measurements: row.measurements || '',
    depth: parseFloat(row.depth) || 0,
    table: parseFloat(row.table) || 0,
    stoneId: row.stoneId || '',
    supplierStockNumber: row.supplierStockNumber || '',
    status: 'available',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
};

/**
 * Chunk array into smaller arrays
 */
const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Import data to Firestore in batches
 */
export const importToFirestore = async (
  data: any[],
  supplierId: string,
  fileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; imported: number; failed: number }> => {
  try {
    // Create import log
    const importLogRef = await addDoc(collection(db, 'import_logs'), {
      supplierId,
      fileName,
      uploadedAt: serverTimestamp(),
      totalRows: data.length,
      status: 'processing',
      successCount: 0,
      errorCount: 0
    });

    const importBatchId = importLogRef.id;

    // Filter valid rows
    const validRows = data.filter((row: any) => row._valid !== false);

    // Get next PB stock number
    let nextPBNumber = await getNextPBStockNumber();

    let imported = 0;
    let failed = 0;

    // Split into chunks
    const chunks = chunkArray(validRows, BATCH_SIZE);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        const batch = writeBatch(db);
        const stonesRef = collection(db, 'stones');

        chunk.forEach((row: any) => {
          // Normalize data
          const normalized = normalizeRow(row);

          // Process lab URL if present
          if (normalized.lab && typeof normalized.lab === 'string') {
            const labStr = String(normalized.lab).trim();
            if (labStr.startsWith('http://') || labStr.startsWith('https://') ||
                labStr.includes('.com') || labStr.includes('.net')) {
              const extractedLab = extractLabFromUrl(labStr);
              const extractedCertNo = extractCertNumberFromUrl(labStr);

              if (!normalized.video) {
                normalized.video = labStr;
              }

              normalized.lab = extractedLab;

              if (extractedCertNo && !normalized.report_no) {
                normalized.report_no = extractedCertNo;
              }
            }
          }

          // Process certificate URL if present
          if (normalized.certificate && typeof normalized.certificate === 'string') {
            const certStr = String(normalized.certificate).trim();
            if (certStr.startsWith('http://') || certStr.startsWith('https://') ||
                certStr.includes('.com') || certStr.includes('.net')) {
              if (!normalized.lab) {
                const extractedLab = extractLabFromUrl(certStr);
                normalized.lab = extractedLab;
              }

              const extractedCertNo = extractCertNumberFromUrl(certStr);
              if (extractedCertNo && !normalized.report_no) {
                normalized.report_no = extractedCertNo;
              }
            }
          }

          // Generate PB stock code
          if (!normalized.stoneId) {
            normalized.pbStockCode = generatePBStockCode(nextPBNumber);
            normalized.stoneId = normalized.pbStockCode;
            nextPBNumber++;
          }

          // Add metadata
          normalized.supplierId = supplierId;
          normalized.importBatchId = importBatchId;
          normalized.createdAt = serverTimestamp();
          normalized.updatedAt = serverTimestamp();

          const newDocRef = doc(stonesRef);
          batch.set(newDocRef, normalized);
        });

        await batch.commit();
        imported += chunk.length;

        // Progress callback
        if (onProgress) {
          onProgress(imported, validRows.length);
        }
      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error);
        failed += chunk.length;
      }
    }

    // Track analytics
    trackBulkImportCompleted(imported, fileName);
    trackBulkImport(imported);

    return {
      success: failed === 0,
      imported,
      failed
    };
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
};
