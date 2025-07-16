#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
});

const db = admin.firestore();

async function listAllCollections() {
  console.log('📋 Listing all collections in Firestore...\n');
  
  try {
    const collections = await db.listCollections();
    
    if (collections.length === 0) {
      console.log('❌ No collections found in Firestore');
      return;
    }
    
    console.log('📊 Found', collections.length, 'collections:');
    
    for (const collection of collections) {
      console.log(`\n📁 Collection: ${collection.id}`);
      
      // Get documents in this collection
      const snapshot = await collection.limit(5).get();
      
      if (snapshot.empty) {
        console.log('   (empty)');
      } else {
        console.log(`   📄 Contains ${snapshot.size} documents:`);
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log(`      • ${doc.id}:`, typeof data === 'object' ? Object.keys(data).join(', ') : data);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error listing collections:', error);
  }
}

// Run the collection listing
listAllCollections().then(() => {
  console.log('\n✅ Collection listing completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
