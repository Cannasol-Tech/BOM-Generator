# Firebase Integration Setup for Cannasol BOM Generator

This guide will help you set up Firebase Firestore as the backend database for your BOM Generator, following the schema defined in `docs/digikey/db-schema.md`.

## 🚀 Quick Setup

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable Firestore Database
4. Enable Authentication (Email/Password and Google)

### 2. Get Firebase Configuration

1. Go to Project Settings > General
2. Scroll to "Your apps" and click "Web app" (</>) 
3. Register your app and copy the configuration
4. Download the service account key:
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Save as `scripts/serviceAccountKey.json`

### 3. Environment Configuration

Create `.env` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### 4. Initialize Database

Run the initialization script to set up your database schema and sample data:

```bash
npm run firebase:init
```

This will:
- Create all required collections (`inventory_items`, `bom_templates`, `bom_executions`, `audit_log`, `configuration`)
- Populate sample inventory data based on your CSV structure
- Create sample BOM templates
- Set up audit logging
- Show you the required Firestore indexes to create

### 5. Configure Firestore Security Rules

Copy the security rules from the initialization output to Firebase Console > Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Inventory items - read/write for authenticated users
    match /inventory_items/{partNumber} {
      allow read, write: if request.auth != null;
    }
    
    // BOM templates - read/write for authenticated users
    match /bom_templates/{templateId} {
      allow read, write: if request.auth != null;
    }
    
    // BOM executions - read/write for authenticated users
    match /bom_executions/{executionId} {
      allow read, write: if request.auth != null;
    }
    
    // Configuration - read for all, write for admin only
    match /configuration/{configId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Audit log - write for all authenticated, read for admin only
    match /audit_log/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

### 6. Create Required Indexes

In Firebase Console > Firestore > Indexes, create these composite indexes:

1. **inventory_items**:
   - `status` (Ascending), `lastUpdated` (Descending)
   - `category` (Ascending), `currentStock` (Ascending)

2. **bom_executions**:
   - `status` (Ascending), `executedAt` (Descending)

3. **audit_log**:
   - `action` (Ascending), `timestamp` (Descending)
   - `entityType` (Ascending), `timestamp` (Descending)

4. **bom_templates**:
   - `updatedAt` (Descending)
   - `status` (Ascending)

## 📊 Database Schema Overview

The Firebase integration follows this schema structure:

### Collections

- **`inventory_items`**: Your current inventory with part numbers, stock levels, costs
- **`bom_templates`**: Saved BOM configurations with parts and requirements
- **`bom_executions`**: Results of BOM generation runs with availability checks
- **`audit_log`**: All system activities and changes for tracking
- **`configuration`**: System settings and field mappings

### Key Features

✅ **Real-time Sync**: Changes sync across all users instantly  
✅ **Inventory Tracking**: Live stock levels and availability  
✅ **BOM Execution**: Generate BOMs with current inventory checks  
✅ **Audit Trail**: Complete history of all changes  
✅ **Multi-user**: Support for team collaboration  
✅ **Cost Analysis**: Track costs and variances  

## 🔧 Development Usage

### Start Development Server

```bash
npm run dev
```

The app will now use Firebase instead of localStorage for data persistence.

### Firebase Service Methods

The `FirebaseBOMService` provides these key methods:

```typescript
// Inventory Management
await firebaseBOMService.getInventoryItems()
await firebaseBOMService.updateInventoryItem(item)
await firebaseBOMService.createInventoryItem(item)

// BOM Templates
await firebaseBOMService.createBOMTemplate(name, items, description)
await firebaseBOMService.getBOMTemplates()
await firebaseBOMService.getBOMTemplate(templateId)

// BOM Execution (with inventory checks)
await firebaseBOMService.executeBOM(templateId)
await firebaseBOMService.getBOMExecution(executionId)

// Real-time subscriptions
firebaseBOMService.subscribeToInventory(callback)
firebaseBOMService.subscribeToBOMTemplates(callback)
```

## 🔒 Authentication

The app supports:
- Email/Password authentication
- Google Sign-In
- User profile management
- Session persistence

Users must be authenticated to access the BOM data.

## 📈 Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to your hosting platform (Netlify, Vercel, etc.)

3. Update Firebase Authentication settings:
   - Add your production domain to authorized domains
   - Configure OAuth redirect URLs

4. Set up backup and monitoring:
   - Enable Firestore backups
   - Set up Cloud Monitoring alerts
   - Configure billing alerts

## 🤝 Integration with n8n

The database structure is designed to work with n8n automation:

- **BOM Executions** can be triggered by n8n workflows
- **Audit Log** tracks all automated actions
- **Configuration** stores automation settings
- **Inventory Updates** can be automated from external sources

## 🐛 Troubleshooting

### Common Issues

**Authentication Error**: Check that your Firebase config is correct in `.env`

**Permission Denied**: Ensure Firestore rules are set up correctly

**Missing Indexes**: Create the required composite indexes in Firebase Console

**Service Account**: Make sure `serviceAccountKey.json` is in the `scripts/` folder

### Debug Mode

Enable Firebase debug mode by adding to your environment:

```env
VITE_FIREBASE_DEBUG=true
```

## 📞 Support

For issues or questions:
1. Check the Firebase Console logs
2. Review the audit log in Firestore
3. Contact Cannasol Technologies support

---

🎉 **You're all set!** Your BOM Generator now has a powerful Firebase backend with real-time collaboration, inventory tracking, and automated workflows.
