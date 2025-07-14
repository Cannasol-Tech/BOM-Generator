# Firebase Setup Guide for BOM Automation

## Prerequisites

* Node.js 16+ installed
* Google account
* Access to Google Cloud Console

## Step 1: Create Firebase Project

1. **Go to Firebase Console** : https://console.firebase.google.com/
2. **Create New Project** :

* Click "Create a project"
* Enter project name: `bom-automation-system` (or your preferred name)
* Choose whether to enable Google Analytics (optional for this use case)
* Click "Create project"

## Step 2: Enable Firestore Database

1. **In Firebase Console** , go to your project
2. **Click "Firestore Database"** in the left sidebar
3. **Click "Create database"**
4. **Choose production mode** (you'll update rules later)
5. **Select location** : Choose closest to your location (can't be changed later)
6. **Click "Enable"**

## Step 3: Create Service Account

1. **Go to Project Settings** :

* Click the gear icon → "Project settings"
* Click "Service accounts" tab

1. **Generate new private key** :

* Click "Generate new private key"
* Download the JSON file
* **IMPORTANT** : Keep this file secure and never commit to version control
* Rename it to `serviceAccountKey.json`

## Step 4: Install and Run Setup Scripts

1. **Create a new directory** for setup:
   ```bash
   mkdir bom-firebase-setup
   cd bom-firebase-setup
   ```
2. **Save the provided files** :

* `package.json`
* `firebase-init.js`
* `firestore.rules`
* Place your `serviceAccountKey.json` in this directory

1. **Install dependencies** :

```bash
   npm install
```

1. **Update the initialization script** :

* Open `firebase-init.js`
* Update line 6: Replace `'./path/to/your/serviceAccountKey.json'` with `'./serviceAccountKey.json'`
* Update line 9: Replace `'your-project-id'` with your actual Firebase project ID

1. **Run the initialization** :

```bash
   npm run init
```

## Step 5: Update Firestore Security Rules

1. **In Firebase Console** , go to "Firestore Database"
2. **Click "Rules" tab**
3. **Replace the default rules** with the content from `firestore.rules`
4. **Click "Publish"**

## Step 6: Create Indexes (Optional but Recommended)

1. **In Firestore Console** , go to "Indexes" tab
2. **Create composite indexes** :
   **For inventory_items** :

* Fields: `status` (Ascending), `lastUpdated` (Descending)
* Fields: `category` (Ascending), `currentStock` (Ascending)

    **For bom_executions** :

* Fields: `status` (Ascending), `executedAt` (Descending)

    **For audit_log** :

* Fields: `action` (Ascending), `timestamp` (Descending)

## Step 7: Configure n8n Credentials

### Google Cloud Firestore Credentials in n8n:

1. **In n8n** , go to "Credentials" → "New credential"
2. **Select "Google Cloud Firestore"**
3. **Choose "Service Account"** method
4. **Upload your `serviceAccountKey.json`** or paste its contents
5. **Test the connection**

### Service Account Permissions Needed:

* Cloud Datastore User
* Firebase Admin SDK Administrator Service Agent

## Step 8: Test the Setup

Create a simple test workflow in n8n:

```
Manual Trigger → Google Cloud Firestore (Get Document)
```

Configure the Firestore node:

* **Operation** : Get Document
* **Collection** : `configuration`
* **Document ID** : `system_settings`

If successful, you should see your configuration data.

## Environment Variables (Alternative Setup)

For production, consider using environment variables instead of the JSON file:

```bash
# .env file
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## Troubleshooting

### Common Issues:

1. **"Permission denied" errors** :

* Check Firestore rules
* Verify service account permissions
* Ensure project ID is correct

1. **"Document not found" errors** :

* Run the initialization script
* Check collection and document names

1. **"Invalid credentials" errors** :

* Verify service account JSON is valid
* Check project ID matches
* Ensure service account has proper roles

### Useful Commands:

```bash
# Test your setup
npm run test-connection

# Reinitialize if needed (will overwrite existing data)
npm run init

# Check Firebase CLI (if installed)
firebase projects:list
firebase firestore:indexes
```

## Security Best Practices

1. **Never commit service account keys** to version control
2. **Use environment variables** in production
3. **Implement proper Firestore rules** for production
4. **Enable audit logging** in Google Cloud Console
5. **Regularly rotate service account keys**
6. **Use least privilege principle** for service accounts

## Production Considerations

1. **Update Firestore rules** to restrict access appropriately
2. **Set up backup policies**
3. **Monitor usage and costs**
4. **Implement data retention policies**
5. **Consider using Firebase App Check** for additional security

## Next Steps

After Firebase is configured:

1. **Import your existing inventory** into Firestore
2. **Set up the n8n SharePoint integration**
3. **Create the BOM processing workflow**
4. **Test with sample data**
5. **Configure monitoring and alerts**

Your Firebase database is now ready for the BOM automation workflow!
