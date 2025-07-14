// Firebase Connection Test Script
// This script tests your Firebase setup and verifies data access

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'cannasol-executive-dashboard' // Replace with your actual project ID
});

const db = admin.firestore();

class FirebaseConnectionTest {
  constructor() {
    this.db = db;
  }

  async testConnection() {
    console.log('🔌 Testing Firebase connection...\n');

    try {
      // Test 1: Basic connection
      console.log('1. Testing basic connection...');
      const testDoc = await this.db.collection('test').doc('connection').get();
      console.log('   ✓ Firebase connection successful');

      // Test 2: Check system configuration
      console.log('\n2. Checking system configuration...');
      const configDoc = await this.db.collection('configuration').doc('system_settings').get();
      if (configDoc.exists) {
        console.log('   ✓ System configuration found');
        const config = configDoc.data();
        console.log(`   → Field mappings configured: ${Object.keys(config.fieldMappings || {}).length} types`);
      } else {
        console.log('   ⚠️  System configuration not found - run initialization script');
      }

      // Test 3: Check inventory items
      console.log('\n3. Checking inventory items...');
      const inventorySnapshot = await this.db.collection('inventory_items').limit(5).get();
      console.log(`   ✓ Found ${inventorySnapshot.size} inventory items`);
      
      if (!inventorySnapshot.empty) {
        inventorySnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`   → ${doc.id}: ${data.componentName} (Stock: ${data.currentStock})`);
        });
      }

      // Test 4: Check BOM templates
      console.log('\n4. Checking BOM templates...');
      const bomSnapshot = await this.db.collection('bom_templates').limit(3).get();
      console.log(`   ✓ Found ${bomSnapshot.size} BOM templates`);

      if (!bomSnapshot.empty) {
        bomSnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`   → ${doc.id}: ${data.name} (${data.parts?.length || 0} parts)`);
        });
      }

      // Test 5: Write test
      console.log('\n5. Testing write permissions...');
      const testWrite = {
        testId: 'connection-test',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'success'
      };
      
      await this.db.collection('test').doc('write-test').set(testWrite);
      console.log('   ✓ Write test successful');

      // Clean up test data
      await this.db.collection('test').doc('write-test').delete();
      console.log('   ✓ Test cleanup completed');

      // Test 6: Check indexes (if any query fails, indexes might be needed)
      console.log('\n6. Testing query performance...');
      try {
        const queryTest = await this.db
          .collection('inventory_items')
          .where('status', '==', 'LOW STOCK')
          .limit(1)
          .get();
        console.log('   ✓ Query test successful');
      } catch (error) {
        console.log('   ⚠️  Query test failed - may need indexes:', error.message);
      }

      console.log('\n🎉 All tests passed! Firebase is ready for n8n integration.');
      
      return true;

    } catch (error) {
      console.error('\n❌ Connection test failed:', error.message);
      
      // Provide specific error guidance
      if (error.code === 'permission-denied') {
        console.log('\n💡 Troubleshooting suggestions:');
        console.log('   - Check Firestore security rules');
        console.log('   - Verify service account permissions');
        console.log('   - Ensure project ID is correct');
      } else if (error.code === 'not-found') {
        console.log('\n💡 Troubleshooting suggestions:');
        console.log('   - Run the Firebase initialization script');
        console.log('   - Check if Firestore is enabled in Firebase Console');
      } else if (error.message.includes('credential')) {
        console.log('\n💡 Troubleshooting suggestions:');
        console.log('   - Check serviceAccountKey.json file path');
        console.log('   - Verify JSON file is valid');
        console.log('   - Ensure project ID matches the service account');
      }
      
      return false;
    }
  }

  async checkCollectionStats() {
    console.log('\n📊 Collection Statistics:');
    
    const collections = ['inventory_items', 'bom_templates', 'bom_executions', 'audit_log', 'configuration'];
    
    for (const collectionName of collections) {
      try {
        const snapshot = await this.db.collection(collectionName).get();
        console.log(`   ${collectionName}: ${snapshot.size} documents`);
      } catch (error) {
        console.log(`   ${collectionName}: Error reading (${error.message})`);
      }
    }
  }

  async validateSampleData() {
    console.log('\n🔍 Validating Sample Data Structure:');

    try {
      // Check inventory item structure
      const inventorySnapshot = await this.db.collection('inventory_items').limit(1).get();
      if (!inventorySnapshot.empty) {
        const sampleInventory = inventorySnapshot.docs[0].data();
        const requiredFields = ['partNumber', 'componentName', 'currentStock', 'minStock'];
        const missingFields = requiredFields.filter(field => !(field in sampleInventory));
        
        if (missingFields.length === 0) {
          console.log('   ✓ Inventory items have correct structure');
        } else {
          console.log(`   ⚠️  Inventory missing fields: ${missingFields.join(', ')}`);
        }
      }

      // Check BOM template structure
      const bomSnapshot = await this.db.collection('bom_templates').limit(1).get();
      if (!bomSnapshot.empty) {
        const sampleBOM = bomSnapshot.docs[0].data();
        const requiredFields = ['bomId', 'name', 'parts', 'status'];
        const missingFields = requiredFields.filter(field => !(field in sampleBOM));
        
        if (missingFields.length === 0) {
          console.log('   ✓ BOM templates have correct structure');
        } else {
          console.log(`   ⚠️  BOM templates missing fields: ${missingFields.join(', ')}`);
        }
      }

    } catch (error) {
      console.log('   ❌ Validation failed:', error.message);
    }
  }
}

// Run the connection test
async function runTest() {
  const tester = new FirebaseConnectionTest();
  
  try {
    const success = await tester.testConnection();
    await tester.checkCollectionStats();
    await tester.validateSampleData();
    
    if (success) {
      console.log('\n✅ Firebase is ready for your n8n BOM automation workflow!');
      process.exit(0);
    } else {
      console.log('\n❌ Please fix the issues above before proceeding.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Allow running as standalone script
if (require.main === module) {
  runTest();
}

module.exports = FirebaseConnectionTest;