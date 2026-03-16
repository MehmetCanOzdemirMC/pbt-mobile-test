/**
 * Bulk Import Screen
 *
 * 3-step wizard for bulk stone import
 * Port from: web/src/components/BulkImportModal.jsx
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Upload, CheckCircle, XCircle, ArrowLeft } from 'lucide-react-native';
import { pickExcelFile } from '../utils/fileUpload';
import { parseExcelFile, validateDataset } from '../utils/excelHandler';
import { importToFirestore } from '../utils/bulkImporter';
import { auth } from '../config/firebase';

enum Step {
  UPLOAD = 'upload',
  PREVIEW = 'preview',
  IMPORTING = 'importing',
  COMPLETE = 'complete'
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
}

export default function BulkImportScreen({ navigation }: any) {
  const { theme } = useTheme();
  const user = auth.currentUser;

  const [step, setStep] = useState<Step>(Step.UPLOAD);
  const [fileData, setFileData] = useState<any>(null);
  const [validatedData, setValidatedData] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = async () => {
    try {
      const file = await pickExcelFile();
      if (!file) return;

      Alert.alert('Processing', 'Parsing Excel file...');

      // Parse Excel file
      const rows = await parseExcelFile(file.uri);

      // Validate data
      const { valid, errors, data } = validateDataset(rows);

      if (!valid) {
        setError(`Validation errors:\n${errors.slice(0, 5).join('\n')}`);
        Alert.alert('Validation Error', `Found ${errors.length} errors. Please fix and try again.`);
        return;
      }

      setFileData({ name: file.name, rows: data.length });
      setValidatedData(data);
      setStep(Step.PREVIEW);
      setError(null);

      Alert.alert('Success', `Parsed ${data.length} rows successfully`);
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', 'Failed to parse Excel file');
      console.error(err);
    }
  };

  const handleConfirmImport = async () => {
    setStep(Step.IMPORTING);
    setError(null);

    try {
      const result = await importToFirestore(
        validatedData,
        user?.uid || '',
        fileData.name,
        (current, total) => {
          setImportProgress({ current, total });
        }
      );

      setImportResult(result);
      setStep(Step.COMPLETE);
    } catch (err: any) {
      console.error('Import failed:', err);
      setError(err.message);
      setStep(Step.PREVIEW);
      Alert.alert('Error', 'Import failed. Please try again.');
    }
  };

  const handleReset = () => {
    setStep(Step.UPLOAD);
    setFileData(null);
    setValidatedData([]);
    setImportProgress({ current: 0, total: 0 });
    setImportResult(null);
    setError(null);
  };

  const progressPercent = importProgress.total > 0
    ? Math.round((importProgress.current / importProgress.total) * 100)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
        {step !== Step.UPLOAD && step !== Step.IMPORTING && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: theme.textPrimary }]}>Bulk Import</Text>
      </View>

      {/* Step Indicator */}
      <View style={[styles.stepIndicator, { backgroundColor: theme.backgroundCard }]}>
        <View style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: step === Step.UPLOAD ? theme.primary : step !== Step.UPLOAD ? theme.success : theme.border }
          ]}>
            <Text style={styles.stepNumber}>1</Text>
          </View>
          <Text style={[styles.stepLabel, { color: theme.textSecondary }]}>Upload</Text>
        </View>

        <View style={[styles.stepLine, { backgroundColor: theme.border }]} />

        <View style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            {
              backgroundColor:
                step === Step.PREVIEW ? theme.primary :
                [Step.IMPORTING, Step.COMPLETE].includes(step) ? theme.success :
                theme.border
            }
          ]}>
            <Text style={styles.stepNumber}>2</Text>
          </View>
          <Text style={[styles.stepLabel, { color: theme.textSecondary }]}>Preview</Text>
        </View>

        <View style={[styles.stepLine, { backgroundColor: theme.border }]} />

        <View style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            {
              backgroundColor:
                [Step.IMPORTING, Step.COMPLETE].includes(step) ? theme.success :
                theme.border
            }
          ]}>
            <Text style={styles.stepNumber}>3</Text>
          </View>
          <Text style={[styles.stepLabel, { color: theme.textSecondary }]}>Import</Text>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorBox, { backgroundColor: `${theme.error}20`, borderColor: theme.error }]}>
          <XCircle size={20} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Step 1: Upload */}
        {step === Step.UPLOAD && (
          <View style={styles.uploadView}>
            <TouchableOpacity
              style={[styles.uploadBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              onPress={handleSelectFile}
            >
              <Upload size={48} color={theme.primary} />
              <Text style={[styles.uploadTitle, { color: theme.textPrimary }]}>Select Excel File</Text>
              <Text style={[styles.uploadHint, { color: theme.textSecondary }]}>
                .xls, .xlsx (max 10MB, 5000 rows)
              </Text>
            </TouchableOpacity>

            <View style={[styles.infoCard, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
              <Text style={[styles.infoTitle, { color: theme.primary }]}>Required Columns</Text>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                shape, carat, color, clarity, cut, polish, symmetry, fluorescence, lab, certificate, price
              </Text>
            </View>
          </View>
        )}

        {/* Step 2: Preview */}
        {step === Step.PREVIEW && fileData && (
          <View style={styles.previewView}>
            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>Import Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>File:</Text>
                <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>{fileData.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Rows:</Text>
                <Text style={[styles.summaryValue, { color: theme.primary }]}>{fileData.rows}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: theme.primary }]}
              onPress={handleConfirmImport}
            >
              <Text style={styles.confirmButtonText}>Confirm & Import</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={() => setStep(Step.UPLOAD)}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Importing */}
        {step === Step.IMPORTING && (
          <View style={styles.importingView}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.importingTitle, { color: theme.textPrimary }]}>Importing...</Text>
            <Text style={[styles.importingText, { color: theme.textSecondary }]}>
              Please wait, this may take a few minutes
            </Text>

            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[styles.progressFill, { backgroundColor: theme.primary, width: `${progressPercent}%` }]}
              />
            </View>

            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              {importProgress.current} / {importProgress.total} ({progressPercent}%)
            </Text>
          </View>
        )}

        {/* Step 4: Complete */}
        {step === Step.COMPLETE && importResult && (
          <View style={styles.completeView}>
            {importResult.success ? (
              <CheckCircle size={64} color={theme.success} />
            ) : (
              <XCircle size={64} color={theme.warning} />
            )}

            <Text style={[styles.completeTitle, { color: theme.textPrimary }]}>
              {importResult.success ? 'Import Complete!' : 'Partial Import'}
            </Text>

            <Text style={[styles.completeMessage, { color: theme.textSecondary }]}>
              {importResult.success
                ? `Successfully imported ${importResult.imported} stones`
                : `Imported ${importResult.imported} stones, ${importResult.failed} failed`
              }
            </Text>

            <View style={styles.resultStats}>
              <View style={styles.resultStat}>
                <Text style={[styles.resultValue, { color: theme.success }]}>{importResult.imported}</Text>
                <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>Imported</Text>
              </View>
              {importResult.failed > 0 && (
                <View style={styles.resultStat}>
                  <Text style={[styles.resultValue, { color: theme.error }]}>{importResult.failed}</Text>
                  <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>Failed</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                handleReset();
                navigation.goBack();
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.newImportButton, { borderColor: theme.border }]}
              onPress={handleReset}
            >
              <Text style={[styles.newImportButtonText, { color: theme.textPrimary }]}>Import Another File</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  backBtn: {
    marginRight: 12
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16
  },
  stepItem: {
    alignItems: 'center'
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  stepNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  stepLabel: {
    fontSize: 12
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1
  },
  errorText: {
    flex: 1,
    fontSize: 14
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 16
  },
  uploadView: {
    alignItems: 'center'
  },
  uploadBox: {
    width: '100%',
    alignItems: 'center',
    padding: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 24
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8
  },
  uploadHint: {
    fontSize: 14
  },
  infoCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14
  },
  previewView: {
    alignItems: 'stretch'
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  summaryLabel: {
    fontSize: 14
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600'
  },
  confirmButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16
  },
  importingView: {
    alignItems: 'center',
    paddingVertical: 48
  },
  importingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8
  },
  importingText: {
    fontSize: 14,
    marginBottom: 32
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  progressText: {
    fontSize: 14
  },
  completeView: {
    alignItems: 'center',
    paddingVertical: 32
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12
  },
  completeMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32
  },
  resultStats: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32
  },
  resultStat: {
    alignItems: 'center'
  },
  resultValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8
  },
  resultLabel: {
    fontSize: 14
  },
  doneButton: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  newImportButton: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center'
  },
  newImportButtonText: {
    fontSize: 16
  }
});
