// Firebase Connectivity Test
// Simple write and read test to verify Firebase connection

import { db } from './config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  deleteDoc 
} from 'firebase/firestore';

// Test function to verify Firebase connectivity
export async function testFirebaseConnection() {
  console.log('🔥 FIREBASE TEST: Starting connectivity test...');
  
  const testDocId = `test-${Date.now()}`;
  const testData = {
    message: 'Hello from Firebase!',
    timestamp: serverTimestamp(),
    testId: testDocId,
    environment: import.meta.env.VITE_ENVIRONMENT || 'unknown'
  };
  
  try {
    // Test 1: Write to database
    console.log('📝 FIREBASE TEST: Writing test document...');
    const testDocRef = doc(db, 'connectivity-test', testDocId);
    
    await setDoc(testDocRef, testData);
    console.log('✅ FIREBASE TEST: Write successful! Document ID:', testDocId);
    
    // Test 2: Read from database
    console.log('📖 FIREBASE TEST: Reading test document...');
    const docSnap = await getDoc(testDocRef);
    
    if (docSnap.exists()) {
      const readData = docSnap.data();
      console.log('✅ FIREBASE TEST: Read successful! Data:', readData);
      
      // Verify data integrity
      if (readData.message === testData.message && readData.testId === testData.testId) {
        console.log('✅ FIREBASE TEST: Data integrity verified!');
      } else {
        console.warn('⚠️ FIREBASE TEST: Data integrity check failed');
      }
    } else {
      console.error('❌ FIREBASE TEST: Document not found after write');
      return false;
    }
    
    // Test 3: Clean up - delete test document
    console.log('🗑️ FIREBASE TEST: Cleaning up test document...');
    await deleteDoc(testDocRef);
    console.log('✅ FIREBASE TEST: Cleanup successful!');
    
    // Test 4: Verify deletion
    const deletedDocSnap = await getDoc(testDocRef);
    if (!deletedDocSnap.exists()) {
      console.log('✅ FIREBASE TEST: Deletion verified!');
    } else {
      console.warn('⚠️ FIREBASE TEST: Document still exists after deletion');
    }
    
    console.log('🎉 FIREBASE TEST: All tests passed! Firebase connectivity is working.');
    return true;
    
  } catch (error) {
    console.error('❌ FIREBASE TEST: Error during connectivity test:', error);
    console.log('🔍 FIREBASE TEST: Error details:', {
      code: error.code,
      message: error.message,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      environment: import.meta.env.VITE_ENVIRONMENT
    });
    return false;
  }
}

// Test function for BOM-specific collections
export async function testBOMCollections() {
  console.log('📋 BOM TEST: Testing BOM-specific collections...');
  
  try {
    // Test configuration collection
    console.log('⚙️ BOM TEST: Testing configuration collection...');
    const configDocRef = doc(db, 'configuration', 'settings');
    const configSnap = await getDoc(configDocRef);
    
    if (configSnap.exists()) {
      console.log('✅ BOM TEST: Configuration collection accessible');
      console.log('📊 BOM TEST: Configuration data:', configSnap.data());
    } else {
      console.warn('⚠️ BOM TEST: Configuration document not found');
    }
    
    // Test inventory collection
    console.log('📦 BOM TEST: Testing inventory collection...');
    const inventoryDocRef = doc(db, 'inventory', 'sample-item');
    const inventorySnap = await getDoc(inventoryDocRef);
    
    if (inventorySnap.exists()) {
      console.log('✅ BOM TEST: Inventory collection accessible');
      console.log('📊 BOM TEST: Sample inventory item:', inventorySnap.data());
    } else {
      console.warn('⚠️ BOM TEST: Sample inventory item not found');
    }
    
    // Test BOMs collection
    console.log('📋 BOM TEST: Testing BOMs collection...');
    const bomDocRef = doc(db, 'boms', 'sample-template');
    const bomSnap = await getDoc(bomDocRef);
    
    if (bomSnap.exists()) {
      console.log('✅ BOM TEST: BOMs collection accessible');
      console.log('📊 BOM TEST: Sample BOM template:', bomSnap.data());
    } else {
      console.warn('⚠️ BOM TEST: Sample BOM template not found');
    }
    
    console.log('🎉 BOM TEST: BOM collections test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ BOM TEST: Error testing BOM collections:', error);
    return false;
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  window.testFirebaseConnection = testFirebaseConnection;
  window.testBOMCollections = testBOMCollections;
  console.log('🔥 Firebase test functions loaded! Available commands:');
  console.log('- testFirebaseConnection() - Test basic read/write');
  console.log('- testBOMCollections() - Test BOM-specific collections');
}
