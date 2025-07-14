// Type declarations for EasyEDAService
export interface EasyEDAComponent {
  id: string;
  title: string;
  partNumber: string;
  manufacturer: string;
  description: string;
  package: string;
  datasheet: string;
  price: string;
  stock: string;
  easyedaUrl: string;
  lcscUrl: string;
  footprint: string;
  symbol: string;
}

export interface EasyEDAUrls {
  search: string;
  library: string;
  lcsc: string;
  symbol: string;
  footprint: string;
}

export interface EasyEDAExportData {
  format: string;
  data: any[];
  csv: string;
  timestamp: string;
}

export interface BOMItem {
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

declare class EasyEDAService {
  constructor();
  
  searchComponents(query: string): Promise<EasyEDAComponent[]>;
  generateEasyEDAUrls(bomItem: BOMItem): EasyEDAUrls;
  autoSelectComponent(bomItem: BOMItem, easyedaTabId?: string): Promise<any>;
  exportForEasyEDA(bomData: BOMItem[]): EasyEDAExportData;
  generateBookmarklet(): { name: string; code: string; instructions: string[] };
}

export default EasyEDAService;
