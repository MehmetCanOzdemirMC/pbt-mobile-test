# Missing Dependencies Installation Guide

## Required Dependencies for Full Port

Run these commands to install all missing dependencies:

```bash
# Navigate to project
cd /Users/ridvandereci/Documents/GitHub/pbt-mobile-test

# Install missing dependencies
npm install xlsx@0.18.5
npm install expo-file-system
npm install @react-native-firebase/app@21.10.1
npm install @react-native-firebase/analytics@21.10.1
npm install react-native-fbsdk-next@14.2.1
npm install react-native-share@12.0.3
npm install react-native-qrcode-svg@7.0.0
npm install react-native-svg@16.0.0

# Install peer dependencies
npm install @react-native-community/datetimepicker (already installed)

# Optional: Install barcode scanner (for QR code scanning)
npx expo install expo-barcode-scanner
```

## Package List

### Core Libraries (New)
- ✅ `xlsx@0.18.5` - Excel file parsing (replaces exceljs)
- ✅ `expo-file-system` - File system access
- ✅ `react-native-share` - Native sharing functionality
- ✅ `react-native-qrcode-svg` - QR code generation
- ✅ `react-native-svg` - SVG support (required by qrcode-svg)

### Firebase Analytics
- ✅ `@react-native-firebase/app` - Firebase core
- ✅ `@react-native-firebase/analytics` - Google Analytics 4

### Facebook SDK
- ✅ `react-native-fbsdk-next` - Facebook SDK for React Native

### Optional
- ⏳ `expo-barcode-scanner` - QR code scanner (camera required)
- ⏳ `react-native-vision-camera` - Alternative camera library

## Already Installed (✓)
- ✅ `@react-navigation/material-top-tabs` - Admin dashboard tabs
- ✅ `react-native-webview` - 3D viewer (iJewel)
- ✅ `zustand` - State management
- ✅ `expo-document-picker` - File picker
- ✅ `date-fns` - Date formatting
- ✅ `@react-native-async-storage/async-storage` - AsyncStorage

## Post-Install Steps

### 1. iOS Setup (if using Firebase)
```bash
cd ios && pod install && cd ..
```

### 2. Android Setup (if using Facebook SDK)
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data
  android:name="com.facebook.sdk.ApplicationId"
  android:value="@string/facebook_app_id"/>
```

### 3. Environment Variables
Create `.env` file:
```
EXPO_PUBLIC_FB_APP_ID=your_facebook_app_id
EXPO_PUBLIC_FB_PIXEL_ID=your_pixel_id
EXPO_PUBLIC_GA4_MEASUREMENT_ID=your_ga4_id
```

### 4. Firebase Configuration
Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

## Verify Installation

Run this to check if all dependencies are installed:
```bash
npm list xlsx expo-file-system @react-native-firebase/analytics react-native-fbsdk-next
```

## Notes

- **xlsx**: Replaces `exceljs` which doesn't work on React Native
- **Firebase**: Requires native modules, needs rebuild after install
- **Facebook SDK**: Requires additional native configuration
- **QR Scanner**: Requires camera permissions (add to app.json)

## Troubleshomarks

### "Module not found: xlsx"
Solution: `npm install xlsx@0.18.5`

### "Invariant Violation: Native module cannot be null"
Solution: Rebuild app with `npx expo run:android` or `npx expo run:ios`

### Firebase not working
Solution:
1. Check `google-services.json` exists
2. Run `pod install` in ios folder
3. Rebuild app completely

### Facebook SDK errors
Solution:
1. Check Facebook App ID in `.env`
2. Add to AndroidManifest.xml
3. Rebuild native apps
