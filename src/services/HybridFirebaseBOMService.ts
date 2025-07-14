/**
 * Hybrid Firebase Service
 * 
 * This service handles:
 * - Direct Firebase reads for inventory and existing BOMs
 * - Delegates BOM saving to n8n webhook (which then saves to Firebase)
 * - Real-time inventory synchronization
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  orderBy,
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';

import N8NWebhookService from './N8NWebhookService';

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// BOM Item interface
interface BOMItem {
  id: number;
  partNumber: string;
  description: string;
  itemName?: string;
  package?: string;
  quantity: number;
  unitCost: number;
  supplier: string;
  digikeyPN?: string;
  lcscPart?: string;
  designator?: string;
  notes?: string;
}

// Inventory Item interface (from Firebase)
interface InventoryItem {
  partNumber: string;
  componentName: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
  inventoryValue: number;
  digikeyPN: string;
  leadTime: number | null;
  status: string;
  supplier: string;
  category: string;
  lastUpdated: any;
  createdAt: any;
}

class HybridFirebaseBOMService {
  private db: any;
  private n8nService: N8NWebhookService;
  private unsubscribeFunctions: Unsubscribe[] = [];

  constructor() {
    this.n8nService = new N8NWebhookService();
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase connection
   */
  private initializeFirebase(): void {
    try {
      const firebaseConfig: FirebaseConfig = {
        apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || '',
        authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'cannasol-executive-dashboard',
        storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || ''
      };

      const app = initializeApp(firebaseConfig);
      this.db = getFirestore(app);
      
      console.log('✅ Firebase initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      throw error;
    }
  }

  /**
   * Save BOM via n8n webhook (n8n handles Firebase storage)
   */
  async saveBOMTemplate(bomData: {
    name: string;
    description?: string;
    parts: BOMItem[];
  }): Promise<{ success: boolean; bomId?: string; error?: string }> {
    try {
      const result = await this.n8nService.sendBOMToAutomation({
        bomName: bomData.name,
        parts: bomData.parts,
        bomId: `bom-${Date.now()}`,
        requestedBy: 'bom-app-user@cannasol.com'
      });

      if (result.success) {
        console.log('✅ BOM saved via n8n:', result.bomId);
        return { success: true, bomId: result.bomId };
      } else {
        console.error('❌ BOM save failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Error saving BOM:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Load BOM templates directly from Firebase
   */
  async loadBOMTemplates(): Promise<any[]> {
    try {
      const bomCollection = collection(this.db, 'bom_templates');
      const bomQuery = query(bomCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(bomQuery);
      
      const templates: any[] = [];
      querySnapshot.forEach((doc) => {
        templates.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log('✅ Loaded BOM templates:', templates.length);
      return templates;
    } catch (error) {
      console.error('❌ Error loading BOM templates:', error);
      return [];
    }
  }

  /**
   * Load specific BOM template by ID
   */
  async loadBOMTemplate(bomId: string): Promise<any | null> {
    try {
      const docRef = doc(this.db, 'bom_templates', bomId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        console.warn('BOM template not found:', bomId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error loading BOM template:', error);
      return null;
    }
  }

  /**
   * Load inventory items directly from Firebase
   */
  async loadInventoryItems(): Promise<InventoryItem[]> {
    try {
      const inventoryCollection = collection(this.db, 'inventory_items');
      const querySnapshot = await getDocs(inventoryCollection);
      
      const items: InventoryItem[] = [];
      querySnapshot.forEach((doc) => {
        items.push(doc.data() as InventoryItem);
      });

      console.log('✅ Loaded inventory items:', items.length);
      return items;
    } catch (error) {
      console.error('❌ Error loading inventory:', error);
      return [];
    }
  }

  /**
   * Check inventory availability for BOM parts
   */
  async checkInventoryAvailability(bomParts: BOMItem[]): Promise<{
    available: string[];
    lowStock: string[];
    outOfStock: string[];
  }> {
    try {
      const inventory = await this.loadInventoryItems();
      const inventoryMap = new Map(inventory.map(item => [item.partNumber, item]));
      
      const available: string[] = [];
      const lowStock: string[] = [];
      const outOfStock: string[] = [];

      bomParts.forEach(bomPart => {
        const inventoryItem = inventoryMap.get(bomPart.partNumber);
        
        if (!inventoryItem) {
          outOfStock.push(bomPart.partNumber);
        } else if (inventoryItem.currentStock < bomPart.quantity) {
          outOfStock.push(bomPart.partNumber);
        } else if (inventoryItem.currentStock <= inventoryItem.minStock) {
          lowStock.push(bomPart.partNumber);
        } else {
          available.push(bomPart.partNumber);
        }
      });

      return { available, lowStock, outOfStock };
    } catch (error) {
      console.error('❌ Error checking inventory availability:', error);
      return { available: [], lowStock: [], outOfStock: [] };
    }
  }

  /**
   * Subscribe to real-time inventory changes
   */
  subscribeToInventoryChanges(callback: (items: InventoryItem[]) => void): Unsubscribe {
    try {
      const inventoryCollection = collection(this.db, 'inventory_items');
      
      const unsubscribe = onSnapshot(inventoryCollection, (snapshot) => {
        const items: InventoryItem[] = [];
        snapshot.forEach((doc) => {
          items.push(doc.data() as InventoryItem);
        });
        
        console.log('🔄 Inventory updated:', items.length);
        callback(items);
      });

      this.unsubscribeFunctions.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error subscribing to inventory changes:', error);
      return () => {}; // Return empty function as fallback
    }
  }

  /**
   * Subscribe to real-time BOM template changes
   */
  subscribeToBOMChanges(callback: (templates: any[]) => void): Unsubscribe {
    try {
      const bomCollection = collection(this.db, 'bom_templates');
      const bomQuery = query(bomCollection, orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(bomQuery, (snapshot) => {
        const templates: any[] = [];
        snapshot.forEach((doc) => {
          templates.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('🔄 BOM templates updated:', templates.length);
        callback(templates);
      });

      this.unsubscribeFunctions.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error subscribing to BOM changes:', error);
      return () => {}; // Return empty function as fallback
    }
  }

  /**
   * Test n8n webhook connection
   */
  async testN8NConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.n8nService.testConnection();
      return {
        success: result.success,
        message: result.success ? 'n8n connection successful!' : (result.error || 'Connection failed')
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cleanup subscriptions
   */
  unsubscribeAll(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
    console.log('🔄 All Firebase subscriptions cleaned up');
  }

  /**
   * Check if Firebase is connected
   */
  isConnected(): boolean {
    return this.db !== null;
  }
}

export default HybridFirebaseBOMService;
export type { BOMItem, InventoryItem };
