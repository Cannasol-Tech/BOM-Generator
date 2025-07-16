#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testFirebaseConnection() {
  console.log('🔥 FIREBASE ADMIN TEST: Starting connectivity test...');
  console.log('📊 Project ID:', serviceAccount.project_id);
  
  const testDocId = `admin-test-${Date.now()}`;
  const testData = {
    message: 'Hello from Firebase Admin SDK!',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    testId: testDocId,
    environment: 'admin-test'
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
  console.log('\n📋 BOM ADMIN TEST: Testing BOM-specific collections...');
  
  try {
    // Test configuration collection
    console.log('⚙️ BOM ADMIN TEST: Testing configuration collection...');
    const configDocRef = db.collection('configuration').doc('system_settings');
    const configSnap = await configDocRef.get();
    
    if (configSnap.exists) {
      console.log('✅ BOM ADMIN TEST: Configuration collection accessible');
      console.log('📊 BOM ADMIN TEST: Configuration data:', configSnap.data());
    } else {
      console.warn('⚠️ BOM ADMIN TEST: Configuration document not found');
    }
    
    // Test inventory collection
    console.log('\n📦 BOM ADMIN TEST: Testing inventory collection...');
    const inventoryQuery = db.collection('inventory_items').limit(3);
    const inventorySnap = await inventoryQuery.get();
    
    if (!inventorySnap.empty) {
      console.log('✅ BOM ADMIN TEST: Inventory collection accessible');
      console.log('📊 BOM ADMIN TEST: Found', inventorySnap.size, 'inventory items');
      inventorySnap.forEach(doc => {
        const data = doc.data();
        console.log('   📦 Item:', doc.id, '→', {
          partNumber: data.partNumber,
          componentName: data.componentName,
          currentStock: data.currentStock,
          unitCost: data.unitCost
        });
      });
    } else {
      console.warn('⚠️ BOM ADMIN TEST: No inventory items found');
    }
    
    // Test BOM templates collection
    console.log('\n📋 BOM ADMIN TEST: Testing BOM templates collection...');
    const templatesQuery = db.collection('bom_templates').limit(3);
    const templatesSnap = await templatesQuery.get();
    
    if (!templatesSnap.empty) {
      console.log('✅ BOM ADMIN TEST: BOM templates collection accessible');
      console.log('📊 BOM ADMIN TEST: Found', templatesSnap.size, 'BOM templates');
      templatesSnap.forEach(doc => {
        const data = doc.data();
        console.log('   📋 Template:', doc.id, '→', {
          name: data.name,
          partsCount: data.parts ? data.parts.length : 0,
          totalCost: data.totalEstimatedCost || 0
        });
      });
    } else {
      console.warn('⚠️ BOM ADMIN TEST: No BOM templates found');
    }
    
    // Test bill-of-materials collection
    console.log('\n📋 BOM ADMIN TEST: Testing bill-of-materials collection...');
    const bomsQuery = db.collection('bill-of-materials').limit(3);
    const bomsSnap = await bomsQuery.get();
    
    if (!bomsSnap.empty) {
      console.log('✅ BOM ADMIN TEST: Bill-of-materials collection accessible');
      console.log('📊 BOM ADMIN TEST: Found', bomsSnap.size, 'BOMs');
      bomsSnap.forEach(doc => {
        const data = doc.data();
        console.log('   📋 BOM:', doc.id, '→', data);
      });
    } else {
      console.warn('⚠️ BOM ADMIN TEST: No BOMs found');
    }
    
    console.log('\n🎉 BOM ADMIN TEST: BOM collections test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ BOM ADMIN TEST: Error testing BOM collections:', error);
    return false;
  }
}

// Run the tests
async function runAllTests() {
  console.log('🚀 Starting Firebase Admin SDK connectivity tests...\n');
  
  const connectivityResult = await testFirebaseConnection();
  const collectionsResult = await testBOMCollections();
  
  console.log('\n📊 TEST SUMMARY:');
  console.log('   Basic Connectivity:', connectivityResult ? '✅ PASSED' : '❌ FAILED');
  console.log('   BOM Collections:', collectionsResult ? '✅ PASSED' : '❌ FAILED');
  
  if (connectivityResult && collectionsResult) {
    console.log('\n🎉 ALL TESTS PASSED! Firebase is properly configured and accessible.');
  } else {
    console.log('\n❌ Some tests failed. Check the error messages above.');
  }
  
  process.exit(connectivityResult && collectionsResult ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Fatal error during test execution:', error);
  process.exit(1);
});
