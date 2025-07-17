// DigiKey Service for BOM ordering integration
interface DigiKeyPricing {
  partNumber: string;
  description: string;
  unitPrice: number;
  availability: string;
  minimumQuantity: number;
  digikeyPN: string;
  manufacturerPN: string;
  source: string;
}

export interface BOMItem {
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
}

const DigikeyService = {
  // Search for DigiKey parts and get pricing information
  searchDigikeyPart: async (partNumber: string, description: string = ''): Promise<DigiKeyPricing | null> => {
    try {
      // Since we can't directly access DigiKey's API without authentication,
      // we'll use a mock search that would normally call their API
      console.log(`🔍 Searching DigiKey for: ${partNumber} - ${description}`);
      
      // In a real implementation, this would make an API call to DigiKey's search endpoint
      // For now, we'll simulate common electronic component pricing
      const mockPricing = DigikeyService.simulateDigikeyPricing(partNumber, description);
      
      return mockPricing;
    } catch (error) {
      console.error('DigiKey search error:', error);
      return null;
    }
  },

  // Simulate DigiKey pricing for common components
  simulateDigikeyPricing: (partNumber: string, description: string): DigiKeyPricing => {
    const desc = description.toLowerCase();
    const part = partNumber.toLowerCase();
    
    // Simulate realistic pricing based on component type
    let basePrice = 0.50; // Default price
    
    // Resistors and basic passives
    if (desc.includes('resistor') || desc.includes('ohm')) {
      basePrice = 0.10 + Math.random() * 0.20;
    }
    // Capacitors
    else if (desc.includes('capacitor') || desc.includes('ceramic') || desc.includes('electrolytic')) {
      basePrice = 0.15 + Math.random() * 0.50;
    }
    // ICs and microcontrollers
    else if (desc.includes('microcontroller') || desc.includes('processor') || part.includes('stm32')) {
      basePrice = 5.00 + Math.random() * 15.00;
    }
    // Diodes and LEDs
    else if (desc.includes('diode') || desc.includes('led')) {
      basePrice = 0.20 + Math.random() * 1.00;
    }
    // Transistors
    else if (desc.includes('transistor') || desc.includes('mosfet') || desc.includes('fet')) {
      basePrice = 0.50 + Math.random() * 3.00;
    }
    // Connectors
    else if (desc.includes('connector') || desc.includes('header') || desc.includes('socket')) {
      basePrice = 0.75 + Math.random() * 5.00;
    }
    // Sensors
    else if (desc.includes('sensor') || desc.includes('accelerometer') || desc.includes('gyro')) {
      basePrice = 2.00 + Math.random() * 10.00;
    }
    
    // Generate mock DigiKey part number if not provided
    const mockDigikeyPN = partNumber || `DK-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    return {
      partNumber: mockDigikeyPN,
      description: description || 'Electronic Component',
      unitPrice: Math.round(basePrice * 100) / 100,
      availability: Math.random() > 0.1 ? 'In Stock' : 'Limited Stock',
      minimumQuantity: 1,
      digikeyPN: mockDigikeyPN,
      manufacturerPN: partNumber || mockDigikeyPN,
      source: 'DigiKey (Simulated)'
    };
  },

  // Enhanced part number extraction for DigiKey
  extractDigikeyPartNumber: (input: string): string | null => {
    // Common DigiKey part number patterns
    const patterns = [
      /([A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+)/i,  // Standard DigiKey format
      /([A-Z0-9]{3,}-[A-Z0-9]+)/i,          // Manufacturer part format
      /([A-Z]{2,}\d{3,}[A-Z]*)/i,           // Common IC patterns
      /(STM32[A-Z0-9]+)/i,                  // STM32 specific
      /(ATMEGA[A-Z0-9]+)/i,                 // ATMEGA specific
      /([A-Z]{2,}\d{3,}[A-Z]*-[A-Z0-9]+)/i // Complex part numbers
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  },

  generateDigikeyCSV: (bomItems: BOMItem[]) => {
    const digikeyItems = bomItems.filter((item: BOMItem) => item.digikeyPN);
    
    if (digikeyItems.length === 0) {
      alert('No DigiKey parts found in BOM!');
      return null;
    }

    const csvHeader = 'Part Number,Quantity,Customer Reference\n';
    const csvRows = digikeyItems.map((item: BOMItem) => 
      `${item.digikeyPN},${item.quantity},"${item.partNumber} - ${item.description}"`
    ).join('\n');
    
    return csvHeader + csvRows;
  },

  downloadDigikeyCSV: (bomItems: BOMItem[], filename = 'cannasol_digikey_order.csv') => {
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

export default DigikeyService;
