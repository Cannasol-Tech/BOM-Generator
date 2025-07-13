import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Download, 
  Upload, 
  CheckCircle, 
  X,
  Building,
  DollarSign,
  Package,
  ShoppingCart,
  ExternalLink,
  FileSpreadsheet,
  Zap,
  Save,
  FolderOpen,
  Search,
  Filter,
  Copy,
  Trash2,
  PlusCircle,
  Eye,
  EyeOff,
  Database,
  Layers,
  Target,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Edit2
} from 'lucide-react';

// Type definitions
interface BOMItem {
  id: number;
  partNumber: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  extendedCost: number;
  supplier: string;
  leadTime: number;
  revision: string;
  status: string;
  requiredFor: string;
  digikeyPN: string;
  manufacturerPN: string;
  nlpParsed?: boolean;
  confidence?: number;
  originalInput?: string;
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


// Named BOM interface
interface NamedBOM {
  id: string;
  name: string;
  description: string;
  bomData: BOMItem[];
  createdDate: string;
  lastModified: string;
  version: string;
  totalItems: number;
  totalCost: number;
}

// BOM Storage Service
const BOMStorage = {
  STORAGE_KEY: 'cannasol-bom-data',
  NAMED_BOMS_KEY: 'cannasol-named-boms',
  INVENTORY_KEY: 'cannasol-inventory-data',
  CURRENT_BOM_KEY: 'cannasol-current-bom-id',
  
  // Legacy methods for backward compatibility
  save: (bomData: BOMItem[]) => {
    try {
      const saveData = {
        bomData,
        lastModified: new Date().toISOString(),
        version: '2.0'
      };
      localStorage.setItem(BOMStorage.STORAGE_KEY, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('Failed to save BOM data:', error);
      return false;
    }
  },
  
  load: () => {
    try {
      const data = localStorage.getItem(BOMStorage.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.bomData || parsed; // Handle both new and old formats
      }
      return BOMStorage.getDefaultData();
    } catch (error) {
      console.error('Failed to load BOM data:', error);
      return BOMStorage.getDefaultData();
    }
  },

  // Named BOM methods
  saveNamedBOM: (name: string, description: string, bomData: BOMItem[]): string => {
    try {
      const namedBOMs = BOMStorage.getNamedBOMs();
      const totalCost = bomData.reduce((sum, item) => sum + item.extendedCost, 0);
      
      const bomId = `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newBOM: NamedBOM = {
        id: bomId,
        name: name.trim(),
        description: description.trim(),
        bomData,
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '2.0',
        totalItems: bomData.length,
        totalCost
      };

      namedBOMs.push(newBOM);
      localStorage.setItem(BOMStorage.NAMED_BOMS_KEY, JSON.stringify(namedBOMs));
      
      // Set as current BOM
      localStorage.setItem(BOMStorage.CURRENT_BOM_KEY, bomId);
      
      return bomId;
    } catch (error) {
      console.error('Failed to save named BOM:', error);
      throw error;
    }
  },

  updateNamedBOM: (bomId: string, bomData: BOMItem[]) => {
    try {
      const namedBOMs = BOMStorage.getNamedBOMs();
      const bomIndex = namedBOMs.findIndex(bom => bom.id === bomId);
      
      if (bomIndex === -1) {
        throw new Error('BOM not found');
      }

      const totalCost = bomData.reduce((sum, item) => sum + item.extendedCost, 0);
      
      namedBOMs[bomIndex] = {
        ...namedBOMs[bomIndex],
        bomData,
        lastModified: new Date().toISOString(),
        totalItems: bomData.length,
        totalCost
      };

      localStorage.setItem(BOMStorage.NAMED_BOMS_KEY, JSON.stringify(namedBOMs));
      return true;
    } catch (error) {
      console.error('Failed to update named BOM:', error);
      return false;
    }
  },

  renameNamedBOM: (bomId: string, newName: string, newDescription: string) => {
    try {
      const namedBOMs = BOMStorage.getNamedBOMs();
      const bomIndex = namedBOMs.findIndex(bom => bom.id === bomId);
      
      if (bomIndex === -1) {
        throw new Error('BOM not found');
      }

      namedBOMs[bomIndex] = {
        ...namedBOMs[bomIndex],
        name: newName.trim(),
        description: newDescription.trim(),
        lastModified: new Date().toISOString()
      };

      localStorage.setItem(BOMStorage.NAMED_BOMS_KEY, JSON.stringify(namedBOMs));
      return true;
    } catch (error) {
      console.error('Failed to rename BOM:', error);
      return false;
    }
  },

  getNamedBOMs: (): NamedBOM[] => {
    try {
      const data = localStorage.getItem(BOMStorage.NAMED_BOMS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load named BOMs:', error);
      return [];
    }
  },

  getNamedBOM: (bomId: string): NamedBOM | null => {
    try {
      const namedBOMs = BOMStorage.getNamedBOMs();
      return namedBOMs.find(bom => bom.id === bomId) || null;
    } catch (error) {
      console.error('Failed to load named BOM:', error);
      return null;
    }
  },

  deleteNamedBOM: (bomId: string) => {
    try {
      const namedBOMs = BOMStorage.getNamedBOMs();
      const filteredBOMs = namedBOMs.filter(bom => bom.id !== bomId);
      localStorage.setItem(BOMStorage.NAMED_BOMS_KEY, JSON.stringify(filteredBOMs));
      
      // If this was the current BOM, clear current BOM
      const currentBOMId = localStorage.getItem(BOMStorage.CURRENT_BOM_KEY);
      if (currentBOMId === bomId) {
        localStorage.removeItem(BOMStorage.CURRENT_BOM_KEY);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete named BOM:', error);
      return false;
    }
  },

  getCurrentBOMId: (): string | null => {
    return localStorage.getItem(BOMStorage.CURRENT_BOM_KEY);
  },

  setCurrentBOM: (bomId: string) => {
    localStorage.setItem(BOMStorage.CURRENT_BOM_KEY, bomId);
  },

  clearCurrentBOM: () => {
    localStorage.removeItem(BOMStorage.CURRENT_BOM_KEY);
  },

  saveInventory: (inventoryData: BOMItem[]) => {
    try {
      localStorage.setItem(BOMStorage.INVENTORY_KEY, JSON.stringify(inventoryData));
      return true;
    } catch (error) {
      console.error('Failed to save inventory data:', error);
      return false;
    }
  },

  loadInventory: () => {
    try {
      const data = localStorage.getItem(BOMStorage.INVENTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load inventory data:', error);
      return [];
    }
  },
  
  exportJSON: (bomData: BOMItem[], filename = 'cannasol-bom-export.json') => {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '2.0',
      company: 'Cannasol Technologies',
      bomData: bomData
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  
  importJSON: (file: File, callback: (data: BOMItem[]) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        const bomData = importData.bomData || importData;
        callback(bomData);
      } catch (error) {
        alert('Invalid JSON file format');
      }
    };
    reader.readAsText(file);
  },
  
  getDefaultData: () => []
};

// CSV/Excel Import Service
const ImportService = {
  // Smart header detection to handle title rows and merged cells
  detectActualHeaders: (lines: string[]) => {
    console.log('🔍 Detecting actual headers from', lines.length, 'lines');
    
    for (let i = 0; i < Math.min(lines.length, 5); i++) { // Check first 5 lines
      const row = lines[i].split(',').map(h => h.trim().replace(/"/g, ''));
      console.log(`Row ${i}:`, row);
      
      // Skip if row is likely a title (has content in first cell but mostly empty after)
      const nonEmptyCount = row.filter(cell => cell && cell.trim()).length;
      const hasSpanningTitle = nonEmptyCount <= 2 && row[0] && row[0].length > 10;
      
      if (hasSpanningTitle) {
        console.log(`⏭️ Skipping row ${i} - appears to be spanning title:`, row[0]);
        continue;
      }
      
      // Check if this looks like actual headers
      const hasMultipleNonEmpty = nonEmptyCount >= 3;
      const hasHeaderKeywords = row.some(cell => 
        cell && /^(id|name|description|part|number|quantity|qty|cost|price|supplier|category|type|inventory|component|stock|min|lead|time|digikey|status)$/i.test(cell.trim())
      );
      
      console.log(`Row ${i} analysis: nonEmpty=${nonEmptyCount}, hasKeywords=${hasHeaderKeywords}, keywords found:`, 
        row.filter(cell => cell && /^(id|name|description|part|number|quantity|qty|cost|price|supplier|category|type|inventory|component|stock|min|lead|time|digikey|status)$/i.test(cell.trim()))
      );
      
      if (hasMultipleNonEmpty && (hasHeaderKeywords || i > 0)) {
        console.log(`✅ Found headers at row ${i}:`, row);
        return { headerRow: i, headers: row };
      }
    }
    
    // Fallback to first row if no clear headers found
    console.log('⚠️ No clear headers detected, using first row as fallback');
    const fallbackHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return { headerRow: 0, headers: fallbackHeaders };
  },

  parseCSV: (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const { headerRow, headers } = ImportService.detectActualHeaders(lines);
    console.log('📋 Using headers from row', headerRow, ':', headers);
    
    const data = [];

    for (let i = headerRow + 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      // Skip rows that are clearly section headers or empty
      const nonEmptyValues = values.filter(v => v && v.trim()).length;
      if (nonEmptyValues === 0) continue;
      
      // Skip if it looks like a section header (first cell has content, rest mostly empty)
      if (nonEmptyValues <= 2 && values[0] && values[0].length > 10) {
        console.log('⏭️ Skipping section header:', values[0]);
        continue;
      }
      
      if (values.length >= headers.length - 2) { // Allow some flexibility in column count
        const row: { [key: string]: string } = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    console.log('📊 Parsed', data.length, 'data rows');
    return data;
  },

  parseExcel: async (file: File) => {
    console.log('📊 Parsing Excel file:', file.name, file.type, file.size);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          console.log('📖 File loaded, parsing with SheetJS...');
          
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          console.log('📚 Workbook sheets:', workbook.SheetNames);
          
          // Get the first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Method 1: Standard JSON parsing with smart header detection
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,  // Get raw row data
            defval: ''   // Default value for empty cells
          }) as any[][];
          
          console.log('📊 Raw Excel data (Method 1):', jsonData);
          
          if (jsonData.length >= 2) {
            // Convert to CSV-like format for smart header detection
            const csvLines = jsonData.map(row => 
              row.map(cell => `"${String(cell || '')}"`).join(',')
            );
            
            const { headerRow, headers } = ImportService.detectActualHeaders(csvLines);
            
            // Check if we got proper column structure
            if (Array.isArray(headers) && headers.length > 1) {
              const processedData = [];
              for (let i = headerRow + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;
                
                // Skip section headers in Excel
                const nonEmptyCount = row.filter(cell => cell && String(cell).trim()).length;
                if (nonEmptyCount <= 2 && row[0] && String(row[0]).length > 10) {
                  console.log('⏭️ Skipping Excel section header:', row[0]);
                  continue;
                }
                
                const rowObj: { [key: string]: string } = {};
                headers.forEach((header, index) => {
                  rowObj[header] = String(row[index] || '');
                });
                processedData.push(rowObj);
              }
              
              console.log('✅ Excel parsed with smart headers (Method 1):', processedData);
              resolve(processedData);
              return;
            } else {
              console.log('⚠️ Method 1 failed - single column or malformed headers, trying CSV conversion...');
            }
          }
          
          // Method 2: Auto-convert to CSV if Excel parsing fails or produces single column
          console.log('🔄 Auto-converting Excel to CSV format...');
          
          try {
            // Convert entire sheet to CSV string
            const csvString = XLSX.utils.sheet_to_csv(worksheet, { 
              FS: ',',  // Field separator
              RS: '\n'  // Record separator
            });
            
            console.log('📝 Generated CSV string:', csvString.substring(0, 500) + '...');
            
            // Parse the CSV string using our CSV parser
            const csvData = ImportService.parseCSV(csvString);
            
            if (csvData.length > 0) {
              console.log('✅ Excel auto-converted to CSV successfully:', csvData);
              resolve(csvData);
              return;
            }
          } catch (csvError) {
            console.log('❌ CSV conversion also failed:', csvError);
          }
          
          // Method 3: Try with different Excel parsing options
          console.log('🔄 Trying alternative Excel parsing...');
          
          const altJsonData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: '',
            blankrows: false,
            skipHidden: false
          });
          
          if (altJsonData.length > 0) {
            console.log('✅ Excel parsed with alternative method:', altJsonData);
            resolve(altJsonData);
            return;
          }
          
          // If all methods fail
          throw new Error('Unable to parse Excel file with any method');
          
        } catch (error) {
          console.error('❌ Excel parsing error:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        const error = new Error('Failed to read file');
        console.error('❌ File reading error:', error);
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    });
  },

  normalizeImportedData: (rawData: any[]) => {
    return rawData.map((row: any, index: number) => {
      // Enhanced mapping to handle multiple CSV formats including Cannasol inventory format
      const partNumber = row['Inventory ID'] || row['Part Number'] || row['PartNumber'] || row['part_number'] || 
                        row['ID'] || row['inventory_id'] || 
                        `IMP-${Date.now()}-${index}`;
      
      const description = row['Component Name'] || row['Description'] || row['desc'] || row['description'] || 
                         row['component_name'] || row['name'] || 
                         'Imported Part';
      
      // Smart category detection from component name
      let category = row['Category'] || row['category'] || row['type'] || 'Other';
      if (category === 'Other' && description) {
        // Try to detect category from description
        const desc = description.toLowerCase();
        if (desc.includes('resistor') || desc.includes('ohm') || desc.includes('Ω')) category = 'Resistor';
        else if (desc.includes('capacitor') || desc.includes('cap')) category = 'Capacitor';
        else if (desc.includes('pcb') || desc.includes('board')) category = 'PCB';
        else if (desc.includes('plc') || desc.includes('controller') || desc.includes('mcu')) category = 'IC';
        else if (desc.includes('supply') || desc.includes('power')) category = 'Power Supply';
        else if (desc.includes('connector') || desc.includes('terminal') || desc.includes('j.s.t.')) category = 'Connector';
        else if (desc.includes('relay')) category = 'Relay';
        else if (desc.includes('sensor') || desc.includes('switch')) category = 'Sensor';
        else if (desc.includes('diode') || desc.includes('led')) category = 'Diode';
        else if (desc.includes('fuse')) category = 'Fuse';
        else if (desc.includes('antenna')) category = 'RF';
        else if (desc.includes('screw') || desc.includes('mount') || desc.includes('handle')) category = 'Hardware';
        else if (desc.includes('attiny') || desc.includes('esp32')) category = 'IC';
        else if (desc.includes('isolator') || desc.includes('opto')) category = 'IC';
      }
      
      // Handle various cost formats ($0.00, 0.00, etc.)
      let unitCostStr = row['Unit Cost'] || row['UnitCost'] || row['Price'] || row['Cost'] || '0';
      if (typeof unitCostStr === 'string') {
        unitCostStr = unitCostStr.replace(/[$,\s]/g, ''); // Remove $, commas, spaces
      }
      const unitCost = parseFloat(unitCostStr) || 0;
      
      // Handle stock/quantity fields - prefer Current Stock for inventory files
      const quantity = parseInt(row['Current Stock'] || row['Quantity'] || row['Qty'] || row['quantity'] || 
                               row['current_stock'] || row['stock'] || '1') || 1;
      
      const supplier = row['Supplier'] || row['supplier'] || row['Vendor'] || 'Unknown';
      
      // Handle DigiKey part numbers with various formats
      const digikeyPN = row['Digikey #'] || row['DigiKey PN'] || row['DigiKeyPN'] || row['digikey_pn'] || 
                       row['digikey_number'] || '';
      
      // Status mapping - handle your specific status values
      let status = row['Status'] || row['status'] || 'Active';
      if (status.toLowerCase().includes('out of stock')) {
        status = 'Out of Stock';
      } else if (status.toLowerCase().includes('low stock')) {
        status = 'Low Stock';
      } else if (status.toLowerCase().includes('legacy')) {
        status = 'Legacy';
      } else if (status.toLowerCase().includes('in stock')) {
        status = 'Active';
      } else {
        status = 'Active';
      }

      return {
        id: Date.now() + index,
        partNumber,
        description,
        category,
        quantity,
        unit: 'EA',
        unitCost,
        extendedCost: quantity * unitCost,
        supplier,
        leadTime: parseInt(row['Lead Time'] || row['lead_time'] || '1') || 1,
        revision: 'A',
        status,
        requiredFor: 'Base System',
        digikeyPN: digikeyPN === 'N / A' ? '' : digikeyPN, // Clean up N/A values
        manufacturerPN: partNumber
      } as BOMItem;
    });
  }
};

// NLP Service for AI-Powered Component Recognition
const NLPService = {
  // Component patterns for intelligent parsing
  componentPatterns: {
    resistor: /(\d+(?:\.\d+)?)\s*([kmgKMG]?)\s*(?:ohm|Ω|ohms?)\s*(?:(\d+(?:\.\d+)?)\s*%?)?\s*(?:(\d+\/\d+|\d+)\s*[wW]?)?/i,
    capacitor: /(\d+(?:\.\d+)?)\s*([pnumkKMGU]?[fF])\s*(?:(\d+(?:\.\d+)?)\s*[vV]?)?\s*([xX]\d[rR]|[cC]\d[gG]|[nN][pP][oO])?/i,
    inductor: /(\d+(?:\.\d+)?)\s*([pnumkKMGU]?[hH])\s*(?:(\d+(?:\.\d+)?)\s*[aA]?)?/i,
    ic: /(?:STM32|PIC|ATMEGA|LM|TL|74|CD|MC|AD|MAX|LTC|TPS|AMS)[\w\d-]+/i,
    diode: /(?:1N\d+|BAT\d+|SMBJ|SMAJ|BZX|BZV|LED)/i,
    transistor: /(?:2N\d+|BC\d+|2SA|2SB|2SC|2SD|BSS|IRF|FET)/i
  },

  categoryKeywords: {
    'IC': ['microcontroller', 'processor', 'amplifier', 'regulator', 'driver', 'controller', 'mcu', 'cpu', 'dsp', 'fpga'],
    'Resistor': ['resistor', 'ohm', 'resistance', 'pullup', 'pulldown', 'termination'],
    'Capacitor': ['capacitor', 'cap', 'farad', 'ceramic', 'electrolytic', 'tantalum', 'film'],
    'Inductor': ['inductor', 'choke', 'ferrite', 'henry', 'coil'],
    'Diode': ['diode', 'led', 'zener', 'schottky', 'rectifier'],
    'Transistor': ['transistor', 'mosfet', 'fet', 'bjt', 'jfet'],
    'Connector': ['connector', 'header', 'socket', 'plug', 'jack', 'terminal'],
    'Hardware': ['screw', 'bolt', 'nut', 'washer', 'standoff', 'spacer'],
    'Tank': ['tank', 'vessel', 'container', 'chamber'],
    'Pump': ['pump', 'motor', 'actuator'],
    'Sensor': ['sensor', 'detector', 'transducer', 'accelerometer', 'gyro'],
    'PCB': ['pcb', 'board', 'substrate'],
    'Cable': ['cable', 'wire', 'harness', 'ribbon']
  },

  parseNaturalLanguage: (input: string, existingCategories: string[] = [], existingSuppliers: string[] = []) => {
    const text = input.toLowerCase().trim();
    
    // Extract quantity if mentioned
    const quantityMatch = text.match(/(?:(\d+)\s*(?:pieces?|pcs?|units?|ea|each|x))|(?:qty\s*:?\s*(\d+))|(?:quantity\s*:?\s*(\d+))/i);
    const quantity = quantityMatch ? parseInt(quantityMatch[1] || quantityMatch[2] || quantityMatch[3]) || 1 : 1;

    // Extract cost if mentioned
    const costMatch = text.match(/\$(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*dollars?/i);
    const unitCost = costMatch ? parseFloat(costMatch[1] || costMatch[2]) || 0 : 0;

    // Determine category based on patterns and keywords
    let category = 'Other';
    let specifications = {};

    // Check component patterns first
    for (const [type, pattern] of Object.entries(NLPService.componentPatterns)) {
      const match = text.match(pattern);
      if (match) {
        category = NLPService.getCategoryFromType(type);
        specifications = NLPService.extractSpecifications(type, match);
        break;
      }
    }

    // If no pattern match, use keyword matching with dynamic categories
    if (category === 'Other') {
      // First check existing categories for partial matches
      for (const existingCat of existingCategories) {
        if (typeof existingCat === 'string' && text.includes(existingCat.toLowerCase())) {
          category = existingCat;
          break;
        }
      }
      
      // If still not found, use default keyword matching
      if (category === 'Other') {
        for (const [cat, keywords] of Object.entries(NLPService.categoryKeywords)) {
          if (keywords.some(keyword => text.includes(keyword))) {
            category = cat;
            break;
          }
        }
      }
    }

    // Extract supplier mentions (including dynamic ones from existing data)  
    let supplier = '';
    
    // First check for hardcoded supplier patterns
    const supplierPatterns = {
      'DigiKey': /digikey|digi-key/i,
      'McMaster-Carr': /mcmaster|mcmaster-carr/i,
      'Mouser': /mouser/i,
      'Farnell': /farnell|element14/i,
      'RS Components': /rs components|rs/i
    };

    for (const [name, pattern] of Object.entries(supplierPatterns)) {
      if (pattern.test(text)) {
        supplier = name;
        break;
      }
    }
    
    // If no hardcoded match, check existing suppliers
    if (!supplier) {
      for (const existingSup of existingSuppliers) {
        if (typeof existingSup === 'string' && text.includes(existingSup.toLowerCase())) {
          supplier = existingSup;
          break;
        }
      }
    }

    // Generate enhanced description
    const description = NLPService.generateDescription(input, specifications);

    return {
      description,
      category,
      quantity,
      unitCost,
      supplier,
      specifications,
      confidence: NLPService.calculateConfidence(text, category),
      originalInput: input
    };
  },

  getCategoryFromType: (type: string) => {
    const mapping: { [key: string]: string } = {
      'resistor': 'Resistor',
      'capacitor': 'Capacitor',
      'inductor': 'Inductor',
      'ic': 'IC',
      'diode': 'Diode',
      'transistor': 'Transistor'
    };
    return mapping[type] || 'Other';
  },

  extractSpecifications: (type: string, match: RegExpMatchArray | null) => {
    const specs: { [key: string]: string } = {};
    
    if (!match) return specs;
    
    switch (type) {
      case 'resistor':
        if (match[1]) specs.value = `${match[1]}${match[2] || ''}Ω`;
        if (match[3]) specs.tolerance = `${match[3]}%`;
        if (match[4]) specs.power = match[4];
        break;
      case 'capacitor':
        if (match[1]) specs.value = `${match[1]}${match[2] || 'F'}`;
        if (match[3]) specs.voltage = `${match[3]}V`;
        if (match[4]) specs.dielectric = match[4];
        break;
      case 'inductor':
        if (match[1]) specs.value = `${match[1]}${match[2] || 'H'}`;
        if (match[3]) specs.current = `${match[3]}A`;
        break;
    }
    
    return specs;
  },

  generateDescription: (input: string, specifications: any) => {
    // Clean up the input and enhance with specifications
    let description = input.trim();
    
    // Capitalize first letter
    description = description.charAt(0).toUpperCase() + description.slice(1);
    
    // Add specifications if available
    if (Object.keys(specifications).length > 0) {
      const specStrings = Object.entries(specifications)
        .map(([, value]) => `${value}`)
        .join(' ');
      
      if (!description.includes(specStrings)) {
        description += ` - ${specStrings}`;
      }
    }
    
    return description;
  },

  calculateConfidence: (text: string, category: string) => {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on specific patterns
    for (const pattern of Object.values(NLPService.componentPatterns)) {
      if (pattern.test(text)) {
        confidence += 0.3;
        break;
      }
    }
    
    // Increase confidence for keyword matches
    const keywords = (NLPService.categoryKeywords as any)[category] || [];
    const keywordMatches = keywords.filter((keyword: string) => text.includes(keyword)).length;
    confidence += Math.min(keywordMatches * 0.1, 0.3);
    
    return Math.min(confidence, 1.0);
  },

  // AI-ready feature: Generate search suggestions
  generateSearchSuggestions: (input: string, inventory: any[] = []) => {
    const suggestions: any[] = [];
    
    // Find similar parts in inventory
    inventory.forEach((item: any) => {
      const similarity = NLPService.calculateSimilarity(input, item.description);
      if (similarity > 0.3) {
        suggestions.push({
          ...item,
          similarity,
          reason: `Similar to: ${item.description}`
        });
      }
    });
    
    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  },

  calculateSimilarity: (text1: string, text2: string) => {
    // Simple word-based similarity (could be enhanced with more sophisticated NLP)
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter((word: string) => words2.includes(word));
    const union = new Set([...words1, ...words2]);
    
    return intersection.length / union.size;
  }
};

// Part Number Generator Service
const PartNumberService = {
  categoryPrefixes: {
    'IC': 'IC',
    'Resistor': 'R',
    'Capacitor': 'C',
    'Inductor': 'L',
    'Diode': 'D',
    'Transistor': 'Q',
    'Tank': 'TA',
    'Pump': 'PU',
    'Sensor': 'SE',
    'Hardware': 'HW',
    'PCB': 'PCB',
    'Cable': 'CA',
    'Connector': 'CN',
    'Other': 'OT'
  },

  generatePartNumber: (category: string, existingNumbers: string[] = []) => {
    const prefix = (PartNumberService.categoryPrefixes as any)[category] || 'OT';
    const existingWithPrefix = existingNumbers
      .filter((num: string) => num.startsWith(prefix))
      .map((num: string) => {
        const parts = num.split('-');
        return parts.length >= 3 ? parseInt(parts[2]) : 0;
      })
      .filter((num: number) => !isNaN(num));

    const nextNumber = existingWithPrefix.length > 0 ? Math.max(...existingWithPrefix) + 1 : 1;
    return `${prefix}-001-${String(nextNumber).padStart(3, '0')}`;
  }
};

// Utility Components
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg shadow-md border border-gray-100 ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  className = '', 
  disabled = false 
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) => {
  const baseClasses = 'font-medium rounded-md transition-colors duration-200 inline-flex items-center gap-2 border';
  const variants: { [key: string]: string } = {
    primary: 'bg-gray-900 hover:bg-gray-800 text-white border-gray-900',
    secondary: 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300',
    outline: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-600'
  };
  const sizes: { [key: string]: string } = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ 
  children, 
  variant = 'default', 
  className = '' 
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}) => {
  const variants: { [key: string]: string } = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// BOM Management Dialog Component
const BOMManagementDialog = ({ 
  isOpen, 
  onClose, 
  onLoadBOM, 
  onSaveBOM, 
  currentBOMId, 
  currentBOMData 
}: {
  isOpen: boolean;
  onClose: () => void;
  onLoadBOM: (bomId: string) => void;
  onSaveBOM: (name: string, description: string) => void;
  currentBOMId: string | null;
  currentBOMData: BOMItem[];
}) => {
  const [namedBOMs, setNamedBOMs] = useState<NamedBOM[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renamingBOM, setRenamingBOM] = useState<NamedBOM | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'cost'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (isOpen) {
      refreshBOMList();
    }
  }, [isOpen]);

  const refreshBOMList = () => {
    const boms = BOMStorage.getNamedBOMs();
    console.log('🗂️ Refreshing BOM list, found', boms.length, 'BOMs:', boms);
    setNamedBOMs(boms);
  };

  const handleSaveBOM = () => {
    if (!saveName.trim()) {
      alert('Please enter a name for your BOM');
      return;
    }

    // Check for duplicate names
    const existingBOM = namedBOMs.find(bom => 
      bom.name.toLowerCase() === saveName.trim().toLowerCase()
    );
    
    if (existingBOM) {
      if (!confirm('A BOM with this name already exists. Do you want to overwrite it?')) {
        return;
      }
      // Delete the existing BOM
      BOMStorage.deleteNamedBOM(existingBOM.id);
    }

    try {
      const bomId = BOMStorage.saveNamedBOM(saveName, saveDescription, currentBOMData);
      console.log('✅ BOM saved in dialog with ID:', bomId);
      
      onSaveBOM(saveName, saveDescription);
      setSaveName('');
      setSaveDescription('');
      setShowSaveDialog(false);
      refreshBOMList();
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = `BOM "${saveName}" saved successfully!`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (error) {
      console.error('❌ Dialog save error:', error);
      alert('Failed to save BOM: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleRenameBOM = () => {
    if (!renamingBOM || !saveName.trim()) {
      alert('Please enter a valid name');
      return;
    }

    try {
      BOMStorage.renameNamedBOM(renamingBOM.id, saveName, saveDescription);
      setSaveName('');
      setSaveDescription('');
      setShowRenameDialog(false);
      setRenamingBOM(null);
      refreshBOMList();
    } catch (error) {
      alert('Failed to rename BOM: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteBOM = (bom: NamedBOM) => {
    if (!confirm(`Are you sure you want to delete "${bom.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      BOMStorage.deleteNamedBOM(bom.id);
      refreshBOMList();
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = `BOM "${bom.name}" deleted successfully!`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (error) {
      alert('Failed to delete BOM: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const sortedBOMs = [...namedBOMs].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'date':
        comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
        break;
      case 'cost':
        comparison = a.totalCost - b.totalCost;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const openRenameDialog = (bom: NamedBOM) => {
    setRenamingBOM(bom);
    setSaveName(bom.name);
    setSaveDescription(bom.description);
    setShowRenameDialog(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-6xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-semibold">BOM Management</h3>
              <p className="text-sm text-gray-600">Save, load, and manage your BOMs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setShowSaveDialog(true)}
              variant="primary"
              disabled={currentBOMData.length === 0}
            >
              <Save size={16} />
              Save Current BOM
            </Button>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'cost')}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="date">Last Modified</option>
                <option value="name">Name</option>
                <option value="cost">Total Cost</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {namedBOMs.length} saved BOM{namedBOMs.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* BOM List */}
        {namedBOMs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="text-gray-400" size={32} />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Saved BOMs</h4>
            <p className="text-gray-600 mb-4">Create your first named BOM by saving your current work.</p>
            <Button 
              onClick={() => setShowSaveDialog(true)}
              disabled={currentBOMData.length === 0}
            >
              <Save size={16} />
              Save Current BOM
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedBOMs.map((bom) => (
              <Card key={bom.id} className={`p-4 hover:shadow-lg transition-shadow ${
                currentBOMId === bom.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{bom.name}</h4>
                    {bom.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{bom.description}</p>
                    )}
                  </div>
                  {currentBOMId === bom.id && (
                    <Badge variant="info" className="ml-2 flex-shrink-0">
                      Current
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span className="font-medium">{bom.totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span className="font-medium text-green-600">{formatCurrency(bom.totalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modified:</span>
                    <span className="font-medium">{formatDate(bom.lastModified)}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={currentBOMId === bom.id ? "secondary" : "primary"}
                    onClick={() => onLoadBOM(bom.id)}
                    disabled={currentBOMId === bom.id}
                    className="flex-1"
                  >
                    {currentBOMId === bom.id ? (
                      <>
                        <CheckCircle size={14} />
                        Loaded
                      </>
                    ) : (
                      <>
                        <FolderOpen size={14} />
                        Load
                      </>
                    )}
                  </Button>
                  
                  <button
                    onClick={() => openRenameDialog(bom)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Rename BOM"
                  >
                    <Edit2 size={14} />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteBOM(bom)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete BOM"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <Card className="w-full max-w-md mx-4 p-6">
              <h4 className="text-lg font-semibold mb-4">Save BOM</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    BOM Name *
                  </label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Production BOM v1.0"
                    maxLength={50}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional description..."
                    maxLength={200}
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  This BOM contains {currentBOMData.length} items with a total cost of {formatCurrency(
                    currentBOMData.reduce((sum, item) => sum + item.extendedCost, 0)
                  )}.
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveName('');
                    setSaveDescription('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveBOM} disabled={!saveName.trim()}>
                  <Save size={16} />
                  Save BOM
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Rename Dialog */}
        {showRenameDialog && renamingBOM && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <Card className="w-full max-w-md mx-4 p-6">
              <h4 className="text-lg font-semibold mb-4">Rename BOM</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    BOM Name *
                  </label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Production BOM v1.0"
                    maxLength={50}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional description..."
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowRenameDialog(false);
                    setRenamingBOM(null);
                    setSaveName('');
                    setSaveDescription('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleRenameBOM} disabled={!saveName.trim()}>
                  <Edit2 size={16} />
                  Rename
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
};

// NLP Add Component Dialog
const NLPAddDialog = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  existingPartNumbers, 
  inventory, 
  bomData 
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: any[]) => void;
  existingPartNumbers: string[];
  inventory: any[];
  bomData: any[];
}) => {
  const [nlpInput, setNlpInput] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (input: string) => {
    setNlpInput(input);
    
    if (input.trim()) {
      // Get existing categories and suppliers for smarter parsing
      const existingCategories = [...new Set(bomData.map((item: any) => item.category).filter(Boolean))];
      const existingSuppliers = [...new Set(bomData.map((item: any) => item.supplier).filter(Boolean))];
      
      // Parse the natural language input with context
      const parsed: any = NLPService.parseNaturalLanguage(input, existingCategories, existingSuppliers);
      parsed.partNumber = PartNumberService.generatePartNumber(parsed.category, existingPartNumbers);
      parsed.extendedCost = parsed.quantity * parsed.unitCost;
      setParsedData(parsed);

      // Generate suggestions from existing inventory
      const suggestions = NLPService.generateSearchSuggestions(input, inventory);
      setSuggestions(suggestions);
    } else {
      setParsedData(null);
      setSuggestions([]);
    }
  };

  const handleAddParsed = () => {
    if (!parsedData) return;

    const newItem = {
      id: Date.now(),
      partNumber: parsedData.partNumber,
      description: parsedData.description,
      category: parsedData.category,
      quantity: parsedData.quantity,
      unit: 'EA',
      unitCost: parsedData.unitCost,
      extendedCost: parsedData.extendedCost,
      supplier: parsedData.supplier,
      leadTime: 1,
      revision: 'A',
      status: 'Active',
      requiredFor: 'Base System',
      digikeyPN: '',
      manufacturerPN: '',
      nlpParsed: true,
      confidence: parsedData.confidence,
      originalInput: parsedData.originalInput
    };

    onAdd([newItem]);
    setNlpInput('');
    setParsedData(null);
    setSuggestions([]);
    onClose();
  };

  const handleAddSuggestion = (suggestion: any) => {
    const newItem = {
      id: Date.now(),
      partNumber: PartNumberService.generatePartNumber(suggestion.category, existingPartNumbers),
      description: `${suggestion.description} (from inventory)`,
      category: suggestion.category,
      quantity: 1,
      unit: suggestion.unit,
      unitCost: suggestion.unitCost,
      extendedCost: suggestion.unitCost,
      supplier: suggestion.supplier,
      leadTime: suggestion.leadTime,
      revision: 'A',
      status: 'Active',
      requiredFor: 'Base System',
      digikeyPN: suggestion.digikeyPN,
      manufacturerPN: suggestion.manufacturerPN,
      fromInventory: true
    };

    onAdd([newItem]);
    setNlpInput('');
    setParsedData(null);
    setSuggestions([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-5xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Natural Language Component Add</h3>
              <p className="text-sm text-gray-600">Describe your component in natural language</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Natural Language Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe Your Component
          </label>
          <div className="relative">
            <textarea
              value={nlpInput}
              onChange={(e) => handleInputChange(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              placeholder="Examples:&#10;• 10k ohm resistor 1% 1/4W from DigiKey&#10;• STM32F407 microcontroller for automation&#10;• 100nF ceramic capacitor 50V&#10;• Primary processing tank stainless steel 316L&#10;• 5 pieces of M3x10 socket head screws"
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              NLP Parsing {nlpInput ? '🟢' : '⚫'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Parsed Result */}
          {parsedData && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Parsed Result</h4>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    parsedData.confidence > 0.7 ? 'bg-green-500' : 
                    parsedData.confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-gray-600">
                    {Math.round(parsedData.confidence * 100)}% confidence
                  </span>
                </div>
              </div>

              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Part Number:</span>
                      <div className="font-mono text-purple-700">{parsedData.partNumber}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Category:</span>
                      <div><Badge variant="info">{parsedData.category}</Badge></div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Quantity:</span>
                      <div>{parsedData.quantity}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Unit Cost:</span>
                      <div>${parsedData.unitCost.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Description:</span>
                    <div className="text-sm text-gray-900 mt-1">{parsedData.description}</div>
                  </div>

                  {parsedData.supplier && (
                    <div>
                      <span className="font-medium text-gray-700">Supplier:</span>
                      <div className="text-sm text-gray-900">{parsedData.supplier}</div>
                    </div>
                  )}

                  {Object.keys(parsedData.specifications).length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Specifications:</span>
                      <div className="text-sm text-gray-900 mt-1">
                        {Object.entries(parsedData.specifications).map(([key, value]) => (
                          <span key={key} className="inline-block bg-gray-100 px-2 py-1 rounded text-xs mr-2 mb-1">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-purple-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-purple-800">
                        Total: ${parsedData.extendedCost.toFixed(2)}
                      </span>
                      <Button variant="success" onClick={handleAddParsed}>
                        <PlusCircle size={16} />
                        Add to BOM
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Advanced Options */}
              <div className="mt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span>Advanced Options</span>
                </button>
                
                {showAdvanced && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Original Input:</span>
                        <div className="text-gray-600 italic">"{parsedData.originalInput}"</div>
                      </div>
                      <div>
                        <span className="font-medium">Features Used:</span>
                        <div className="text-gray-600">
                          Pattern matching, keyword analysis, specification extraction
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Learning Context:</span>
                        <div className="text-gray-600">
                          Using {[...new Set(bomData.map(item => item.category).filter(Boolean))].length} existing categories and{' '}
                          {[...new Set(bomData.map(item => item.supplier).filter(Boolean))].length} suppliers for better suggestions
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inventory Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Similar Parts from Inventory</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <Card key={index} className="p-3 hover:bg-gray-50 cursor-pointer border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-mono text-xs text-gray-600">{suggestion.partNumber}</span>
                          <Badge variant="default">{suggestion.category}</Badge>
                          <div className="text-xs text-green-600">
                            {Math.round(suggestion.similarity * 100)}% match
                          </div>
                        </div>
                        <div className="text-sm text-gray-900">{suggestion.description}</div>
                        <div className="text-xs text-gray-500 mt-1">{suggestion.reason}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          ${suggestion.unitCost.toFixed(2)} • {suggestion.supplier}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAddSuggestion(suggestion)}
                      >
                        <Target size={14} />
                        Use
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Help and Examples */}
          {!parsedData && !nlpInput && (
            <div className="lg:col-span-2">
              <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
                <h4 className="font-semibold mb-4">🚀 Smart Component Recognition</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium mb-2">What the system can understand:</h5>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• <strong>Component values:</strong> "10k ohm", "100nF", "1uH"</li>
                      <li>• <strong>Specifications:</strong> "1% tolerance", "50V rating"</li>
                      <li>• <strong>Quantities:</strong> "5 pieces", "qty: 10"</li>
                      <li>• <strong>Suppliers:</strong> "from DigiKey", "McMaster"</li>
                      <li>• <strong>Costs:</strong> "$2.50 each", "5 dollars"</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-medium mb-2">Try these examples:</h5>
                    <div className="space-y-2">
                      {[
                        "STM32F407VGT6 microcontroller $12.50",
                        "10 pieces 10k ohm resistors 1% from DigiKey",
                        "Primary stainless steel tank 316L",
                        "100nF ceramic capacitor 50V X7R",
                        "M3x10 socket head cap screws qty 20"
                      ].map((example, index) => (
                        <button
                          key={index}
                          onClick={() => handleInputChange(example)}
                          className="block w-full text-left text-xs bg-white p-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          "{example}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>


              </Card>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
const BulkAddDialog = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  existingPartNumbers 
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: any[]) => void;
  existingPartNumbers: string[];
}) => {
  const [bulkText, setBulkText] = useState('');
  const [previewData, setPreviewData] = useState<BOMItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const parseTextInput = () => {
    const lines = bulkText.split('\n').filter(line => line.trim());
    const parsed = lines.map((line, index) => {
      const parts = line.split(/\t|,/).map(p => p.trim());
      const description = parts[0] || `Bulk Item ${index + 1}`;
      const category = parts[1] || 'Other';
      const quantity = parseInt(parts[2]) || 1;
      const unitCost = parseFloat(parts[3]) || 0;
      const supplier = parts[4] || '';

      return {
        id: Date.now() + index,
        partNumber: PartNumberService.generatePartNumber(category, existingPartNumbers),
        description,
        category,
        quantity,
        unit: 'EA',
        unitCost,
        extendedCost: quantity * unitCost,
        supplier,
        leadTime: 1,
        revision: 'A',
        status: 'Active',
        requiredFor: 'Base System',
        digikeyPN: '',
        manufacturerPN: ''
      };
    });

    setPreviewData(parsed);
    setShowPreview(true);
  };

  const handleAdd = () => {
    onAdd(previewData);
    setBulkText('');
    setPreviewData([]);
    setShowPreview(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-6xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Layers className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Bulk Add Parts</h3>
              <p className="text-sm text-gray-600">Add multiple parts at once</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3">Input Format</h4>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700 mb-2">Enter one part per line in this format:</p>
              <code className="text-xs bg-white p-2 rounded block">
                Description, Category, Quantity, Unit Cost, Supplier
              </code>
              <div className="mt-2 text-xs text-gray-600">
                <p>• Separate fields with commas or tabs</p>
                <p>• Only description is required</p>
                <p>• Part numbers will be auto-generated</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste Part Data
              </label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="STM32F407VGT6 Microcontroller, IC, 1, 12.50, DigiKey&#10;10K Resistor 1%, Resistor, 50, 0.12, DigiKey&#10;100nF Capacitor, Capacitor, 25, 0.18, DigiKey"
              />
            </div>

            <div className="flex space-x-2">
              <Button onClick={parseTextInput} disabled={!bulkText.trim()}>
                <Eye size={16} />
                Preview
              </Button>
              <Button variant="outline" onClick={() => {
                setBulkText('');
                setShowPreview(false);
                setPreviewData([]);
              }}>
                Clear
              </Button>
            </div>
          </div>

          {showPreview && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">Preview ({previewData.length} parts)</h4>
                <div className="text-sm text-gray-600">
                  Total: ${previewData.reduce((sum, item) => sum + item.extendedCost, 0).toFixed(2)}
                </div>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Part #</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs">{item.partNumber}</td>
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">${item.extendedCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  <EyeOff size={16} />
                  Hide Preview
                </Button>
                <Button variant="success" onClick={handleAdd}>
                  <PlusCircle size={16} />
                  Add {previewData.length} Parts
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// Import Dialog Component
const ImportDialog = ({ 
  isOpen, 
  onClose, 
  onImport 
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => void;
}) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Column Mapping, 3: Preview
  const [rawData, setRawData] = useState<any[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{[key: string]: string}>({});
  const [importedData, setImportedData] = useState<BOMItem[]>([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Field mapping options
  const fieldMappings = [
    { key: 'partNumber', label: 'Part Number', required: false },
    { key: 'description', label: 'Description', required: true },
    { key: 'category', label: 'Category', required: false },
    { key: 'quantity', label: 'Quantity', required: false },
    { key: 'unitCost', label: 'Unit Cost', required: false },
    { key: 'supplier', label: 'Supplier', required: false },
    { key: 'digikeyPN', label: 'DigiKey PN', required: false }
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let data = [];
      
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        data = ImportService.parseCSV(text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Show loading feedback for Excel files
        console.log('🔄 Processing Excel file, may auto-convert to CSV if needed...');
        data = await ImportService.parseExcel(file) as any[];
      }

      if (data.length === 0) {
        alert('No data found in file');
        return;
      }

      setRawData(data);
      setFileName(file.name);
      const columns = Object.keys(data[0] || {});
      setAvailableColumns(columns);
      
      // Debug logging to see what columns we detected
      console.log('🔍 Detected columns:', columns);
      console.log('📊 Sample data row:', data[0]);
      console.log('📁 File type:', file.name.split('.').pop());
      console.log('📈 Total rows:', data.length);
      console.log('🔍 Raw data preview:', data.slice(0, 3));
      
      // Check if parsing looks suspicious (single column with a title-like name)
      if (columns.length === 1 && columns[0].toLowerCase().includes('inventory')) {
        console.log('⚠️ Detected potential title row or merged cells in Excel file');
        alert(`⚠️ Excel Import Notice:\n\nYour file appears to have a title row or merged cells. Only found one column: "${columns[0]}"\n\nTip: Try saving your Excel file as CSV first for better results, or make sure your data starts from row 1 with proper column headers.`);
      }
      
      // Try automatic mapping first
      const autoMapping = tryAutoMapping(columns);
      setColumnMapping(autoMapping);
      
      // Check if we have required fields mapped
      const hasRequiredFields = autoMapping.description;
      if (hasRequiredFields) {
        // Auto-mapping successful, skip to preview
        const normalizedData = normalizeDataWithMapping(data, autoMapping);
        setImportedData(normalizedData);
        setSelectedItems(new Set(normalizedData.map((_, index) => index)));
        setStep(3);
      } else {
        // Need manual mapping
        setStep(2);
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('Error reading file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const tryAutoMapping = (columns: string[]) => {
    const mapping: { [key: string]: string } = {};
    const lowerColumns = columns.map((col: string) => ({ original: col, lower: col.toLowerCase() }));
    
    fieldMappings.forEach(field => {
      // Try exact matches first
      const exactMatch = lowerColumns.find(col => 
        col.lower === field.key.toLowerCase() ||
        col.lower === field.label.toLowerCase()
      );
      
      if (exactMatch) {
        mapping[field.key] = exactMatch.original;
        return;
      }
      
      // Try partial matches
      const patterns: {[key: string]: string[]} = {
        partNumber: ['part', 'number', 'pn', 'item'],
        description: ['description', 'desc', 'name', 'component'],
        category: ['category', 'type', 'class'],
        quantity: ['quantity', 'qty', 'stock', 'count'],
        unitCost: ['cost', 'price', 'unit'],
        supplier: ['supplier', 'vendor', 'mfg'],
        digikeyPN: ['digikey', 'digi-key', 'dk']
      };
      
      const fieldPatterns = patterns[field.key] || [];
      const match = lowerColumns.find(col => 
        fieldPatterns.some((pattern: string) => col.lower.includes(pattern))
      );
      
      if (match) {
        mapping[field.key] = match.original;
      }
    });
    
    return mapping;
  };

  const normalizeDataWithMapping = (data: any[], mapping: { [key: string]: string }): BOMItem[] => {
    return data.map((row: any, index: number) => ({
      id: Date.now() + index,
      partNumber: row[mapping.partNumber] || `IMP-${Date.now()}-${index}`,
      description: row[mapping.description] || 'Unknown Component',
      category: row[mapping.category] || 'Miscellaneous',
      quantity: parseInt(row[mapping.quantity]) || 1,
      unit: 'EA',
      unitCost: parseFloat(row[mapping.unitCost]) || 0,
      extendedCost: (parseInt(row[mapping.quantity]) || 1) * (parseFloat(row[mapping.unitCost]) || 0),
      supplier: row[mapping.supplier] || 'Unknown',
      leadTime: 1,
      revision: 'A',
      status: 'Active',
      requiredFor: 'Base System',
      digikeyPN: row[mapping.digikeyPN] || '',
      manufacturerPN: row[mapping.partNumber] || `IMP-${Date.now()}-${index}`
    } as BOMItem));
  };

  const handleColumnMappingChange = (fieldKey: string, columnName: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: columnName
    }));
  };

  const proceedToPreview = () => {
    // Validate required fields
    const requiredFields = fieldMappings.filter(f => f.required);
    const missingRequired = requiredFields.filter(f => !columnMapping[f.key]);
    
    if (missingRequired.length > 0) {
      alert(`Please map required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    const normalizedData = normalizeDataWithMapping(rawData, columnMapping);
    setImportedData(normalizedData);
    setSelectedItems(new Set(normalizedData.map((_, index) => index)));
    setStep(3);
  };

  const toggleItemSelection = (index: number) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedItems(newSelection);
  };

  const handleImport = () => {
    const selectedData = importedData.filter((_, index) => selectedItems.has(index));
    onImport(selectedData);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setRawData([]);
    setAvailableColumns([]);
    setColumnMapping({});
    setImportedData([]);
    setSelectedItems(new Set());
    setFileName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-6xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Database className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Import Parts from File</h3>
              <p className="text-sm text-gray-600">
                {step === 1 && 'Upload Excel or CSV file'}
                {step === 2 && 'Map columns to fields'}
                {step === 3 && 'Select parts to import'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center mb-6">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Upload</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Map</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Preview</span>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="text-center py-12">
            <div className="mb-6">
              <Upload className="mx-auto text-gray-400" size={48} />
            </div>
            <h4 className="text-lg font-semibold mb-2">Upload Inventory File</h4>
            <p className="text-gray-600 mb-6">
              Support for CSV and Excel files. We'll help you map the columns correctly.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
              Choose File
            </Button>
            
            <div className="mt-8 text-left bg-gray-50 p-4 rounded-lg">
              <h5 className="font-semibold mb-2">Supported Fields:</h5>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <strong>Required:</strong>
                  <ul className="list-disc list-inside ml-2">
                    <li>Description (component name/title)</li>
                  </ul>
                </div>
                <div>
                  <strong>Optional:</strong>
                  <ul className="list-disc list-inside ml-2">
                    <li>Part Number</li>
                    <li>Category/Type</li>
                    <li>Unit Cost/Price</li>
                    <li>Quantity/Stock</li>
                    <li>Supplier/Vendor</li>
                    <li>DigiKey PN</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-2">Map Your Columns</h4>
              <p className="text-gray-600 mb-4">
                File: <strong>{fileName}</strong> ({rawData.length} rows)
              </p>
              <p className="text-sm text-gray-600">
                Match your file's column names to our standard fields. Required fields must be mapped.
              </p>
            </div>

            <div className="space-y-4">
              {fieldMappings.map(field => (
                <div key={field.key} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-1/3">
                    <label className="font-medium text-sm">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                  </div>
                  <div className="w-2/3">
                    <select
                      value={columnMapping[field.key] || ''}
                      onChange={(e) => handleColumnMappingChange(field.key, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">-- Not mapped --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {rawData.length > 0 && (
              <div className="mt-6">
                <h5 className="font-semibold mb-2">Preview (first 3 rows):</h5>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        {availableColumns.map(col => (
                          <th key={col} className="px-3 py-2 text-left font-medium">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.slice(0, 3).map((row, index) => (
                        <tr key={index} className="border-t">
                          {availableColumns.map(col => (
                            <td key={col} className="px-3 py-2 text-gray-700">{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={proceedToPreview}>
                Continue to Preview
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-semibold">
                  Select Parts to Import ({selectedItems.size} of {importedData.length} selected)
                </h4>
                <p className="text-sm text-gray-600">
                  Total Cost: ${importedData
                    .filter((_, index) => selectedItems.has(index))
                    .reduce((sum, item) => sum + item.extendedCost, 0)
                    .toFixed(2)}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItems(new Set(importedData.map((_, index) => index)))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItems(new Set())}
                >
                  Select None
                </Button>
              </div>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-center w-12">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === importedData.length}
                        onChange={() => {
                          if (selectedItems.size === importedData.length) {
                            setSelectedItems(new Set());
                          } else {
                            setSelectedItems(new Set(importedData.map((_, index) => index)));
                          }
                        }}
                      />
                    </th>
                    <th className="px-3 py-2 text-left">Part Number</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                    <th className="px-3 py-2 text-left">Supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {importedData.map((item, index) => (
                    <tr
                      key={index}
                      className={`hover:bg-gray-50 ${selectedItems.has(index) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(index)}
                          onChange={() => toggleItemSelection(index)}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{item.partNumber}</td>
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2">
                        <Badge variant="default">{item.category}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">${item.unitCost.toFixed(2)}</td>
                      <td className="px-3 py-2">{item.supplier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back to Mapping
              </Button>
              <Button
                variant="success"
                onClick={handleImport}
                disabled={selectedItems.size === 0}
              >
                <PlusCircle size={16} />
                Import {selectedItems.size} Parts
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

// Header Component
const Header = ({ 
  lastSaved, 
  onSave, 
  onExport, 
  onImport, 
  onBulkAdd, 
  onImportFile, 
  onNLPAdd,
  onBOMManagement,
  currentBOMName 
}: {
  lastSaved: Date | null;
  onSave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onBulkAdd: () => void;
  onImportFile: () => void;
  onNLPAdd: () => void;
  onBOMManagement: () => void;
  currentBOMName: string | null;
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
      event.target.value = ''; // Reset file input
    }
    setShowDropdown(false);
  };

  return (
    <div className="bg-white border-b-2 border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BOM Generator</h1>
                <p className="text-sm text-gray-600">Cannasol Technologies</p>
              </div>
            </div>
            
            {/* Current BOM Name */}
            {currentBOMName && (
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                <FolderOpen size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">{currentBOMName}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Quick Save */}
            <Button onClick={onSave} variant="outline" size="sm">
              <Save size={16} />
              <span className="hidden sm:inline">Save</span>
            </Button>

            {/* BOM Management */}
            <Button onClick={onBOMManagement} variant="outline" size="sm">
              <FolderOpen size={16} />
              <span className="hidden sm:inline">BOMs</span>
            </Button>

            {/* Add Menu */}
            <div className="relative">
              <Button 
                onClick={() => setShowDropdown(!showDropdown)}
                variant="primary"
                size="sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add</span>
                <ChevronDown size={14} />
              </Button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => { onNLPAdd(); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Zap size={16} />
                      <span>Smart Add (NLP)</span>
                    </button>
                    <button
                      onClick={() => { onBulkAdd(); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Layers size={16} />
                      <span>Bulk Add</span>
                    </button>
                    <button
                      onClick={() => { onImportFile(); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Database size={16} />
                      <span>Import CSV/Excel</span>
                    </button>
                    <button
                      onClick={handleImportClick}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Upload size={16} />
                      <span>Import JSON</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Export Button */}
            <Button onClick={onExport} variant="outline" size="sm">
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </Button>

            {/* Hidden file input for JSON import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Last Saved Indicator */}
        {lastSaved && (
          <div className="mt-2 text-xs text-gray-500">
            Last saved: {lastSaved.toLocaleDateString()} at {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

// Search and Filter Component
const SearchAndFilter = ({ 
  onSearch, 
  onFilter, 
  totalItems, 
  filteredItems, 
  bomData 
}: {
  onSearch: (term: string) => void;
  onFilter: (filters: {category: string; supplier: string}) => void;
  totalItems: number;
  filteredItems: number;
  bomData: any[];
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Extract unique categories and suppliers from actual BOM data
  const uniqueCategories = [...new Set(bomData.map((item: any) => item.category).filter(Boolean))].sort();
  const uniqueSuppliers = [...new Set(bomData.map((item: any) => item.supplier).filter(Boolean))].sort();

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onSearch(term);
  };

  const handleCategoryFilter = (category: string) => {
    setCategoryFilter(category);
    onFilter({ category, supplier: supplierFilter });
  };

  const handleSupplierFilter = (supplier: string) => {
    setSupplierFilter(supplier);
    onFilter({ category: categoryFilter, supplier });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setSupplierFilter('');
    onSearch('');
    onFilter({ category: '', supplier: '' });
  };

  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search parts, descriptions, or part numbers..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select
            value={supplierFilter}
            onChange={(e) => handleSupplierFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Suppliers</option>
            {uniqueSuppliers.map(supplier => (
              <option key={supplier} value={supplier}>{supplier}</option>
            ))}
          </select>
          
          {(searchTerm || categoryFilter || supplierFilter) && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <RotateCcw size={14} />
              Clear
            </Button>
          )}
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredItems} of {totalItems} parts
        </div>
      </div>
      
      {/* Dynamic stats */}
      {bomData.length > 0 ? (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-6 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span><strong>{uniqueCategories.length}</strong> categories in use</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span><strong>{uniqueSuppliers.length}</strong> suppliers in use</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              <span>Most common: <strong>{getMostCommonCategory(bomData)}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 italic text-center">
            Start adding components to see dynamic filters and statistics
          </div>
        </div>
      )}
    </Card>
  );
};

// Helper function to get most common category
const getMostCommonCategory = (bomData: any[]) => {
  const categoryCount: { [key: string]: number } = {};
  bomData.forEach((item: any) => {
    if (item.category) {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    }
  });
  
  const mostCommon = Object.entries(categoryCount)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0];
  
  return mostCommon ? `${mostCommon[0]} (${mostCommon[1]})` : 'None';
};

// Digikey Service (keeping original)
const DigikeyService = {
  generateDigikeyCSV: (bomItems: any[]) => {
    const digikeyItems = bomItems.filter((item: any) => item.digikeyPN);
    
    if (digikeyItems.length === 0) {
      alert('No DigiKey parts found in BOM!');
      return null;
    }

    const csvHeader = 'Part Number,Quantity,Customer Reference\n';
    const csvRows = digikeyItems.map((item: any) => 
      `${item.digikeyPN},${item.quantity},"${item.partNumber} - ${item.description}"`
    ).join('\n');
    
    return csvHeader + csvRows;
  },

  downloadDigikeyCSV: (bomItems: any[], filename = 'cannasol_digikey_order.csv') => {
    const csvContent = DigikeyService.generateDigikeyCSV(bomItems);
    if (!csvContent) return;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  openDigikeyBulkOrder: (bomItems: BOMItem[]) => {
    const digikeyItems = bomItems.filter((item: BOMItem) => item.digikeyPN);
    
    if (digikeyItems.length === 0) {
      alert('No DigiKey parts found in BOM!');
      return;
    }

    const myListsURL = 'https://www.digikey.com/en/mylists';
    window.open(myListsURL, '_blank');
    
    const csvContent = DigikeyService.generateDigikeyCSV(bomItems);
    if (csvContent && navigator.clipboard) {
      navigator.clipboard.writeText(csvContent).then(() => {
        setTimeout(() => {
          alert('📋 CSV data copied to clipboard!\n\n1. DigiKey myLists page opened\n2. Look for "Create New List" or "Import List"\n3. Paste CSV data or upload the file\n4. Add all items to cart');
        }, 500);
      }).catch(() => {
        alert('DigiKey myLists page opened.\n\nCreate a new list and import your CSV file or paste part numbers manually.');
      });
    }
  },

  getDigikeySummary: (bomItems: BOMItem[]) => {
    const digikeyItems = bomItems.filter((item: BOMItem) => item.digikeyPN);
    return {
      totalItems: digikeyItems.length,
      totalQuantity: digikeyItems.reduce((sum: number, item: BOMItem) => sum + item.quantity, 0),
      totalCost: digikeyItems.reduce((sum: number, item: BOMItem) => sum + item.extendedCost, 0),
      nonDigikeyItems: bomItems.filter((item: BOMItem) => !item.digikeyPN).length,
      digikeyItems
    };
  }
};

// DigiKey Shopping Component (keeping original with minor updates)
const DigikeyShoppingList = ({ bomData }: { bomData: BOMItem[] }) => {
  const [showDigikeyDialog, setShowDigikeyDialog] = useState(false);
  const summary = DigikeyService.getDigikeySummary(bomData);

  return (
    <>
      <Button 
        variant="danger" 
        onClick={() => setShowDigikeyDialog(true)}
        className="bg-red-600 hover:bg-red-700 border-red-600"
      >
        <Zap size={16} />
        DigiKey ({summary.totalItems})
      </Button>

      {showDigikeyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Zap className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">DigiKey Shopping List</h3>
                  <p className="text-sm text-gray-600">Electronics components ready for order</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDigikeyDialog(false)}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4 bg-red-50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{summary.totalItems}</p>
                  <p className="text-sm text-gray-600">DigiKey Parts</p>
                </div>
              </Card>
              <Card className="p-4 bg-blue-50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{summary.totalQuantity}</p>
                  <p className="text-sm text-gray-600">Total Qty</p>
                </div>
              </Card>
              <Card className="p-4 bg-green-50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">${summary.totalCost.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Total Cost</p>
                </div>
              </Card>
              <Card className="p-4 bg-gray-50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">{summary.nonDigikeyItems}</p>
                  <p className="text-sm text-gray-600">Custom Parts</p>
                </div>
              </Card>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <Button variant="primary" onClick={() => DigikeyService.downloadDigikeyCSV(bomData)}>
                <FileSpreadsheet size={16} />
                Download CSV
              </Button>
              <Button 
                variant="danger" 
                onClick={() => DigikeyService.openDigikeyBulkOrder(bomData)}
                className="bg-red-600 hover:bg-red-700 border-red-600"
              >
                <ShoppingCart size={16} />
                myLists
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('https://www.digikey.com', '_blank')}
              >
                <ExternalLink size={16} />
                DigiKey Home
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-2 border-b">
                <h4 className="font-semibold text-red-800">Ready to Order</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">DigiKey P/N</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Description</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Qty</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Total</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summary.digikeyItems.map((item: BOMItem, index: number) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm font-mono text-red-600 font-medium">
                          {item.digikeyPN}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                          ${item.extendedCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <a 
                            href={`https://www.digikey.com/en/products/result?keywords=${encodeURIComponent(item.digikeyPN)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="View on DigiKey"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h5 className="font-semibold text-blue-800 mb-2">🛒 How to Order from DigiKey</h5>
              <div className="text-sm text-blue-700 space-y-3">
                <div>
                  <strong>Method 1 - myLists (Recommended):</strong>
                  <ol className="list-decimal list-inside ml-4 mt-1">
                    <li>Click "myLists" → Opens DigiKey's list management page</li>
                    <li>CSV data is automatically copied to clipboard</li>
                    <li>Click "Create New List" or "Import List"</li>
                    <li>Paste CSV data or upload the downloaded CSV file</li>
                    <li>Click "Add All to Cart" to proceed to checkout</li>
                  </ol>
                </div>
                <div>
                  <strong>Method 2 - CSV Upload:</strong>
                  <ol className="list-decimal list-inside ml-4 mt-1">
                    <li>Click "Download CSV" to save the file</li>
                    <li>Go to DigiKey.com → Search → "BOM Manager" or "Quick Order"</li>
                    <li>Look for "Upload BOM" or "Bulk Add" option</li>
                    <li>Upload your CSV file and add to cart</li>
                  </ol>
                </div>
                <div className="bg-blue-100 p-3 rounded mt-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">💡 Pro Tips:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• **myLists method is most reliable** - Found by user testing!</li>
                    <li>• Create a DigiKey account for better pricing and order tracking</li>
                    <li>• Check for quantity breaks on high-volume parts</li>
                    <li>• Save your lists in myLists for future reordering</li>
                    <li>• Call DigiKey support (1-800-344-4539) if you need help with bulk orders</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

// Main BOM Manager
const BOMManager = () => {
  const [bomData, setBomData] = useState<BOMItem[]>([]);
  const [filteredData, setFilteredData] = useState<BOMItem[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editingCell, setEditingCell] = useState<{itemId: number; field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  
  // BOM Management states
  const [currentBOMId, setCurrentBOMId] = useState<string | null>(null);
  const [currentBOMName, setCurrentBOMName] = useState<string | null>(null);
  
  // Dialog states
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showNLPAdd, setShowNLPAdd] = useState(false);
  const [showBOMManagement, setShowBOMManagement] = useState(false);

  // Load data on component mount
  useEffect(() => {
    const currentBOMId = BOMStorage.getCurrentBOMId();
    if (currentBOMId) {
      const namedBOM = BOMStorage.getNamedBOM(currentBOMId);
      if (namedBOM) {
        setBomData(namedBOM.bomData);
        setFilteredData(namedBOM.bomData);
        setCurrentBOMId(namedBOM.id);
        setCurrentBOMName(namedBOM.name);
      } else {
        // BOM not found, load legacy data
        const loadedData = BOMStorage.load();
        setBomData(loadedData);
        setFilteredData(loadedData);
        BOMStorage.clearCurrentBOM();
      }
    } else {
      // No current BOM, load legacy data
      const loadedData = BOMStorage.load();
      setBomData(loadedData);
      setFilteredData(loadedData);
    }
    
    const loadedInventory = BOMStorage.loadInventory();
    setInventory(loadedInventory);
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (bomData.length > 0 && currentBOMId) {
      const autoSaveInterval = setInterval(() => {
        BOMStorage.updateNamedBOM(currentBOMId, bomData);
        setLastSaved(new Date());
      }, 30000);
      return () => clearInterval(autoSaveInterval);
    }
  }, [bomData, currentBOMId]);

  const handleSave = () => {
    console.log('🔄 Saving BOM...', { currentBOMId, bomDataLength: bomData.length });
    
    if (currentBOMId) {
      // Update existing named BOM
      const success = BOMStorage.updateNamedBOM(currentBOMId, bomData);
      console.log('📝 Named BOM update result:', success);
      if (success) {
        setLastSaved(new Date());
        console.log('✅ Named BOM saved successfully');
      }
    } else {
      // Legacy save to localStorage
      const success = BOMStorage.save(bomData);
      console.log('💾 Legacy save result:', success);
      if (success) {
        setLastSaved(new Date());
        console.log('✅ Legacy BOM saved successfully');
      }
    }
  };

  const handleLoadBOM = (bomId: string) => {
    console.log('📂 Loading BOM:', bomId);
    const namedBOM = BOMStorage.getNamedBOM(bomId);
    console.log('📊 Loaded BOM data:', namedBOM);
    
    if (namedBOM) {
      setBomData(namedBOM.bomData);
      setFilteredData(namedBOM.bomData);
      setCurrentBOMId(namedBOM.id);
      setCurrentBOMName(namedBOM.name);
      BOMStorage.setCurrentBOM(bomId);
      setShowBOMManagement(false);
      
      console.log('✅ BOM loaded successfully:', namedBOM.name, 'with', namedBOM.bomData.length, 'items');
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = `Loaded BOM: ${namedBOM.name}`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } else {
      console.error('❌ Failed to load BOM:', bomId);
    }
  };

  const handleSaveBOM = (name: string, description: string) => {
    console.log('💾 Saving new named BOM:', name, 'with', bomData.length, 'items');
    
    try {
      const bomId = BOMStorage.saveNamedBOM(name, description, bomData);
      console.log('✅ Named BOM saved with ID:', bomId);
      
      setCurrentBOMId(bomId);
      setCurrentBOMName(name);
      BOMStorage.setCurrentBOM(bomId);
      setLastSaved(new Date());
    } catch (error) {
      console.error('❌ Failed to save named BOM:', error);
    }
  };

  const handleNewBOM = () => {
    if (bomData.length > 0) {
      if (!confirm('Create a new BOM? Unsaved changes will be lost.')) {
        return;
      }
    }
    
    setBomData([]);
    setFilteredData([]);
    setCurrentBOMId(null);
    setCurrentBOMName(null);
    BOMStorage.clearCurrentBOM();
    setSelectedItems(new Set());
  };

  const handleSearch = (searchTerm: string) => {
    let filtered = bomData;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.partNumber.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.supplier.toLowerCase().includes(term) ||
        (item.digikeyPN && item.digikeyPN.toLowerCase().includes(term))
      );
    }
    
    setFilteredData(filtered);
  };

  const handleFilter = ({ category, supplier }: { category: string; supplier: string }) => {
    let filtered = bomData;
    
    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }
    if (supplier) {
      filtered = filtered.filter(item => item.supplier === supplier);
    }
    
    setFilteredData(filtered);
  };

  const handleBulkAdd = (newItems: BOMItem[]) => {
    const updatedData = [...bomData, ...newItems];
    setBomData(updatedData);
    setFilteredData(updatedData);
    if (currentBOMId) {
      BOMStorage.updateNamedBOM(currentBOMId, updatedData);
    } else {
      BOMStorage.save(updatedData);
    }
    setLastSaved(new Date());
  };

  const handleImportItems = (importedItems: BOMItem[]) => {
    const updatedData = [...bomData, ...importedItems];
    setBomData(updatedData);
    setFilteredData(updatedData);
    if (currentBOMId) {
      BOMStorage.updateNamedBOM(currentBOMId, updatedData);
    } else {
      BOMStorage.save(updatedData);
    }
    setLastSaved(new Date());
  };

  const handleAddItem = () => {
    const existingPartNumbers = bomData.map(item => item.partNumber);
    const newId = Math.max(...bomData.map(item => item.id), 0) + 1;
    const newItem = {
      id: newId,
      partNumber: PartNumberService.generatePartNumber('Other', existingPartNumbers),
      description: 'New Component',
      category: 'Other',
      quantity: 1,
      unit: 'EA',
      unitCost: 0.00,
      extendedCost: 0.00,
      supplier: '',
      leadTime: 1,
      revision: 'A',
      status: 'Active',
      requiredFor: 'Base System',
      digikeyPN: '',
      manufacturerPN: ''
    };
    
    const updatedData = [...bomData, newItem];
    setBomData(updatedData);
    setFilteredData(updatedData);
    
    // Save the data
    if (currentBOMId) {
      BOMStorage.updateNamedBOM(currentBOMId, updatedData);
    } else {
      BOMStorage.save(updatedData);
    }
    setLastSaved(new Date());
    
    // Auto-edit the new item's description
    setTimeout(() => {
      setEditingCell({ itemId: newId, field: 'description' });
      setEditValue('New Component');
    }, 100);
  };

  const handleDeleteSelected = () => {
    if (selectedItems.size === 0) return;
    
    if (window.confirm(`Delete ${selectedItems.size} selected items?`)) {
      const updatedData = bomData.filter(item => !selectedItems.has(item.id));
      setBomData(updatedData);
      setFilteredData(updatedData);
      setSelectedItems(new Set());
      handleSave();
    }
  };

  const handleCloneSelected = () => {
    if (selectedItems.size === 0) return;
    
    const itemsToClone = bomData.filter(item => selectedItems.has(item.id));
    const existingPartNumbers = bomData.map(item => item.partNumber);
    const clonedItems = itemsToClone.map((item, index) => ({
      ...item,
      id: Math.max(...bomData.map(item => item.id), 0) + index + 1,
      partNumber: PartNumberService.generatePartNumber(item.category, existingPartNumbers),
      description: `${item.description} (Copy)`
    }));
    
    const updatedData = [...bomData, ...clonedItems];
    setBomData(updatedData);
    setFilteredData(updatedData);
    setSelectedItems(new Set());
    handleSave();
  };

  const toggleItemSelection = (itemId: number) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAllVisible = () => {
    setSelectedItems(new Set(filteredData.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Cell editing functions (keeping existing functionality)
  const handleCellClick = (itemId: number, field: string, currentValue: any) => {
    setEditingCell({ itemId, field });
    setEditValue(currentValue || '');
  };

  const handleCellSave = () => {
    if (!editingCell) return;

    const { itemId, field } = editingCell;
    const updatedData = bomData.map(item => {
      if (item.id === itemId) {
        let newValue: any = editValue;
        
        if (field === 'quantity') {
          newValue = parseInt(editValue) || 0;
        } else if (field === 'unitCost') {
          newValue = parseFloat(editValue) || 0;
        }
        
        const updatedItem = { ...item, [field]: newValue };
        
        if (field === 'quantity' || field === 'unitCost') {
          updatedItem.extendedCost = updatedItem.quantity * updatedItem.unitCost;
        }
        
        return updatedItem;
      }
      return item;
    });

    setBomData(updatedData);
    setFilteredData(updatedData.filter(item => 
      filteredData.some(filteredItem => filteredItem.id === item.id)
    ));
    setEditingCell(null);
    setEditValue('');
    handleSave();
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const renderEditableCell = (item: BOMItem, field: string, value: any, className = "") => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field;
    
    if (isEditing) {
      // For category field, show a datalist with existing categories
      if (field === 'category') {
        const existingCategories = [...new Set(bomData.map(item => item.category).filter(Boolean))];
        return (
          <div className="relative">
            <input
              type="text"
              list="categories"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={handleKeyPress}
              className={`w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
              autoFocus
            />
            <datalist id="categories">
              {existingCategories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
        );
      }
      
      // For supplier field, show a datalist with existing suppliers
      if (field === 'supplier') {
        const existingSuppliers = [...new Set(bomData.map(item => item.supplier).filter(Boolean))];
        return (
          <div className="relative">
            <input
              type="text"
              list="suppliers"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={handleKeyPress}
              className={`w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
              autoFocus
            />
            <datalist id="suppliers">
              {existingSuppliers.map(sup => (
                <option key={sup} value={sup} />
              ))}
            </datalist>
          </div>
        );
      }
      
      // Regular input for other fields
      return (
        <input
          type={field === 'quantity' || field === 'unitCost' ? 'number' : 'text'}
          step={field === 'unitCost' ? '0.01' : undefined}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCellSave}
          onKeyDown={handleKeyPress}
          className={`w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
          autoFocus
        />
      );
    }

    return (
      <div
        onClick={() => handleCellClick(item.id, field, value)}
        className={`cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors ${className} ${
          value === '' || value === null || value === undefined ? 'text-gray-400 italic' : ''
        }`}
        title="Click to edit"
      >
        {field === 'unitCost' || field === 'extendedCost' 
          ? `${(value || 0).toFixed(2)}` 
          : value || 'Click to add'}
      </div>
    );
  };

  const totalCost = bomData.reduce((sum, item) => sum + item.extendedCost, 0);
  const selectedCost = bomData
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + item.extendedCost, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        lastSaved={lastSaved}
        onSave={handleSave}
        onExport={() => BOMStorage.exportJSON(bomData)}
        onImport={(file) => BOMStorage.importJSON(file, (data) => {
          setBomData(data);
          setFilteredData(data);
          handleSave();
          alert('BOM data imported successfully!');
        })}
        onBulkAdd={() => setShowBulkAdd(true)}
        onImportFile={() => setShowImportDialog(true)}
        onNLPAdd={() => setShowNLPAdd(true)}
        onBOMManagement={() => setShowBOMManagement(true)}
        currentBOMName={currentBOMName}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold text-gray-900">Bill of Materials</h2>
            {currentBOMName && (
              <Badge variant="info" className="text-sm">
                {currentBOMName}
              </Badge>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleNewBOM}>
              <Plus size={16} />
              New BOM
            </Button>
            <DigikeyShoppingList bomData={bomData} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-6 bg-gray-50">
            <div className="flex items-center space-x-3">
              <Package className="text-gray-600" size={24} />
              <div>
                <p className="text-2xl font-semibold text-gray-900">{bomData.length}</p>
                <p className="text-sm text-gray-600">Total Parts</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-gray-50">
            <div className="flex items-center space-x-3">
              <DollarSign className="text-gray-600" size={24} />
              <div>
                <p className="text-2xl font-semibold text-gray-900">${totalCost.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Total Cost</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-gray-50">
            <div className="flex items-center space-x-3">
              <Zap className="text-gray-600" size={24} />
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {bomData.filter(item => item.digikeyPN).length}
                </p>
                <p className="text-sm text-gray-600">DigiKey Parts</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-gray-50">
            <div className="flex items-center space-x-3">
              <Building className="text-gray-600" size={24} />
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {new Set(bomData.map(item => item.supplier)).size}
                </p>
                <p className="text-sm text-gray-600">Suppliers</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-blue-50">
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-blue-600" size={24} />
              <div>
                <p className="text-2xl font-semibold text-blue-900">{selectedItems.size}</p>
                <p className="text-sm text-blue-600">Selected</p>
                {selectedItems.size > 0 && (
                  <p className="text-xs text-blue-600">${selectedCost.toFixed(2)}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filter */}
        <SearchAndFilter 
          onSearch={handleSearch}
          onFilter={handleFilter}
          totalItems={bomData.length}
          filteredItems={filteredData.length}
          bomData={bomData}
        />

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-blue-800">
                  {selectedItems.size} items selected
                </span>
                <span className="text-sm text-blue-600">
                  Total: ${selectedCost.toFixed(2)}
                </span>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleCloneSelected}>
                  <Copy size={14} />
                  Clone
                </Button>
                <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                  <Trash2 size={14} />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* BOM Table */}
        <Card className="relative">
          <div className="overflow-x-auto">
            {/* Table toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Package size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {filteredData.length} items
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAddItem}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Item</span>
                </button>
              </div>
            </div>
            <div className="mb-2 p-3 bg-blue-50 border-l-4 border-blue-400">
              <p className="text-sm text-blue-700">
                💡 <strong>Features:</strong> Click cells to edit • Get auto-suggestions for categories/suppliers • Select items for bulk operations • Use search/filter
              </p>
            </div>
            <table className="w-full">
                                <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-center w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredData.length && filteredData.length > 0}
                      onChange={() => {
                        if (selectedItems.size === filteredData.length) {
                          clearSelection();
                        } else {
                          selectAllVisible();
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Part Number</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Description</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Category</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Qty</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Unit Cost</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Total</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Supplier</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                      selectedItems.has(item.id) ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                    } hover:bg-gray-100 transition-colors`}
                  >
                    <td className="px-3 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="px-3 py-1 text-xs font-mono font-medium text-gray-900 leading-tight">
                      {renderEditableCell(item, 'partNumber', item.partNumber)}
                    </td>
                    <td className="px-3 py-1 text-xs text-gray-900 leading-tight">
                      <div>
                        {renderEditableCell(item, 'description', item.description)}
                        <div className="mt-0.5 flex items-center space-x-1">
                          <span className="text-xs text-gray-400">DK:</span>
                          {renderEditableCell(item, 'digikeyPN', item.digikeyPN || '', 'text-xs text-gray-600')}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1 text-xs">
                      <Badge className="cursor-pointer hover:bg-gray-100 text-xs py-0 px-1.5">
                        {renderEditableCell(item, 'category', item.category)}
                      </Badge>
                    </td>
                    <td className="px-3 py-1 text-xs text-right text-gray-900 leading-tight">
                      {renderEditableCell(item, 'quantity', item.quantity, 'text-right')}
                    </td>
                    <td className="px-3 py-1 text-xs text-right text-gray-900 leading-tight">
                      {renderEditableCell(item, 'unitCost', item.unitCost, 'text-right')}
                    </td>
                    <td className="px-3 py-1 text-xs text-right font-semibold text-gray-900 leading-tight">
                      <div className="px-1">
                        ${item.extendedCost.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-3 py-1 text-xs text-gray-900 leading-tight">
                      {renderEditableCell(item, 'supplier', item.supplier)}
                    </td>
                    <td className="px-3 py-1 text-xs">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            if (window.confirm('Delete this item?')) {
                              const updatedData = bomData.filter(i => i.id !== item.id);
                              setBomData(updatedData);
                              setFilteredData(updatedData.filter(i => 
                                filteredData.some(f => f.id === i.id)
                              ));
                              setSelectedItems(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(item.id);
                                return newSet;
                              });
                              handleSave();
                            }
                          }}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Delete item"
                        >
                          <X size={16} />
                        </button>
                        <a 
                          href={item.digikeyPN && item.digikeyPN.trim() ? `https://www.digikey.com/en/products/result?keywords=${encodeURIComponent(item.digikeyPN.trim())}` : '#'}
                          target={item.digikeyPN && item.digikeyPN.trim() ? '_blank' : '_self'}
                          rel="noopener noreferrer"
                          className={`p-1 transition-colors ${
                            item.digikeyPN && item.digikeyPN.trim()
                              ? 'text-blue-500 hover:text-blue-700' 
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title={item.digikeyPN && item.digikeyPN.trim() ? 'View on DigiKey' : 'No DigiKey part number'}
                          onClick={(!item.digikeyPN || !item.digikeyPN.trim()) ? (e) => e.preventDefault() : undefined}
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {/* Empty state */}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-12 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <Package size={48} className="text-gray-300" />
                        <div className="text-gray-500">
                          <p className="text-lg font-medium">No items found</p>
                          <p className="text-sm">Add your first component to get started</p>
                        </div>
                        <button
                          onClick={handleAddItem}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                        >
                          <Plus size={16} />
                          <span>Add First Item</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                
                <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                  <td></td>
                  <td colSpan={5} className="px-3 py-1.5 text-xs text-gray-900">TOTAL</td>
                  <td className="px-3 py-1.5 text-sm text-right font-bold text-gray-900">
                    ${totalCost.toFixed(2)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h4 className="font-semibold text-gray-900 mb-2">📋 System Information</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• <strong>Click to Edit:</strong> Click any cell to edit values directly</p>
            <p>• <strong>Dynamic Dropdowns:</strong> Categories and suppliers auto-update from your data</p>
            <p>• <strong>Smart Suggestions:</strong> System learns your naming patterns and preferences</p>
            <p>• <strong>Storage:</strong> Data saved locally in browser (no server required)</p>
            <p className="text-xs text-blue-600 ml-4">📌 SharePoint Integration coming soon!</p>
            <p>• <strong>Export/Import:</strong> JSON format for data sharing and backup</p>
            <p>• <strong>DigiKey Integration:</strong> CSV export and direct product links</p>
          </div>
        </div>
      </div>
      
      {/* Dialogs */}
      <BOMManagementDialog
        isOpen={showBOMManagement}
        onClose={() => setShowBOMManagement(false)}
        onLoadBOM={handleLoadBOM}
        onSaveBOM={handleSaveBOM}
        currentBOMId={currentBOMId}
        currentBOMData={bomData}
      />
      
      <NLPAddDialog
        isOpen={showNLPAdd}
        onClose={() => setShowNLPAdd(false)}
        onAdd={handleBulkAdd}
        existingPartNumbers={bomData.map(item => item.partNumber)}
        inventory={[...bomData, ...inventory]}
        bomData={bomData}
      />
      
      <BulkAddDialog 
        isOpen={showBulkAdd}
        onClose={() => setShowBulkAdd(false)}
        onAdd={handleBulkAdd}
        existingPartNumbers={bomData.map(item => item.partNumber)}
      />
      
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportItems}
      />
      
      <button 
        className="fixed bottom-6 right-6 w-12 h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        onClick={() => window.open('https://cannasoltechnologies.com', '_blank')}
        title="Cannasol Technologies Website"
      >
        <Building size={20} />
      </button>
    </div>
  );
};

export default BOMManager;