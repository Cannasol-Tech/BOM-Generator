// DigiKey Service for BOM ordering integration
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
