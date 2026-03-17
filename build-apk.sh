#!/bin/bash

echo "🚀 PBT Mobile - APK Build Script"
echo "================================"
echo ""

cd /Users/ridvandereci/Documents/GitHub/pbt-mobile-test

echo "📱 Starting APK build..."
echo ""

# Start build (requires Expo login first)
npx eas-cli build --platform android --profile preview --non-interactive

echo ""
echo "✅ Build started! Check https://expo.dev for progress."
echo "📦 APK link will be available in 15-20 minutes."
