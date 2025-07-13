import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// BOMItem interface (matching your existing structure)
export interface BOMItem {
  id: string;
  itemName?: string;
  description?: string;
  partNumber?: string;
  category?: string;
  quantity?: number;
  unitCost?: number;
  extendedCost?: number;
  supplier?: string;
  digikeyPN?: string;
}

// Inventory Item interface (matching your db-schema.md)
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
  supplier: string;
  category: string;
  lastUpdated: Timestamp;
  createdAt: Timestamp;
}

// BOM Template interface (matching your db-schema.md)
export interface BOMTemplate {
  bomId: string;
  name: string;
  description?: string;
  version: string;
  status: 'active' | 'draft' | 'archived';
  parts: BOMTemplatePart[];
  totalEstimatedCost: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface BOMTemplatePart {
  partNumber: string;
  description: string;
  category: string;
  quantityRequired: number;
  unitCost: number;
  totalCost: number;
  supplier: string;
  digikeyPN?: string;
  availability: 'available' | 'low_stock' | 'out_of_stock';
}

// BOM Execution interface (matching your db-schema.md)
export interface BOMExecution {
  executionId: string;
  bomTemplateId: string;
  bomTemplateName: string;
  executedAt: Timestamp;
  status: 'running' | 'completed' | 'failed' | 'partial';
  results: {
    totalPartsRequired: number;
    partsAvailable: number;
    partsMissing: number;
    totalCost: number;
    estimatedCost: number;
    costVariance: number;
  };
  missingParts: MissingPart[];
  lowStockWarnings: LowStockWarning[];
  outputFiles?: {
    sharepointUrl?: string;
    fileName?: string;
  };
  processingTime: number;
  n8nExecutionId?: string;
}

export interface MissingPart {
  partNumber: string;
  description: string;
  quantityRequired: number;
  quantityAvailable: number;
  shortage: number;
}

export interface LowStockWarning {
  partNumber: string;
  description: string;
  currentStock: number;
  minStock: number;
  quantityRequired: number;
}

// Audit Log interface (matching your db-schema.md)
export interface AuditLogEntry {
  timestamp: Timestamp;
  action: string;
  entityType: 'bom' | 'inventory' | 'system';
  entityId: string;
  details: any;
  source: string;
  userId: string;
  ipAddress?: string;
  success: boolean;
  errorMessage?: string;
}

export class FirebaseBOMService {
  private static instance: FirebaseBOMService;
  private userId: string | null = null;

  private constructor() {
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      this.userId = user?.uid || null;
    });
  }

  static getInstance(): FirebaseBOMService {
    if (!FirebaseBOMService.instance) {
      FirebaseBOMService.instance = new FirebaseBOMService();
    }
    return FirebaseBOMService.instance;
  }

  // Collection references
  private getInventoryCollection() {
    return collection(db, 'inventory_items');
  }

  private getBOMTemplatesCollection() {
    return collection(db, 'bom_templates');
  }

  private getBOMExecutionsCollection() {
    return collection(db, 'bom_executions');
  }

  private getAuditLogCollection() {
    return collection(db, 'audit_log');
  }

  private getConfigurationCollection() {
    return collection(db, 'configuration');
  }

  // Inventory Management
  async getInventoryItems(): Promise<InventoryItem[]> {
    const querySnapshot = await getDocs(
      query(this.getInventoryCollection(), orderBy('partNumber'))
    );
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      partNumber: doc.id
    })) as InventoryItem[];
  }

  async getInventoryItem(partNumber: string): Promise<InventoryItem | null> {
    const docRef = doc(this.getInventoryCollection(), partNumber);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { ...docSnap.data(), partNumber: docSnap.id } as InventoryItem;
    }
    return null;
  }

  async updateInventoryItem(item: Partial<InventoryItem> & { partNumber: string }): Promise<void> {
    const docRef = doc(this.getInventoryCollection(), item.partNumber);
    const updateData = {
      ...item,
      lastUpdated: serverTimestamp(),
      inventoryValue: (item.currentStock || 0) * (item.unitCost || 0)
    };
    delete updateData.partNumber; // Remove partNumber from update data since it's the doc ID
    
    await updateDoc(docRef, updateData);
    
    // Log the inventory update
    await this.logAuditEntry({
      action: 'inventory_updated',
      entityType: 'inventory',
      entityId: item.partNumber,
      details: { updatedFields: Object.keys(item) },
      success: true
    });
  }

  async createInventoryItem(item: Omit<InventoryItem, 'createdAt' | 'lastUpdated'>): Promise<void> {
    const docRef = doc(this.getInventoryCollection(), item.partNumber);
    const createData = {
      ...item,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      inventoryValue: item.currentStock * item.unitCost
    };
    delete createData.partNumber; // Remove partNumber from create data since it's the doc ID
    
    await updateDoc(docRef, createData);
    
    await this.logAuditEntry({
      action: 'inventory_created',
      entityType: 'inventory',
      entityId: item.partNumber,
      details: { componentName: item.componentName, supplier: item.supplier },
      success: true
    });
  }

  // BOM Template Management
  async createBOMTemplate(
    name: string, 
    bomItems: BOMItem[], 
    description?: string,
    version: string = '1.0'
  ): Promise<string> {
    if (!this.userId) throw new Error('User not authenticated');

    // Convert BOMItems to BOMTemplateParts
    const parts: BOMTemplatePart[] = await Promise.all(
      bomItems.map(async (item) => {
        // Check inventory availability
        const inventoryItem = item.partNumber ? 
          await this.getInventoryItem(item.partNumber) : null;
        
        let availability: 'available' | 'low_stock' | 'out_of_stock' = 'available';
        if (inventoryItem) {
          if (inventoryItem.currentStock === 0) {
            availability = 'out_of_stock';
          } else if (inventoryItem.currentStock <= inventoryItem.minStock) {
            availability = 'low_stock';
          }
        }

        return {
          partNumber: item.partNumber || '',
          description: item.description || item.itemName || '',
          category: item.category || '',
          quantityRequired: item.quantity || 0,
          unitCost: item.unitCost || 0,
          totalCost: (item.quantity || 0) * (item.unitCost || 0),
          supplier: item.supplier || '',
          digikeyPN: item.digikeyPN || '',
          availability
        };
      })
    );

    const totalEstimatedCost = parts.reduce((sum, part) => sum + part.totalCost, 0);
    const bomId = `bom_${Date.now()}`;

    const bomTemplate: Omit<BOMTemplate, 'createdAt' | 'updatedAt'> = {
      bomId,
      name,
      description,
      version,
      status: 'active',
      parts,
      totalEstimatedCost,
      createdBy: this.userId
    };

    const docRef = await addDoc(this.getBOMTemplatesCollection(), {
      ...bomTemplate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await this.logAuditEntry({
      action: 'bom_template_created',
      entityType: 'bom',
      entityId: docRef.id,
      details: { 
        bomName: name, 
        totalCost: totalEstimatedCost, 
        partsCount: parts.length 
      },
      success: true
    });

    return docRef.id;
  }

  async getBOMTemplates(): Promise<BOMTemplate[]> {
    const querySnapshot = await getDocs(
      query(this.getBOMTemplatesCollection(), orderBy('updatedAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BOMTemplate[];
  }

  async getBOMTemplate(templateId: string): Promise<BOMTemplate | null> {
    const docRef = doc(this.getBOMTemplatesCollection(), templateId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BOMTemplate;
    }
    return null;
  }

  // BOM Execution - Generate BOM with current inventory check
  async executeBOM(templateId: string): Promise<string> {
    if (!this.userId) throw new Error('User not authenticated');

    const template = await this.getBOMTemplate(templateId);
    if (!template) throw new Error('BOM template not found');

    const executionId = `exec_${Date.now()}`;
    const startTime = Date.now();

    // Check inventory for each part
    const missingParts: MissingPart[] = [];
    const lowStockWarnings: LowStockWarning[] = [];
    let partsAvailable = 0;
    let totalCost = 0;

    for (const part of template.parts) {
      const inventoryItem = await this.getInventoryItem(part.partNumber);
      
      if (!inventoryItem || inventoryItem.currentStock < part.quantityRequired) {
        const shortage = part.quantityRequired - (inventoryItem?.currentStock || 0);
        missingParts.push({
          partNumber: part.partNumber,
          description: part.description,
          quantityRequired: part.quantityRequired,
          quantityAvailable: inventoryItem?.currentStock || 0,
          shortage
        });
      } else {
        partsAvailable++;
        totalCost += part.totalCost;
        
        // Check for low stock warning
        if (inventoryItem.currentStock <= inventoryItem.minStock) {
          lowStockWarnings.push({
            partNumber: part.partNumber,
            description: part.description,
            currentStock: inventoryItem.currentStock,
            minStock: inventoryItem.minStock,
            quantityRequired: part.quantityRequired
          });
        }
      }
    }

    const processingTime = (Date.now() - startTime) / 1000;
    const status: 'completed' | 'partial' | 'failed' = 
      missingParts.length === 0 ? 'completed' : 
      partsAvailable > 0 ? 'partial' : 'failed';

    const execution: Omit<BOMExecution, 'executedAt'> = {
      executionId,
      bomTemplateId: templateId,
      bomTemplateName: template.name,
      status,
      results: {
        totalPartsRequired: template.parts.length,
        partsAvailable,
        partsMissing: missingParts.length,
        totalCost,
        estimatedCost: template.totalEstimatedCost,
        costVariance: totalCost - template.totalEstimatedCost
      },
      missingParts,
      lowStockWarnings,
      processingTime
    };

    const docRef = await addDoc(this.getBOMExecutionsCollection(), {
      ...execution,
      executedAt: serverTimestamp()
    });

    await this.logAuditEntry({
      action: 'bom_executed',
      entityType: 'bom',
      entityId: templateId,
      details: {
        executionId,
        status,
        totalCost,
        missingPartsCount: missingParts.length
      },
      success: true
    });

    return docRef.id;
  }

  // Get BOM execution results
  async getBOMExecution(executionId: string): Promise<BOMExecution | null> {
    const querySnapshot = await getDocs(
      query(this.getBOMExecutionsCollection(), where('executionId', '==', executionId))
    );
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { ...doc.data() } as BOMExecution;
    }
    return null;
  }

  // Get recent BOM executions
  async getRecentExecutions(limit: number = 10): Promise<BOMExecution[]> {
    const querySnapshot = await getDocs(
      query(
        this.getBOMExecutionsCollection(), 
        orderBy('executedAt', 'desc'),
        // Note: Firestore doesn't have a built-in limit, you'd need to implement pagination
      )
    );
    
    return querySnapshot.docs
      .slice(0, limit)
      .map(doc => ({ ...doc.data() })) as BOMExecution[];
  }

  // Audit logging
  private async logAuditEntry(entry: Omit<AuditLogEntry, 'timestamp' | 'userId' | 'source'>): Promise<void> {
    const auditEntry: Omit<AuditLogEntry, 'timestamp'> = {
      ...entry,
      userId: this.userId || 'anonymous',
      source: 'firebase_bom_service'
    };

    await addDoc(this.getAuditLogCollection(), {
      ...auditEntry,
      timestamp: serverTimestamp()
    });
  }

  // Configuration management
  async getSystemConfiguration(): Promise<any> {
    const docRef = doc(this.getConfigurationCollection(), 'system_settings');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  }

  // Utility methods for legacy BOM support
  async saveLegacyBOM(name: string, items: BOMItem[], description?: string): Promise<string> {
    return await this.createBOMTemplate(name, items, description);
  }

  async loadLegacyBOM(bomId: string): Promise<BOMItem[] | null> {
    const template = await this.getBOMTemplate(bomId);
    if (!template) return null;

    // Convert BOMTemplateParts back to BOMItems
    return template.parts.map((part, index) => ({
      id: `${index + 1}`,
      itemName: part.description,
      description: part.description,
      partNumber: part.partNumber,
      category: part.category,
      quantity: part.quantityRequired,
      unitCost: part.unitCost,
      extendedCost: part.totalCost,
      supplier: part.supplier,
      digikeyPN: part.digikeyPN
    }));
  }

  // Real-time subscriptions
  subscribeToInventory(callback: (items: InventoryItem[]) => void): () => void {
    return onSnapshot(
      query(this.getInventoryCollection(), orderBy('partNumber')),
      (querySnapshot) => {
        const items = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          partNumber: doc.id
        })) as InventoryItem[];
        callback(items);
      }
    );
  }

  subscribeToBOMTemplates(callback: (templates: BOMTemplate[]) => void): () => void {
    return onSnapshot(
      query(this.getBOMTemplatesCollection(), orderBy('updatedAt', 'desc')),
      (querySnapshot) => {
        const templates = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BOMTemplate[];
        callback(templates);
      }
    );
  }
}
}

// Export singleton instance
export const firebaseBOMService = FirebaseBOMService.getInstance();
