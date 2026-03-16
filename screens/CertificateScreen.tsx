/**
 * Certificate Screen
 *
 * Certificate verification with QR code scanner
 * Port from: web/src/components/CertificateVerificationModal.jsx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Camera, CheckCircle, XCircle, QrCode, RefreshCw } from 'lucide-react-native';
// import { BarCodeScanner } from 'expo-barcode-scanner'; // Uncomment when ready

interface CertificateResult {
  success: boolean;
  data?: any;
  message?: string;
  source?: string;
  error?: string;
}

export default function CertificateScreen({ navigation }: any) {
  const { theme } = useTheme();

  const [lab, setLab] = useState('GIA');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertificateResult | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Request camera permission (for QR scanner)
  useEffect(() => {
    // (async () => {
    //   const { status } = await BarCodeScanner.requestPermissionsAsync();
    //   setHasPermission(status === 'granted');
    // })();
  }, []);

  const handleVerify = async () => {
    if (!certificateNumber.trim()) {
      Alert.alert('Error', 'Please enter certificate number');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Mock verification (replace with real API call)
      // const response = await fetchCertificateData(lab, certificateNumber);

      // Mock success response for development
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResult: CertificateResult = {
        success: true,
        data: {
          shape: 'Round',
          carat: 1.5,
          color: 'D',
          clarity: 'VVS1',
          cut: 'Excellent',
          polish: 'Excellent',
          symmetry: 'Excellent',
          fluorescence: 'None',
          measurements: '7.35 x 7.32 x 4.55 mm',
          depth: 62.1,
          table: 57,
          certDate: '2024-01-15'
        },
        source: 'GIA API',
        message: 'Certificate verified successfully'
      };

      setResult(mockResult);
    } catch (error: any) {
      console.error('Verification error:', error);
      setResult({
        success: false,
        message: 'Verification failed',
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = () => {
    if (hasPermission === false) {
      Alert.alert('Permission Required', 'Camera permission is required to scan QR codes');
      return;
    }

    // TODO: Open QR scanner
    setShowScanner(true);
    Alert.alert('QR Scanner', 'QR scanner feature coming soon');
  };

  const handleReset = () => {
    setResult(null);
    setCertificateNumber('');
  };

  const labs = ['GIA', 'IGI', 'HRD', 'AGS', 'GCAL', 'GSI', 'EGL'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Certificate Verification</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Lab Selector */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Lab:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.labScroll}>
            {labs.map((l) => (
              <TouchableOpacity
                key={l}
                style={[
                  styles.labChip,
                  {
                    backgroundColor: lab === l ? theme.primary : theme.backgroundCard,
                    borderColor: theme.border
                  }
                ]}
                onPress={() => setLab(l)}
              >
                <Text style={[styles.labText, { color: lab === l ? '#fff' : theme.textPrimary }]}>
                  {l}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Certificate Number Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Certificate Number:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
                color: theme.textPrimary
              }]}
              placeholder="e.g. 2141234567"
              placeholderTextColor={theme.textSecondary}
              value={certificateNumber}
              onChangeText={setCertificateNumber}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.qrButton, { backgroundColor: theme.primary }]}
              onPress={handleQRScan}
              disabled={loading}
            >
              <QrCode size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Verify Button */}
        {!result && (
          <TouchableOpacity
            style={[styles.verifyButton, { backgroundColor: theme.primary }]}
            onPress={handleVerify}
            disabled={loading || !certificateNumber.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.verifyButtonText}>Verify Certificate</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Verifying certificate...
            </Text>
          </View>
        )}

        {/* Success Result */}
        {result?.success && result.data && (
          <View style={[styles.resultCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={styles.resultHeader}>
              <CheckCircle size={32} color={theme.success} />
              <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>
                Certificate Verified!
              </Text>
            </View>

            <View style={styles.resultGrid}>
              {Object.entries(result.data).map(([key, value]) => (
                <View key={key} style={styles.resultItem}>
                  <Text style={[styles.resultKey, { color: theme.textSecondary }]}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}:
                  </Text>
                  <Text style={[styles.resultValue, { color: theme.textPrimary }]}>
                    {String(value)}
                  </Text>
                </View>
              ))}
            </View>

            {result.source && (
              <Text style={[styles.sourceText, { color: theme.textSecondary }]}>
                Source: {result.source}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.resetButton, { borderColor: theme.border }]}
              onPress={handleReset}
            >
              <RefreshCw size={20} color={theme.textPrimary} />
              <Text style={[styles.resetButtonText, { color: theme.textPrimary }]}>
                Verify Another
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Result */}
        {result?.success === false && (
          <View style={[styles.errorCard, { backgroundColor: `${theme.error}20`, borderColor: theme.error }]}>
            <XCircle size={32} color={theme.error} />
            <Text style={[styles.errorTitle, { color: theme.error }]}>
              {result.message || 'Verification Failed'}
            </Text>
            {result.error && (
              <Text style={[styles.errorText, { color: theme.error }]}>
                {result.error}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.resetButton, { borderColor: theme.border }]}
              onPress={handleReset}
            >
              <RefreshCw size={20} color={theme.textPrimary} />
              <Text style={[styles.resetButtonText, { color: theme.textPrimary }]}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
          <Text style={[styles.infoTitle, { color: theme.primary }]}>How it works</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            1. Select the lab (GIA, IGI, etc.){'\n'}
            2. Enter certificate number or scan QR code{'\n'}
            3. Verify to get certificate details
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 16
  },
  section: {
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  labScroll: {
    flexDirection: 'row'
  },
  labChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8
  },
  labText: {
    fontSize: 14,
    fontWeight: '600'
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16
  },
  qrButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14
  },
  resultCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 20
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12
  },
  resultGrid: {
    gap: 12,
    marginBottom: 16
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  resultKey: {
    fontSize: 14,
    fontWeight: '500'
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600'
  },
  sourceText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600'
  },
  errorCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16
  },
  infoCard: {
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
    fontSize: 14,
    lineHeight: 22
  }
});
