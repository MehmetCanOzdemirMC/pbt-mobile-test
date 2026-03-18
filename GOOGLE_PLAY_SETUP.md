# Google Play Console Setup Guide

## ✅ Completed Tasks

### 1. Build Configuration
- ✅ Changed build type from APK to AAB (Android App Bundle)
- ✅ EAS configuration updated in `eas.json`

### 2. Legal Documents
- ✅ Privacy Policy created: `PRIVACY_POLICY.md`
- ✅ Terms of Service created: `TERMS_OF_SERVICE.md`

## 📋 Remaining Tasks

### 3. Host Privacy Policy & Terms (REQUIRED)

You need to host these documents online before submitting to Google Play:

#### Option A: Firebase Hosting (Recommended)
```bash
# Install Firebase CLI if not already
npm install -g firebase-tools

# Initialize hosting
firebase init hosting

# Create a public folder
mkdir public
cp PRIVACY_POLICY.md public/
cp TERMS_OF_SERVICE.md public/

# Convert to HTML or use a simple HTML wrapper
# Create public/privacy.html
# Create public/terms.html

# Deploy
firebase deploy --only hosting
```

Your URLs will be:
- Privacy: `https://YOUR-PROJECT.web.app/privacy.html`
- Terms: `https://YOUR-PROJECT.web.app/terms.html`

#### Option B: GitHub Pages
1. Create a new repository or use existing
2. Push `PRIVACY_POLICY.md` and `TERMS_OF_SERVICE.md`
3. Enable GitHub Pages in Settings
4. URLs will be: `https://yourusername.github.io/repo-name/PRIVACY_POLICY.md`

#### Option C: Your Own Website
Host on your company website:
- `https://yourwebsite.com/privacy-policy`
- `https://yourwebsite.com/terms-of-service`

### 4. Update App Configuration

After hosting, update `app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.pbt.mobiletest",
      "versionCode": 1,
      "privacyPolicy": "YOUR_HOSTED_PRIVACY_POLICY_URL"
    }
  }
}
```

### 5. Prepare Store Assets

#### Required Screenshots (Minimum 2, Recommended 4-8)

Take screenshots from different app screens:
- [ ] Login/Onboarding screen
- [ ] Marketplace with stone listings
- [ ] Stone detail modal
- [ ] Shopping cart
- [ ] Order detail screen
- [ ] Supplier/Admin dashboard
- [ ] Compare screen
- [ ] Discounts screen

**Requirements:**
- Format: PNG or JPEG
- Minimum dimension: 320px
- Maximum dimension: 3840px
- Aspect ratio: 16:9 or 9:16 recommended

**Where to take screenshots:**
1. Run the app: `npx expo start`
2. Open on Android device or emulator
3. Navigate to each screen and take screenshots
4. Or use device screenshot feature (Power + Volume Down)

#### Feature Graphic (Required)

**Requirements:**
- Size: 1024 x 500 pixels
- Format: PNG or JPEG
- Max file size: 1MB

**Content ideas:**
- App logo + tagline: "PBT Mobile - Diamond Marketplace"
- Key features: "Browse • Compare • Order"
- Include some diamond imagery

**Tools:**
- Canva (free templates)
- Figma (design from scratch)
- Photoshop/GIMP

#### App Icon (Already have it)
- ✅ Icon ready in `assets/icon.png`
- ✅ Adaptive icon ready in `assets/adaptive-icon.png`

### 6. Write Store Listing

#### App Title (Max 50 characters)
```
PBT Mobile - Diamond Marketplace
```

#### Short Description (Max 80 characters)
```
B2B diamond and gemstone marketplace connecting suppliers with retailers
```

#### Full Description (Max 4000 characters)

```
PBT Mobile is the premier B2B marketplace for diamonds and gemstones, connecting verified suppliers with retailers worldwide.

🔹 KEY FEATURES

💎 EXTENSIVE CATALOG
Browse thousands of certified diamonds and gemstones with detailed specifications including carat, color, clarity, cut, polish, and symmetry.

🔍 ADVANCED SEARCH & FILTERS
Find exactly what you need with powerful search filters by shape, size, color, clarity, lab certification, location, and price range.

⚖️ COMPARE & ANALYZE
Compare multiple stones side-by-side to make informed purchasing decisions based on specifications and pricing.

💬 DIRECT NEGOTIATION
Communicate directly with suppliers to negotiate prices and terms that work for your business.

🛒 STREAMLINED ORDERING
Simple checkout process with order tracking, payment management, and delivery updates.

📊 SUPPLIER DASHBOARD
For suppliers: Manage inventory, track sales, create discounts, and fulfill orders efficiently.

📈 DISCOUNT MANAGEMENT
Access exclusive discounts and promotions from suppliers, track expiration dates and usage.

🌍 MULTI-LANGUAGE SUPPORT
Available in English, Turkish, and Chinese for global accessibility.

🔒 SECURE & VERIFIED
All users are verified businesses, ensuring safe and legitimate transactions.

🔹 WHO IS IT FOR?

RETAILERS:
- Jewelry stores seeking quality diamonds
- E-commerce businesses building inventory
- Custom jewelry designers

SUPPLIERS:
- Diamond wholesalers
- Gemstone distributors
- Certified diamond traders

🔹 WHY PBT MOBILE?

✓ Direct connection between suppliers and retailers
✓ Competitive pricing through negotiation
✓ Certified and verified products
✓ Real-time inventory updates
✓ Secure transaction management
✓ Professional business platform

Download PBT Mobile today and revolutionize your diamond and gemstone sourcing!

---

CONTACT & SUPPORT
Email: support@pbtmobile.com
Website: [Your website]

LEGAL
Privacy Policy: [Your privacy policy URL]
Terms of Service: [Your terms URL]
```

#### Category
- Primary: **Shopping** or **Business**
- Tags: e-commerce, B2B, diamonds, jewelry, wholesale, marketplace

#### Contact Information
- Email: `support@pbtmobile.com` (update with real email)
- Website: Your company website
- Phone: Optional but recommended

### 7. Content Rating Questionnaire

Google Play requires answering content rating questions:

**Expected answers for PBT Mobile:**
- Violence: None
- Sexual content: None
- Profanity: None
- Controlled substances: None
- Gambling: None
- **User interaction**: YES (users can communicate)
- **Purchases**: YES (real-world purchases of diamonds)
- Target age: 18+ (business users only)

Rating result will likely be: **PEGI 3** or **Everyone**

### 8. Build and Test Production APK

```bash
# Build production AAB
eas build --platform android --profile production

# This will create an AAB file (Android App Bundle)
# Wait for build to complete (10-20 minutes)
# Download the AAB from EAS dashboard or provided link
```

**Test before submission:**
1. Install AAB on test device using Internal Testing track
2. Test all core features:
   - Login/Registration
   - Browse stones
   - Search and filters
   - Add to cart
   - Checkout process
   - View orders
   - Language switching
3. Check for crashes or errors
4. Verify translations display correctly

### 9. Google Play Console Submission

1. **Create Developer Account**
   - Go to [Google Play Console](https://play.google.com/console)
   - Pay one-time $25 registration fee
   - Complete account verification

2. **Create New App**
   - Click "Create app"
   - Select default language: Turkish or English
   - App name: PBT Mobile
   - Type: App
   - Free/Paid: Select appropriately

3. **Complete Store Listing**
   - Upload screenshots (minimum 2)
   - Upload feature graphic
   - Write descriptions
   - Set category and tags
   - Add contact information

4. **Upload AAB**
   - Go to "Release" → "Production"
   - Click "Create new release"
   - Upload the AAB file from EAS build
   - Fill release notes
   - Submit for review

5. **Review Process**
   - Typically takes 2-7 days
   - You'll receive email updates
   - May need to address review feedback

## 📊 Checklist

Before submitting to Google Play Console:

- [x] Build configuration (AAB format)
- [x] Privacy Policy created
- [x] Terms of Service created
- [ ] Privacy Policy hosted online
- [ ] Terms of Service hosted online
- [ ] App.json updated with privacy URL
- [ ] Screenshots taken (minimum 2, recommended 4-8)
- [ ] Feature graphic created (1024x500)
- [ ] Store description written
- [ ] Contact email set up
- [ ] Production AAB built and tested
- [ ] Content rating completed
- [ ] Google Play developer account created

## 💰 Costs

- Google Play Developer Registration: **$25** (one-time)
- EAS Build (if not using free tier): **Free tier: 30 builds/month**
- Hosting (Firebase/GitHub Pages): **Free**

## 📞 Support

If you encounter issues:
1. Check [Expo EAS documentation](https://docs.expo.dev/eas/)
2. Review [Google Play Console help](https://support.google.com/googleplay/android-developer)
3. Contact: support@pbtmobile.com

---

**Next Step**: Host the privacy policy and terms online, then proceed with taking screenshots and creating the feature graphic.
