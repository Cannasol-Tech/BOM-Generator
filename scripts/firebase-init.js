// Firebase Initialization Script for BOM Automation
// Run this script after setting up your Firebase project
// Based on the db-schema.md structure

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
// and update the path below
const serviceAccount = require('./serviceAccountKey.json'); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id // Will be read from service account key
});

const db = admin.firestore();

class FirebaseInitializer {
  constructor() {
    this.db = db;
  }

  // Initialize system configuration (matching db-schema.md)
  async initializeConfiguration() {
    console.log('Setting up system configuration...');
    
    const configData = {
      configId: "system_settings",
      settings: {
        sharepointLibrary: "BOM_Files",
        inventoryFileFormat: "csv",
        bomOutputFormat: "xlsx",
        emailNotifications: true,
        lowStockThreshold: 0.5, // 50% of min stock
        costVarianceThreshold: 0.1, // 10% variance alert
        autoBackup: true,
        backupFrequency: "daily"
      },
      fieldMappings: {
        inventory: {
          partNumber: "Inventory ID",
          componentName: "Component Name", 
          currentStock: "Current Stock",
          minStock: "Min.",
          unitCost: "Unit Cost",
          inventoryValue: "Inventory Value",
          digikeyPN: "Digikey #",
          leadTime: "Lead Time",
          status: "Status"
        },
        bom: {
          partNumber: "Part Number",
          description: "Description",
          category: "Category", 
          quantity: "Quantity",
          unitCost: "Unit Cost",
          supplier: "Supplier",
          digikeyPN: "DigiKey PN"
        }
      },
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    await this.db.collection('configuration').doc('system_settings').set(configData);
    console.log('✓ System configuration initialized');
  }

  // Create sample inventory items based on your CSV structure and db-schema.md
  async initializeSampleInventory() {
    console.log('Setting up sample inventory items...');

    const sampleInventoryItems = [
      {
        // Document ID will be the partNumber: "CT-IAS-000-C"
        componentName: "Main Control PCB",
        currentStock: 8,
        minStock: 4,
        unitCost: 0.00,
        inventoryValue: 0.00,
        digikeyPN: "N/A",
        leadTime: 7,
        status: "In Stock",
        supplier: "Internal",
        category: "Main Control Board Components",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        componentName: "ACE 1630c PLC",
        currentStock: 2,
        minStock: 4,
        unitCost: 95.00,
        inventoryValue: 190.00,
        digikeyPN: "ACE-1630C-ND",
        leadTime: null,
        status: "LOW STOCK",
        supplier: "DigiKey",
        category: "Main Control Board Components",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        componentName: "5V DC Pwr Supply",
        currentStock: 2,
        minStock: 8,
        unitCost: 45.00,
        inventoryValue: 90.00,
        digikeyPN: "PWR-5V-10A-ND",
        leadTime: 5,
        status: "LOW STOCK",
        supplier: "DigiKey",
        category: "Main Control Board Components",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        componentName: "24V AC Pwr Supply",
        currentStock: 0,
        minStock: 4,
        unitCost: 65.00,
        inventoryValue: 0.00,
        digikeyPN: "PWR-24V-5A-ND",
        leadTime: 7,
        status: "Out of Stock",
        supplier: "DigiKey",
        category: "Main Control Board Components",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        componentName: "Ethernet Module",
        currentStock: 5,
        minStock: 3,
        unitCost: 25.00,
        inventoryValue: 125.00,
        digikeyPN: "ETH-WIZ850-ND",
        leadTime: 3,
        status: "In Stock",
        supplier: "DigiKey",
        category: "Communication Components",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    const partNumbers = ["CT-IAS-000-C", "CT-IAS-001", "CT-IAS-002", "CT-IAS-003", "CT-IAS-004"];
    
    const batch = this.db.batch();
    
    sampleInventoryItems.forEach((item, index) => {
      const docRef = this.db.collection('inventory_items').doc(partNumbers[index]);
      batch.set(docRef, item);
    });

    await batch.commit();
    console.log(`✓ ${sampleInventoryItems.length} sample inventory items created`);
  }

  // Create a sample BOM template (matching db-schema.md structure)
  async initializeSampleBOM() {
    console.log('Setting up sample BOM template...');

    const sampleBOM = {
      bomId: "automation-system-v1",
      name: "Industrial Automation System BOM",
      description: "Complete bill of materials for Cannasol automation system",
      version: "1.0",
      status: "active",
      parts: [
        {
          partNumber: "CT-IAS-000-C",
          description: "Main Control PCB",
          category: "Control Components",
          quantityRequired: 1,
          unitCost: 0.00,
          totalCost: 0.00,
          supplier: "Internal",
          digikeyPN: "N/A",
          availability: "available"
        },
        {
          partNumber: "CT-IAS-001", 
          description: "ACE 1630c PLC",
          category: "Control Components",
          quantityRequired: 1,
          unitCost: 95.00,
          totalCost: 95.00,
          supplier: "DigiKey",
          digikeyPN: "ACE-1630C-ND",
          availability: "low_stock"
        },
        {
          partNumber: "CT-IAS-002",
          description: "5V DC Pwr Supply", 
          category: "Power Components",
          quantityRequired: 1,
          unitCost: 45.00,
          totalCost: 45.00,
          supplier: "DigiKey",
          digikeyPN: "PWR-5V-10A-ND",
          availability: "low_stock"
        },
        {
          partNumber: "CT-IAS-003",
          description: "24V AC Pwr Supply",
          category: "Power Components", 
          quantityRequired: 1,
          unitCost: 65.00,
          totalCost: 65.00,
          supplier: "DigiKey",
          digikeyPN: "PWR-24V-5A-ND",
          availability: "out_of_stock"
        },
        {
          partNumber: "CT-IAS-004",
          description: "Ethernet Module",
          category: "Communication Components", 
          quantityRequired: 1,
          unitCost: 25.00,
          totalCost: 25.00,
          supplier: "DigiKey",
          digikeyPN: "ETH-WIZ850-ND",
          availability: "available"
        }
      ],
      totalEstimatedCost: 230.00,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "system"
    };

    await this.db.collection('bom_templates').doc('automation-system-v1').set(sampleBOM);
    console.log('✓ Sample BOM template created');
  }

  // Create sample BOM execution (matching db-schema.md structure)
  async initializeSampleExecution() {
    console.log('Setting up sample BOM execution...');

    const sampleExecution = {
      executionId: "exec_20250713_103045",
      bomTemplateId: "automation-system-v1",
      bomTemplateName: "Industrial Automation System BOM",
      executedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "partial",
      results: {
        totalPartsRequired: 5,
        partsAvailable: 3,
        partsMissing: 1,
        totalCost: 165.00, // Available parts only
        estimatedCost: 230.00,
        costVariance: -65.00
      },
      missingParts: [
        {
          partNumber: "CT-IAS-003",
          description: "24V AC Pwr Supply",
          quantityRequired: 1,
          quantityAvailable: 0,
          shortage: 1
        }
      ],
      lowStockWarnings: [
        {
          partNumber: "CT-IAS-001",
          description: "ACE 1630c PLC",
          currentStock: 2,
          minStock: 4,
          quantityRequired: 1
        },
        {
          partNumber: "CT-IAS-002",
          description: "5V DC Pwr Supply",
          currentStock: 2,
          minStock: 8,
          quantityRequired: 1
        }
      ],
      outputFiles: {
        sharepointUrl: "https://cannasol.sharepoint.com/sites/engineering/BOM_Files",
        fileName: "Automation_System_BOM_20250713.xlsx"
      },
      processingTime: 2.3,
      n8nExecutionId: "n8n_exec_sample_123456"
    };

    await this.db.collection('bom_executions').add(sampleExecution);
    console.log('✓ Sample BOM execution created');
  }

  // Create initial audit log entry (matching db-schema.md structure)
  async initializeAuditLog() {
    console.log('Setting up initial audit log...');

    const auditEntries = [
      {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        action: "system_initialized",
        entityType: "system",
        entityId: "firebase_setup",
        details: {
          message: "Firebase database initialized for BOM automation",
          collections_created: ["inventory_items", "bom_templates", "bom_executions", "configuration", "audit_log"],
          sample_data: true,
          schema_version: "1.0"
        },
        source: "initialization_script",
        userId: "system",
        ipAddress: null,
        success: true,
        errorMessage: null
      },
      {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        action: "inventory_created",
        entityType: "inventory",
        entityId: "sample_data",
        details: {
          message: "Sample inventory items created",
          itemsCreated: 5,
          categories: ["Main Control Board Components", "Communication Components"]
        },
        source: "initialization_script",
        userId: "system",
        ipAddress: null,
        success: true,
        errorMessage: null
      },
      {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        action: "bom_template_created",
        entityType: "bom",
        entityId: "automation-system-v1",
        details: {
          message: "Sample BOM template created",
          bomName: "Industrial Automation System BOM",
          totalCost: 230.00,
          partsCount: 5
        },
        source: "initialization_script",
        userId: "system",
        ipAddress: null,
        success: true,
        errorMessage: null
      }
    ];

    const batch = this.db.batch();
    auditEntries.forEach(entry => {
      const docRef = this.db.collection('audit_log').doc();
      batch.set(docRef, entry);
    });

    await batch.commit();
    console.log('✓ Initial audit log entries created');
  }

  // Create Firestore indexes configuration
  async createIndexes() {
    console.log('\n📋 Required Firestore Indexes:');
    console.log('Create these indexes in Firebase Console > Firestore > Indexes:');
    console.log('');
    console.log('1. inventory_items:');
    console.log('   - Composite: status (Ascending), lastUpdated (Descending)');
    console.log('   - Composite: category (Ascending), currentStock (Ascending)');
    console.log('');
    console.log('2. bom_executions:');
    console.log('   - Composite: status (Ascending), executedAt (Descending)');
    console.log('');
    console.log('3. audit_log:');
    console.log('   - Composite: action (Ascending), timestamp (Descending)');
    console.log('   - Composite: entityType (Ascending), timestamp (Descending)');
    console.log('');
    console.log('4. bom_templates:');
    console.log('   - Single field: updatedAt (Descending)');
    console.log('   - Single field: status (Ascending)');
  }

  // Run all initialization steps
  async initialize() {
    try {
      console.log('🚀 Starting Firebase initialization for Cannasol BOM automation...\n');
      
      await this.initializeConfiguration();
      await this.initializeSampleInventory();
      await this.initializeSampleBOM();
      await this.initializeSampleExecution();
      await this.initializeAuditLog();
      
      console.log('\n🎉 Firebase initialization completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Update Firestore security rules');
      console.log('2. Create the indexes shown below');
      console.log('3. Configure your .env file with Firebase credentials');
      console.log('4. Test the connection from your BOM Generator app');
      console.log('5. Set up n8n automation workflows');
      
      await this.createIndexes();
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }
}

// Security Rules Template
function printSecurityRules() {
  console.log('\n🔒 Firestore Security Rules Template:');
  console.log('Copy this to Firebase Console > Firestore > Rules:');
  console.log(`
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
  `);
}

// Run the initialization
if (require.main === module) {
  const initializer = new FirebaseInitializer();
  initializer.initialize()
    .then(() => {
      printSecurityRules();
      console.log('\n✅ Initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Initialization failed:', error);
      process.exit(1);
    });
}

module.exports = FirebaseInitializer;
