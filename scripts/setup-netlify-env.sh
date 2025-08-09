#!/bin/bash

# Firebase Environment Variables Setup for Netlify
echo "🔧 Setting up Firebase Environment Variables for Netlify"
echo ""

# Check if we have Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Get Firebase project info
echo "📋 Getting Firebase project information..."
firebase projects:list

echo ""
echo "🔍 Current Firebase project:"
firebase use

echo ""
echo "📝 Firebase configuration for web app:"
firebase apps:sdkconfig web

echo ""
echo "🚀 Next steps:"
echo "1. Copy the config values from above"
echo "2. Go to your Netlify dashboard > Site settings > Environment variables"
echo "3. Add these environment variables:"
echo "   - VITE_FIREBASE_API_KEY"
echo "   - VITE_FIREBASE_AUTH_DOMAIN"
echo "   - VITE_FIREBASE_PROJECT_ID"
echo "   - VITE_FIREBASE_STORAGE_BUCKET"
echo "   - VITE_FIREBASE_MESSAGING_SENDER_ID"
echo "   - VITE_FIREBASE_APP_ID"
echo ""
echo "4. Redeploy your Netlify site"
