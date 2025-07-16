const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com/`
});

const db = admin.firestore();

async function testFirebaseConnectivity() {
  console.log('🔥 FIREBASE ADMIN TEST: Starting connectivity test...');
  
  const testDocId = `admin-test-${Date.now()}`;
  const testData = {
    message: 'Hello from Firebase Admin!',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    testId: testDocId,
    environment: 'node-admin-test'
  };
  
  try {
    // Test 1: Write to database
    console.log('📝 FIREBASE ADMIN TEST: Writing test document...');
    const testDocRef = db.collection('connectivity-test').doc(testDocId);
    
    await testDocRef.set(testData);
    console.log('✅ FIREBASE ADMIN TEST: Write successful! Document ID:', testDocId);
    
    // Test 2: Read from database
    console.log('📖 FIREBASE ADMIN TEST: Reading test document...');
    const docSnap = await testDocRef.get();
    
    if (docSnap.exists) {
      const readData = docSnap.data();
      console.log('✅ FIREBASE ADMIN TEST: Read successful! Data:', readData);
      
      // Verify data integrity
      if (readData.message === testData.message && readData.testId === testData.testId) {
        console.log('✅ FIREBASE ADMIN TEST: Data integrity verified!');
      } else {
        console.warn('⚠️ FIREBASE ADMIN TEST: Data integrity check failed');
      }
    } else {
      console.error('❌ FIREBASE ADMIN TEST: Document not found after write');
      return false;
    }
    
    // Test 3: Clean up - delete test document
    console.log('🗑️ FIREBASE ADMIN TEST: Cleaning up test document...');
    await testDocRef.delete();
    console.log('✅ FIREBASE ADMIN TEST: Cleanup successful!');
    
    // Test 4: Verify deletion
    const deletedDocSnap = await testDocRef.get();
    if (!deletedDocSnap.exists) {
      console.log('✅ FIREBASE ADMIN TEST: Deletion verified!');
    } else {
      console.warn('⚠️ FIREBASE ADMIN TEST: Document still exists after deletion');
    }
    
    console.log('🎉 FIREBASE ADMIN TEST: All tests passed! Firebase connectivity is working.');
    return true;
    
  } catch (error) {
    console.error('❌ FIREBASE ADMIN TEST: Error during connectivity test:', error);
    console.log('🔍 FIREBASE ADMIN TEST: Error details:', {
      code: error.code,
      message: error.message,
      projectId: serviceAccount.project_id
    });
    return false;
  }
}

async function testBOMCollections() {
  console.log('📋 BOM ADMIN TEST: Testing BOM-specific collections...');
  
  try {
    // Test configuration collection
    console.log('⚙️ BOM ADMIN TEST: Testing configuration collection...');
    const configDocRef = db.collection('configuration').doc('settings');
    const configSnap = await configDocRef.get();
    
    if (configSnap.exists) {
      console.log('✅ BOM ADMIN TEST: Configuration collection accessible');
      console.log('📊 BOM ADMIN TEST: Configuration data:', configSnap.data());
    } else {
      console.warn('⚠️ BOM ADMIN TEST: Configuration document not found');
    }
    
    // Test inventory_items collection (actual collection from init script)
    console.log('📦 BOM ADMIN TEST: Testing inventory_items collection...');
    const inventoryDocRef = db.collection('inventory_items').doc('CT-IAS-000-C');
    const inventorySnap = await inventoryDocRef.get();
    
    if (inventorySnap.exists) {
      console.log('✅ BOM ADMIN TEST: Inventory_items collection accessible');
      console.log('📊 BOM ADMIN TEST: Sample inventory item (CT-IAS-000-C):', inventorySnap.data());
    } else {
      console.warn('⚠️ BOM ADMIN TEST: Sample inventory item not found');
    }
    
    // Test bom_templates collection
    console.log('📋 BOM ADMIN TEST: Testing bom_templates collection...');
    const bomDocRef = db.collection('bom_templates').doc('sample-template');
    const bomSnap = await bomDocRef.get();
    
    if (bomSnap.exists) {
      console.log('✅ BOM ADMIN TEST: BOM_templates collection accessible');
      console.log('📊 BOM ADMIN TEST: Sample BOM template:', bomSnap.data());
    } else {
      console.warn('⚠️ BOM ADMIN TEST: Sample BOM template not found');
    }
    
    // Test bill-of-materials collection
    console.log('📋 BOM ADMIN TEST: Testing bill-of-materials collection...');
    const billOfMaterialsDocRef = db.collection('bill-of-materials').doc('template-001');
    const billOfMaterialsSnap = await billOfMaterialsDocRef.get();
    
    if (billOfMaterialsSnap.exists) {
      console.log('✅ BOM ADMIN TEST: Bill-of-materials collection accessible');
      console.log('📊 BOM ADMIN TEST: Sample bill-of-materials:', billOfMaterialsSnap.data());
    } else {
      console.warn('⚠️ BOM ADMIN TEST: Sample bill-of-materials not found');
    }
    
    // List all inventory items to verify the data
    console.log('📋 BOM ADMIN TEST: Listing all inventory items...');
    const inventorySnapshot = await db.collection('inventory_items').get();
    
    if (!inventorySnapshot.empty) {
      console.log(`✅ BOM ADMIN TEST: Found ${inventorySnapshot.size} inventory items:`);
      inventorySnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   • ${doc.id}: ${data.componentName} (${data.partNumber}) - Stock: ${data.currentStock}, Cost: $${data.unitCost}`);
      });
    } else {
      console.warn('⚠️ BOM ADMIN TEST: No inventory items found');
    }
    
    console.log('🎉 BOM ADMIN TEST: BOM collections test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ BOM ADMIN TEST: Error testing BOM collections:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Firebase Admin SDK tests...\n');
  
  const connectivityResult = await testFirebaseConnectivity();
  console.log('\n' + '='.repeat(80) + '\n');
  
  const collectionsResult = await testBOMCollections();
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL RESULTS:');
  console.log(`   Connectivity Test: ${connectivityResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Collections Test: ${collectionsResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(80));
  
  process.exit(collectivityResult && collectionsResult ? 0 : 1);
}

// Run the tests
runAllTests().catch(console.error);
