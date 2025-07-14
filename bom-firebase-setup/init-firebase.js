// Firebase Initialization Script for BOM Automation
// Run this script after setting up your Firebase project

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Replace with your service account key file
const serviceAccount = require('./path/to/your/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'your-project-id' // Replace with your actual project ID
});

const db = admin.firestore();

class FirebaseInitializer {
  constructor() {
    this.db = db;
  }

  // Initialize system configuration
  async initializeConfiguration() {
    console.log('Setting up system configuration...');
    
    const configData = {
      configId: "system_settings",
      settings: {
        sharepointLibrary: "BOM_Files",
        inventoryFileFormat: "csv",
        bomOutputFormat: "xlsx",
        emailNotifications: true,
        lowStockThreshold: 0.5,
        costVarianceThreshold: 0.1,
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

  // Create sample inventory items based on your CSV structure
  async initializeSampleInventory() {
    console.log('Setting up sample inventory items...');

    const sampleInventoryItems = [
      {
        partNumber: "CT-IAS-000-C",
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
        partNumber: "CT-IAS-001",
        componentName: "ACE 1630c PLC",
        currentStock: 2,
        minStock: 4,
        unitCost: 95.00,
        inventoryValue: 190.00,
        digikeyPN: "N/A",
        leadTime: null,
        status: "LOW STOCK",
        supplier: "TBD",
        category: "Main Control Board Components",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        partNumber: "CT-IAS-002",
        componentName: "5V DC Pwr Supply",
        currentStock: 2,
        minStock: 8,
        unitCost: 0.00,
        inventoryValue: 0.00,
        digikeyPN: "",
        leadTime: null,
        status: "LOW STOCK",
        supplier: "TBD",
        category: "Main Control Board Components",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        partNumber: "CT-IAS-003",
        componentName: "24V AC Pwr Supply",
        currentStock: 0,
        minStock: 4,
        unitCost: 0.00,
        inventoryValue: 0.00,
        digikeyPN: "",
        leadTime: null,
        status: "Out of Stock",
        supplier: "TBD",
        category: "Main Control Board Components",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    const batch = this.db.batch();
    
    sampleInventoryItems.forEach(item => {
      const docRef = this.db.collection('inventory_items').doc(item.partNumber);
      batch.set(docRef, item);
    });

    await batch.commit();
    console.log(`✓ ${sampleInventoryItems.length} sample inventory items created`);
  }

  // Create a sample BOM template
  async initializeSampleBOM() {
    console.log('Setting up sample BOM template...');

    const sampleBOM = {
      bomId: "automation-system-v1",
      name: "Industrial Automation System BOM",
      description: "Complete bill of materials for automation system",
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
          supplier: "TBD",
          digikeyPN: "N/A",
          availability: "low_stock"
        },
        {
          partNumber: "CT-IAS-002",
          description: "5V DC Pwr Supply", 
          category: "Power Components",
          quantityRequired: 1,
          unitCost: 0.00,
          totalCost: 0.00,
          supplier: "TBD",
          digikeyPN: "",
          availability: "low_stock"
        },
        {
          partNumber: "CT-IAS-003",
          description: "24V AC Pwr Supply",
          category: "Power Components", 
          quantityRequired: 1,
          unitCost: 0.00,
          totalCost: 0.00,
          supplier: "TBD",
          digikeyPN: "",
          availability: "out_of_stock"
        }
      ],
      totalEstimatedCost: 95.00,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "system"
    };

    await this.db.collection('bom_templates').doc('automation-system-v1').set(sampleBOM);
    console.log('✓ Sample BOM template created');
  }

  // Create initial audit log entry
  async initializeAuditLog() {
    console.log('Setting up initial audit log...');

    const initialAuditEntry = {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      action: "system_initialized",
      entityType: "system",
      entityId: "firebase_setup",
      details: {
        message: "Firebase database initialized for BOM automation",
        collections_created: ["inventory_items", "bom_templates", "configuration", "audit_log"],
        sample_data: true
      },
      source: "initialization_script",
      userId: "system",
      ipAddress: null,
      success: true,
      errorMessage: null
    };

    await this.db.collection('audit_log').add(initialAuditEntry);
    console.log('✓ Initial audit log entry created');
  }

  // Utility method to clean currency values from your CSV
  static cleanCurrencyValue(value) {
    if (typeof value === 'string') {
      return parseFloat(value.replace(/[$,\s]/g, '')) || 0;
    }
    return value || 0;
  }

  // Utility method to clean and validate part numbers
  static cleanPartNumber(partNumber) {
    if (!partNumber || partNumber === 'N/A' || partNumber === '') {
      return null;
    }
    return partNumber.toString().trim();
  }

  // Run all initialization steps
  async initialize() {
    try {
      console.log('Starting Firebase initialization for BOM automation...\n');
      
      await this.initializeConfiguration();
      await this.initializeSampleInventory();
      await this.initializeSampleBOM();
      await this.initializeAuditLog();
      
      console.log('\n🎉 Firebase initialization completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Update Firestore security rules');
      console.log('2. Set up indexes for performance');
      console.log('3. Configure n8n with service account credentials');
      console.log('4. Test the connection from n8n');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }
}

// Run the initialization
const initializer = new FirebaseInitializer();
initializer.initialize()
  .then(() => {
    console.log('Initialization complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Initialization failed:', error);
    process.exit(1);
  });

module.exports = FirebaseInitializer;