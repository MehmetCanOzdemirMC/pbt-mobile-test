/**
 * iJewel 3D Viewer Component
 * WebView wrapper for iJewel Drive SDK
 * Port from: web/src/components/custom-design/IJewelViewer.jsx
 */

import React, { useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../context/ThemeContext';

interface IJewelWebViewProps {
  iJewelUrl?: string;
  modelUrl?: string;
  selectedMetal?: string;
  onLoad?: () => void;
  onError?: (error: any) => void;
}

/**
 * Get iJewel embed URL from iJewel Drive URL or model URL
 */
const getEmbedUrl = (iJewelUrl?: string, modelUrl?: string): string | null => {
  if (iJewelUrl) {
    // iJewel Drive URL format: https://ijewel3d.com/drive/view/xyz
    // Convert to embed: https://ijewel3d.com/embed/xyz
    const match = iJewelUrl.match(/drive\/view\/([^/?]+)/);
    if (match) {
      return `https://ijewel3d.com/embed/${match[1]}?controls=true&autorotate=true`;
    }
    return iJewelUrl;
  }

  if (modelUrl) {
    // Direct 3D model URL (.glb, .gltf)
    // Use model-viewer web component
    return null; // Will show fallback with direct model URL
  }

  return null;
};

export default function IJewelWebView({
  iJewelUrl,
  modelUrl,
  selectedMetal = 'white_gold',
  onLoad,
  onError,
}: IJewelWebViewProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  const embedUrl = getEmbedUrl(iJewelUrl, modelUrl);

  // HTML for direct model viewing with model-viewer
  const modelViewerHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: ${theme.background};
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
          }
          model-viewer {
            width: 100%;
            height: 100%;
            --poster-color: ${theme.background};
          }
          .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: ${theme.textSecondary};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
        </style>
      </head>
      <body>
        <model-viewer
          src="${modelUrl}"
          alt="3D Model"
          auto-rotate
          camera-controls
          environment-image="neutral"
          shadow-intensity="1"
          loading="eager"
        >
          <div class="loading" slot="poster">Loading 3D Model...</div>
        </model-viewer>
      </body>
    </html>
  `;

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[IJewelWebView] Error loading:', nativeEvent);
    setError('Failed to load 3D viewer');
    setLoading(false);
    onError?.(nativeEvent);
  };

  if (!embedUrl && !modelUrl) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.fallback}>
          <Text style={[styles.fallbackText, { color: theme.textSecondary }]}>
            No 3D model available
          </Text>
          <Text style={[styles.fallbackSubtext, { color: theme.textTertiary }]}>
            3D preview will be available once the model is uploaded
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.fallback}>
          <Text style={[styles.fallbackText, { color: theme.error }]}>
            {error}
          </Text>
          <Text style={[styles.fallbackSubtext, { color: theme.textSecondary }]}>
            Please try again later
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading 3D viewer...
          </Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={
          embedUrl
            ? { uri: embedUrl }
            : { html: modelViewerHTML }
        }
        style={styles.webview}
        onLoad={handleLoad}
        onError={handleError}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        scalesPageToFit={true}
        startInLoadingState={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  fallbackText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
