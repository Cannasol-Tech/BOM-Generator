// Hybrid Firebase BOM Service
// Implements Firebase integration for BOM and inventory management

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface BOMItem {
  id?: string;
  partNumber: string;
  description: string;
  quantity: number;
  unitCost: number;
  extendedCost: number;
  supplier?: string;
  digikeyPN?: string;
  manufacturerPN?: string;
  category?: string;
  unit?: string;
  leadTime?: number;
  revision?: string;
  status?: string;
  requiredFor?: string;
  createdAt?: Date;
  updatedAt?: Date;
  fromInventory?: boolean;
  specifications?: {
    voltage?: string;
    current?: string;
    power?: string;
    tolerance?: string;
    temperature?: string;
    package?: string;
    value?: string;
    dielectric?: string;
    [key: string]: string | undefined;
  };
}

export interface InventoryItem {
  partNumber: string;
  componentName: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
  inventoryValue: number;
  digikeyPN?: string;
  leadTime?: number;
  status: string;
  supplier?: string;
  category?: string;
  lastUpdated?: Date;
  createdAt?: Date;
}

export interface BOMTemplate {
  bomId: string;
  name: string;
  description?: string;
  version: string;
  status: 'active' | 'draft' | 'archived';
  parts: BOMItem[];
  totalEstimatedCost: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}


export class HybridFirebaseBOMService {
  private initialized = false;
  private inventoryUnsubscribe: Unsubscribe | null = null;
  private bomTemplatesUnsubscribe: Unsubscribe | null = null;

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      // Test Firebase connection with a simple read
      await getDocs(collection(db, 'configuration'));
      this.initialized = true;
      console.log('✅ Firebase BOM Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase BOM Service:', error);
      this.initialized = false;
      throw error;
    }
  }

  // Inventory Management
  async getInventoryItems(): Promise<InventoryItem[]> {
    try {
      const inventoryRef = collection(db, 'inventory_items');
      const querySnapshot = await getDocs(inventoryRef);
      
      const items: InventoryItem[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          partNumber: doc.id,
          componentName: data.componentName,
          currentStock: data.currentStock || 0,
          minStock: data.minStock || 0,
          unitCost: data.unitCost || 0,
          inventoryValue: data.inventoryValue || 0,
          digikeyPN: data.digikeyPN,
          leadTime: data.leadTime,
          status: data.status || 'Unknown',
          supplier: data.supplier,
          category: data.category,
          lastUpdated: data.lastUpdated?.toDate(),
          createdAt: data.createdAt?.toDate()
        });
      });
      
      console.log(`📦 Loaded ${items.length} inventory items from Firebase`);
      return items;
    } catch (error) {
      console.error('❌ Error loading inventory from Firebase:', error);
      throw error;
    }
  }

  async getInventoryItem(partNumber: string): Promise<InventoryItem | null> {
    try {
      const docRef = doc(db, 'inventory_items', partNumber);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          partNumber: docSnap.id,
          componentName: data.componentName,
          currentStock: data.currentStock || 0,
          minStock: data.minStock || 0,
          unitCost: data.unitCost || 0,
          inventoryValue: data.inventoryValue || 0,
          digikeyPN: data.digikeyPN,
          leadTime: data.leadTime,
          status: data.status || 'Unknown',
          supplier: data.supplier,
          category: data.category,
          lastUpdated: data.lastUpdated?.toDate(),
          createdAt: data.createdAt?.toDate()
        };
      }
      return null;
    } catch (error) {
      console.error(`❌ Error loading inventory item ${partNumber}:`, error);
      throw error;
    }
  }

  async updateInventoryItem(item: InventoryItem): Promise<void> {
    try {
      const docRef = doc(db, 'inventory_items', item.partNumber);
      await updateDoc(docRef, {
        ...item,
        lastUpdated: serverTimestamp()
      });
      console.log(`📝 Updated inventory item: ${item.partNumber}`);
    } catch (error) {
      console.error(`❌ Error updating inventory item ${item.partNumber}:`, error);
      throw error;
    }
  }

  async createInventoryItem(item: InventoryItem): Promise<void> {
    try {
      const docRef = doc(db, 'inventory_items', item.partNumber);
      await setDoc(docRef, {
        ...item,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      console.log(`➕ Created inventory item: ${item.partNumber}`);
    } catch (error) {
      console.error(`❌ Error creating inventory item ${item.partNumber}:`, error);
      throw error;
    }
  }

  // BOM Template Management
  async getBOMTemplates(): Promise<BOMTemplate[]> {
    try {
      const bomTemplatesRef = collection(db, 'bom_templates');
      const q = query(bomTemplatesRef, orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const templates: BOMTemplate[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        templates.push({
          bomId: doc.id,
          name: data.name,
          description: data.description,
          version: data.version,
          status: data.status,
          parts: data.parts || [],
          totalEstimatedCost: data.totalEstimatedCost || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy || 'unknown'
        });
      });
      
      console.log(`📋 Loaded ${templates.length} BOM templates from Firebase`);
      return templates;
    } catch (error) {
      console.error('❌ Error loading BOM templates:', error);
      throw error;
    }
  }

  async getBOMTemplate(bomId: string): Promise<BOMTemplate | null> {
    try {
      const docRef = doc(db, 'bom_templates', bomId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          bomId: docSnap.id,
          name: data.name,
          description: data.description,
          version: data.version,
          status: data.status,
          parts: data.parts || [],
          totalEstimatedCost: data.totalEstimatedCost || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy || 'unknown'
        };
      }
      return null;
    } catch (error) {
      console.error(`❌ Error loading BOM template ${bomId}:`, error);
      throw error;
    }
  }

  async createBOMTemplate(name: string, description: string, parts: BOMItem[]): Promise<string> {
    try {
      const totalEstimatedCost = parts.reduce((sum, part) => sum + (part.extendedCost || 0), 0);
      
      const bomTemplate = {
        name,
        description,
        version: '1.0',
        status: 'active' as const,
        parts,
        totalEstimatedCost,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'bom-generator'
      };

      const docRef = await addDoc(collection(db, 'bom_templates'), bomTemplate);
      console.log(`💾 Created BOM template: ${name} with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error(`❌ Error creating BOM template ${name}:`, error);
      throw error;
    }
  }

  async updateBOMTemplate(bomId: string, parts: BOMItem[]): Promise<void> {
    try {
      const totalEstimatedCost = parts.reduce((sum, part) => sum + (part.extendedCost || 0), 0);
      
      const docRef = doc(db, 'bom_templates', bomId);
      await updateDoc(docRef, {
        parts,
        totalEstimatedCost,
        updatedAt: serverTimestamp()
      });
      console.log(`📝 Updated BOM template: ${bomId}`);
    } catch (error) {
      console.error(`❌ Error updating BOM template ${bomId}:`, error);
      throw error;
    }
  }

  async deleteBOMTemplate(bomId: string): Promise<void> {
    try {
      const docRef = doc(db, 'bom_templates', bomId);
      await deleteDoc(docRef);
      console.log(`🗑️ Deleted BOM template: ${bomId}`);
    } catch (error) {
      console.error(`❌ Error deleting BOM template ${bomId}:`, error);
      throw error;
    }
  }

  // Real-time subscriptions
  subscribeToInventory(callback: (items: InventoryItem[]) => void): Unsubscribe {
    const inventoryRef = collection(db, 'inventory_items');
    
    this.inventoryUnsubscribe = onSnapshot(inventoryRef, (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          partNumber: doc.id,
          componentName: data.componentName,
          currentStock: data.currentStock || 0,
          minStock: data.minStock || 0,
          unitCost: data.unitCost || 0,
          inventoryValue: data.inventoryValue || 0,
          digikeyPN: data.digikeyPN,
          leadTime: data.leadTime,
          status: data.status || 'Unknown',
          supplier: data.supplier,
          category: data.category,
          lastUpdated: data.lastUpdated?.toDate(),
          createdAt: data.createdAt?.toDate()
        });
      });
      callback(items);
    });

    return this.inventoryUnsubscribe;
  }

  subscribeToBOMTemplates(callback: (templates: BOMTemplate[]) => void): Unsubscribe {
    const bomTemplatesRef = collection(db, 'bom_templates');
    const q = query(bomTemplatesRef, orderBy('updatedAt', 'desc'));
    
    this.bomTemplatesUnsubscribe = onSnapshot(q, (snapshot) => {
      const templates: BOMTemplate[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        templates.push({
          bomId: doc.id,
          name: data.name,
          description: data.description,
          version: data.version,
          status: data.status,
          parts: data.parts || [],
          totalEstimatedCost: data.totalEstimatedCost || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy || 'unknown'
        });
      });
      callback(templates);
    });

    return this.bomTemplatesUnsubscribe;
  }

  // Legacy methods for backward compatibility
  async saveBOM(items: BOMItem[]): Promise<void> {
    console.log('💾 Saving BOM to Firebase:', items.length, 'items');
    // This would typically create a new BOM template
    // For now, we'll just log the action
  }

  async loadBOM(): Promise<BOMItem[]> {
    // Load the most recent BOM template
    const templates = await this.getBOMTemplates();
    if (templates.length > 0) {
      return templates[0].parts;
    }
    return [];
  }

  async deleteBOM(bomId: string): Promise<void> {
    await this.deleteBOMTemplate(bomId);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Cleanup method
  cleanup(): void {
    if (this.inventoryUnsubscribe) {
      this.inventoryUnsubscribe();
      this.inventoryUnsubscribe = null;
    }
    if (this.bomTemplatesUnsubscribe) {
      this.bomTemplatesUnsubscribe();
      this.bomTemplatesUnsubscribe = null;
    }
  }
}

export default HybridFirebaseBOMService;
