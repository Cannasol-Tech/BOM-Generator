#!/bin/bash

# Netlify Environment Variables Setup Script
echo "🌐 Setting up Netlify Environment Variables for Firebase"
echo ""

# Your Firebase configuration from the output above
FIREBASE_CONFIG=$(cat << 'EOF'
VITE_FIREBASE_API_KEY=AIzaSyDrT5mpA6vLHeTKQcClk_xD4yA8GXCUO7s
VITE_FIREBASE_AUTH_DOMAIN=cannasol-executive-dashboard.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cannasol-executive-dashboard
VITE_FIREBASE_STORAGE_BUCKET=cannasol-executive-dashboard.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=307711515061
VITE_FIREBASE_APP_ID=1:307711515061:web:ec1d42ff947e71d06a21fc
EOF
)

echo "📋 Environment variables to add to Netlify:"
echo "============================================"
echo "$FIREBASE_CONFIG"
echo "============================================"
echo ""

# Create a .env file for local development
echo "💻 Creating .env file for local development..."
echo "$FIREBASE_CONFIG" > .env

# Check if Netlify CLI is available
if command -v netlify &> /dev/null; then
    echo "🚀 Netlify CLI found! Would you like to set environment variables automatically?"
    echo "   (This will set them for your current Netlify site)"
    echo ""
    
    # Show current site info
    netlify status
    
    echo ""
    read -p "Set environment variables automatically? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔧 Setting environment variables..."
        
        # Set each environment variable
        netlify env:set VITE_FIREBASE_API_KEY "AIzaSyDrT5mpA6vLHeTKQcClk_xD4yA8GXCUO7s"
        netlify env:set VITE_FIREBASE_AUTH_DOMAIN "cannasol-executive-dashboard.firebaseapp.com"
        netlify env:set VITE_FIREBASE_PROJECT_ID "cannasol-executive-dashboard"
        netlify env:set VITE_FIREBASE_STORAGE_BUCKET "cannasol-executive-dashboard.firebasestorage.app"
        netlify env:set VITE_FIREBASE_MESSAGING_SENDER_ID "307711515061"
        netlify env:set VITE_FIREBASE_APP_ID "1:307711515061:web:ec1d42ff947e71d06a21fc"
        
        echo "✅ Environment variables set! Now triggering a new deployment..."
        netlify deploy --prod
        
        echo ""
        echo "🎉 Done! Your site should now have the correct Firebase configuration."
    else
        echo "📖 Manual setup required:"
        echo "1. Go to your Netlify dashboard"
        echo "2. Navigate to Site settings > Environment variables"
        echo "3. Add the variables shown above"
        echo "4. Redeploy your site"
    fi
else
    echo "📖 Manual setup required (Netlify CLI not found):"
    echo "1. Install Netlify CLI: npm install -g netlify-cli"
    echo "2. OR go to your Netlify dashboard"
    echo "3. Navigate to Site settings > Environment variables"
    echo "4. Add the variables shown above"
    echo "5. Redeploy your site"
fi

echo ""
echo "🔒 Security Note: The .env file has been created for local development"
echo "    Make sure it's in your .gitignore file!"
