// Microsoft Graph API Configuration
// You'll need to register your app at https://portal.azure.com

export const MICROSOFT_CONFIG = {
  // Replace with your actual Client ID from Azure App Registration
  clientId: 'YOUR_CLIENT_ID_HERE', // Get this from Azure Portal
  
  // These are the required scopes for OneDrive access
  scopes: [
    'https://graph.microsoft.com/Files.ReadWrite',
    'https://graph.microsoft.com/User.Read'
  ],
  
  // Redirect URI (should match your deployment URL)
  redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  
  // Microsoft Graph endpoints
  endpoints: {
    auth: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    graph: 'https://graph.microsoft.com/v1.0'
  }
};

// Instructions for setting up Microsoft App Registration:
/*
1. Go to https://portal.azure.com
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Set these values:
   - Name: "Cannasol BOM Generator"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: 
     - Type: "Single-page application (SPA)"
     - URL: Your deployment URL (e.g., https://your-app.netlify.app)
5. After creation, copy the "Application (client) ID"
6. Go to "API permissions" > "Add a permission"
7. Choose "Microsoft Graph" > "Delegated permissions"
8. Add these permissions:
   - Files.ReadWrite
   - User.Read
9. Click "Grant admin consent" (if you're an admin)
10. Replace YOUR_CLIENT_ID_HERE above with your actual Client ID
*/
