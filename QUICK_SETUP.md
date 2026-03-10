# 🚀 Quick Setup Guide - PBT Mobile App

## 📦 1. Install Dependencies (Required)

```bash
cd pbt-mobile-test
npm install @google/generative-ai qrcode @sentry/react-native expo-crypto
```

## 🔧 2. Environment Configuration

Create `.env` file:

```env
# Gemini AI Search (REQUIRED for AI search)
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyDtO94pOlvTomcQsSOslHLoRCOpi0iVMQk

# Sentry Error Monitoring (Optional but recommended)
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
EXPO_PUBLIC_APP_VERSION=1.0.0

# Firebase App Check (Optional - web only)
EXPO_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

## ▶️ 3. Run the App

```bash
npx expo start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on your phone

## ✅ 4. Test New Features

### Test Video Display:
1. Go to Marketplace
2. Tap any diamond
3. Check if video/360° view displays

### Test AI Search:
1. Go to Marketplace
2. Type: "2 ct 5 adet taş lazım"
3. Should show 2 carat diamonds (max 5 results)

### Test Analytics:
- Check console for: `📊 Analytics: view_item`
- All interactions are tracked automatically

## 🎯 What's New?

✅ **Video Player** - CloudFront 360° views, YouTube, Vimeo
✅ **AI Search** - Natural language in 8 languages
✅ **Analytics** - Firebase Analytics (GA4 equivalent)
✅ **App Check** - API security
✅ **Sentry** - Error monitoring
✅ **2FA** - Two-factor authentication

## 📚 Full Documentation

See `WEB_TO_MOBILE_PORT_SUMMARY.md` for complete details.

## 🆘 Troubleshooting

**Videos not loading?**
- Check internet connection
- Verify video URL is valid CloudFront link
- Check console for WebView errors

**AI search not working?**
- Verify EXPO_PUBLIC_GEMINI_API_KEY in `.env`
- Check console for: `✅ Gemini AI initialized`
- Fallback regex search works even without API key

**Analytics not tracking?**
- Check Firebase console for events (may take 5-10 minutes to appear)
- Verify measurementId in firebase config
- Check console for: `✅ Firebase Analytics initialized`

## 🎉 Done!

All web features are now available in mobile app!
