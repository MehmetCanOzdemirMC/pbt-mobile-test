/**
 * File Upload Utilities for React Native
 *
 * Handles file selection and validation for mobile
 * Replaces web's react-dropzone with expo-document-picker
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

/**
 * File size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  EXCEL: 10 * 1024 * 1024, // 10MB for Excel files
  IMAGE: 5 * 1024 * 1024,  // 5MB for images
  PDF: 10 * 1024 * 1024,   // 10MB for PDFs
  MODEL_3D: 50 * 1024 * 1024 // 50MB for 3D models
};

/**
 * Supported file types
 */
export const FILE_TYPES = {
  EXCEL: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  CSV: ['text/csv', 'text/comma-separated-values'],
  IMAGE: ['image/jpeg', 'image/png', 'image/jpg'],
  PDF: ['application/pdf'],
  MODEL_3D: ['model/gltf-binary', 'model/gltf+json', 'model/obj', 'application/octet-stream']
};

/**
 * Pick Excel or CSV file
 * @param {Object} options - Picker options
 * @returns {Promise<Object>} Selected file info
 */
export const pickExcelFile = async (options = {}) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
      copyToCacheDirectory: true,
      multiple: false,
      ...options
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];

    // Validate file size
    const fileInfo = await FileSystem.getInfoAsync(file.uri);
    if (fileInfo.size > FILE_SIZE_LIMITS.EXCEL) {
      Alert.alert(
        'File Too Large',
        `Maximum file size is ${FILE_SIZE_LIMITS.EXCEL / (1024 * 1024)}MB`
      );
      return null;
    }

    return {
      uri: file.uri,
      name: file.name,
      size: fileInfo.size,
      mimeType: file.mimeType
    };
  } catch (error) {
    console.error('❌ File picker error:', error);
    Alert.alert('Error', 'Failed to select file');
    return null;
  }
};

/**
 * Pick image file
 * @returns {Promise<Object>} Selected image info
 */
export const pickImageFile = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];
    const fileInfo = await FileSystem.getInfoAsync(file.uri);

    if (fileInfo.size > FILE_SIZE_LIMITS.IMAGE) {
      Alert.alert(
        'Image Too Large',
        `Maximum image size is ${FILE_SIZE_LIMITS.IMAGE / (1024 * 1024)}MB`
      );
      return null;
    }

    return {
      uri: file.uri,
      name: file.name,
      size: fileInfo.size,
      mimeType: file.mimeType
    };
  } catch (error) {
    console.error('❌ Image picker error:', error);
    Alert.alert('Error', 'Failed to select image');
    return null;
  }
};

/**
 * Pick PDF file
 * @returns {Promise<Object>} Selected PDF info
 */
export const pickPDFFile = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];
    const fileInfo = await FileSystem.getInfoAsync(file.uri);

    if (fileInfo.size > FILE_SIZE_LIMITS.PDF) {
      Alert.alert(
        'PDF Too Large',
        `Maximum PDF size is ${FILE_SIZE_LIMITS.PDF / (1024 * 1024)}MB`
      );
      return null;
    }

    return {
      uri: file.uri,
      name: file.name,
      size: fileInfo.size,
      mimeType: file.mimeType
    };
  } catch (error) {
    console.error('❌ PDF picker error:', error);
    Alert.alert('Error', 'Failed to select PDF');
    return null;
  }
};

/**
 * Pick 3D model file
 * @returns {Promise<Object>} Selected model info
 */
export const pick3DModelFile = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // 3D model types may not be recognized, allow all
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];

    // Check file extension
    const validExtensions = ['.glb', '.gltf', '.fbx', '.obj'];
    const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      Alert.alert(
        'Invalid File Type',
        'Please select a 3D model file (.glb, .gltf, .fbx, .obj)'
      );
      return null;
    }

    const fileInfo = await FileSystem.getInfoAsync(file.uri);

    if (fileInfo.size > FILE_SIZE_LIMITS.MODEL_3D) {
      Alert.alert(
        'Model Too Large',
        `Maximum 3D model size is ${FILE_SIZE_LIMITS.MODEL_3D / (1024 * 1024)}MB`
      );
      return null;
    }

    return {
      uri: file.uri,
      name: file.name,
      size: fileInfo.size,
      mimeType: file.mimeType,
      extension: file.name.split('.').pop()
    };
  } catch (error) {
    console.error('❌ 3D model picker error:', error);
    Alert.alert('Error', 'Failed to select 3D model');
    return null;
  }
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Validate file before upload
 * @param {Object} file - File info
 * @param {Object} options - Validation options
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = FILE_SIZE_LIMITS.EXCEL,
    allowedTypes = [],
    allowedExtensions = []
  } = options;

  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(maxSize)}`
    };
  }

  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimeType)) {
    return {
      valid: false,
      error: 'File type not allowed'
    };
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension .${extension} not allowed`
      };
    }
  }

  return { valid: true };
};
