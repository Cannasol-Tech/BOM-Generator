import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  Settings, 
  Plus, 
  Edit3, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Building,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  Package,
  FileText,
  ShoppingCart,
  ExternalLink,
  FileSpreadsheet,
  Zap,
  Save,
  FolderOpen
} from 'lucide-react';

// LocalStorage Service - No Database Required!
const BOMStorage = {
  STORAGE_KEY: 'cannasol-bom-data',
  
  save: (bomData: any) => {
    try {
      localStorage.setItem(BOMStorage.STORAGE_KEY, JSON.stringify(bomData));
      return true;
    } catch (error) {
      console.error('Failed to save BOM data:', error);
      return false;
    }
  },
  
  load: () => {
    try {
      const data = localStorage.getItem(BOMStorage.STORAGE_KEY);
      return data ? JSON.parse(data) : BOMStorage.getDefaultData();
    } catch (error) {
      console.error('Failed to load BOM data:', error);
      return BOMStorage.getDefaultData();
    }
  },
  
  exportJSON: (bomData: any, filename = 'cannasol-bom-export.json') => {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
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
  
  importJSON: (file: File, callback: any) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const importData = JSON.parse(result);
          const bomData = importData.bomData || importData; // Handle both formats
          callback(bomData);
        }
      } catch (error) {
        alert('Invalid JSON file format');
      }
    };
    reader.readAsText(file);
  },
  
  getDefaultData: () => [
    {
      id: 1,
      partNumber: 'TA-001-001',
      description: 'Primary Processing Tank - Stainless Steel 316L',
      category: 'Tank',
      quantity: 1,
      unit: 'EA',
      unitCost: 2850.00,
      extendedCost: 2850.00,
      supplier: 'Tank Systems Pro',
      leadTime: 28,
      revision: 'C',
      status: 'Active',
      requiredFor: 'Base System',
      digikeyPN: null,
      manufacturerPN: 'TANK-316L-50L'
    },
    {
      id: 2,
      partNumber: 'IC-001-001',
      description: 'STM32F407VGT6 Microcontroller',
      category: 'IC',
      quantity: 1,
      unit: 'EA',
      unitCost: 12.50,
      extendedCost: 12.50,
      supplier: 'DigiKey',
      leadTime: 3,
      revision: 'A',
      status: 'Active',
      requiredFor: 'Automation Box',
      digikeyPN: '497-11232-ND',
      manufacturerPN: 'STM32F407VGT6'
    },
    {
      id: 3,
      partNumber: 'R-001-001',
      description: 'Resistor 10K Ohm 1% 1/4W',
      category: 'Resistor',
      quantity: 50,
      unit: 'EA',
      unitCost: 0.12,
      extendedCost: 6.00,
      supplier: 'DigiKey',
      leadTime: 1,
      revision: 'A',
      status: 'Active',
      requiredFor: 'Automation Box',
      digikeyPN: '311-10.0KCRCT-ND',
      manufacturerPN: 'RC0805FR-0710KL'
    },
    {
      id: 4,
      partNumber: 'C-001-001',
      description: 'Capacitor 100nF 50V X7R',
      category: 'Capacitor',
      quantity: 25,
      unit: 'EA',
      unitCost: 0.18,
      extendedCost: 4.50,
      supplier: 'DigiKey',
      leadTime: 1,
      revision: 'A',
      status: 'Active',
      requiredFor: 'Automation Box',
      digikeyPN: '1276-1003-1-ND',
      manufacturerPN: 'CL21B104KBCNNNC'
    }
  ]
};

// Digikey Integration Functions
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

  // Generate Digikey shopping cart URL
  generateDigikeyCartURL: (bomItems: any[]) => {
    const digikeyItems = bomItems.filter((item: any) => item.digikeyPN);
    
    if (digikeyItems.length === 0) {
      alert('No Digikey parts found in BOM!');
      return null;
    }

    // Use DigiKey's BOM tool page
    const bomToolURL = 'https://www.digikey.com/en/mylists/list/mylist';
    return bomToolURL;
  },

  // Open Digikey bulk order page
  openDigikeyBulkOrder: (bomItems: any[]) => {
    const digikeyItems = bomItems.filter((item: any) => item.digikeyPN);
    
    if (digikeyItems.length === 0) {
      alert('No DigiKey parts found in BOM!');
      return;
    }

    // Use the actual working DigiKey myLists page
    const myListsURL = 'https://www.digikey.com/en/mylists';
    window.open(myListsURL, '_blank');
    
    // Copy CSV format for easy pasting
    const csvContent = DigikeyService.generateDigikeyCSV(bomItems);
    if (csvContent && navigator.clipboard) {
      navigator.clipboard.writeText(csvContent).then(() => {
        setTimeout(() => {
          alert('📋 CSV data copied to clipboard!\n\n1. DigiKey myLists page opened\n2. Look for "Create New List" or "Import List"\n3. Paste CSV data or upload the file\n4. Add all items to cart');
        }, 500);
      }).catch(() => {
        alert('DigiKey myLists page opened.\n\nCreate a new list and import your CSV file or paste part numbers manually.');
      });
    } else {
      alert('DigiKey myLists page opened.\n\nCreate a new list and import your CSV file or paste part numbers manually.');
    }
  },

  // Open multiple Digikey product pages (for small lists)
  openDigikeyProducts: (bomItems: any[]) => {
    const digikeyItems = bomItems.filter((item: any) => item.digikeyPN);
    
    if (digikeyItems.length === 0) {
      alert('No Digikey parts found in BOM!');
      return;
    }

    if (digikeyItems.length > 5) {
      const confirm = window.confirm(
        `This will open ${digikeyItems.length} new tabs. Proceed?\n\n` +
        `Consider using "Bulk Order" for large lists.`
      );
      if (!confirm) return;
    }

    // Open each part in a new tab
    digikeyItems.slice(0, 10).forEach((item: any, index: number) => {
      setTimeout(() => {
        const productURL = `https://www.digikey.com/en/products/detail/${encodeURIComponent(item.digikeyPN)}`;
        window.open(productURL, '_blank');
      }, index * 500); // Stagger the opens to avoid popup blocking
    });

    if (digikeyItems.length > 10) {
      alert(`Opened first 10 parts. Use bulk order for remaining ${digikeyItems.length - 10} parts.`);
    }
  },

  getDigikeySummary: (bomItems: any[]) => {
    const digikeyItems = bomItems.filter((item: any) => item.digikeyPN);
    const totalItems = digikeyItems.length;
    const totalQuantity = digikeyItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const totalCost = digikeyItems.reduce((sum: number, item: any) => sum + item.extendedCost, 0);
    const nonDigikeyItems = bomItems.filter((item: any) => !item.digikeyPN).length;

    return {
      totalItems,
      totalQuantity,
      totalCost,
      nonDigikeyItems,
      digikeyItems
    };
  }
};

// Utility Components
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg shadow-md border border-gray-100 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', size = 'md', onClick, className = '', disabled = false }: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) => {
  const baseClasses = 'font-medium rounded-md transition-colors duration-200 inline-flex items-center gap-2 border';
  const variants = {
    primary: 'bg-gray-900 hover:bg-gray-800 text-white border-gray-900',
    secondary: 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300',
    outline: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-600'
  };
  const sizes = {
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

const Badge = ({ children, variant = 'default', className = '' }: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}) => {
  const variants = {
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

// Header Component with Save Status
const Header = ({ lastSaved, onSave, onExport, onImport }: {
  lastSaved: Date | null;
  onSave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) => {
  const fileInputRef = React.useRef();

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <div className="bg-white border-b-2 border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-100 border-2 border-gray-300 rounded-md flex items-center justify-center">
              <span className="text-sm font-bold text-gray-700">CT</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Cannasol Technologies</h1>
              <p className="text-sm text-gray-600">Bill of Materials Management System</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <div className="text-sm text-gray-500 mr-4">
                Last saved: {lastSaved.toLocaleTimeString()}
              </div>
            )}
            <button 
              onClick={onSave}
              className="flex items-center space-x-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700"
              title="Save to Browser Storage"
            >
              <Save size={16} />
              <span>Save</span>
            </button>
            <button 
              onClick={onExport}
              className="flex items-center space-x-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700"
              title="Export JSON File"
            >
              <Download size={16} />
              <span>Export</span>
            </button>
            <button 
              onClick={handleImportClick}
              className="flex items-center space-x-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700"
              title="Import JSON File"
            >
              <FolderOpen size={16} />
              <span>Import</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// OneDrive Integration Functions
// Digikey Shopping Component
const DigikeyShoppingList = ({ bomData }: { bomData: any[] }) => {
  const [showDigikeyDialog, setShowDigikeyDialog] = useState(false);
  const summary = DigikeyService.getDigikeySummary(bomData);

  const handleExportCSV = () => {
    DigikeyService.downloadDigikeyCSV(bomData);
  };

  const handleBulkOrder = () => {
    DigikeyService.openDigikeyBulkOrder(bomData);
  };

  const handleViewProducts = () => {
    DigikeyService.openDigikeyProducts(bomData);
  };

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
              <Button variant="primary" onClick={handleExportCSV}>
                <FileSpreadsheet size={16} />
                Download CSV
              </Button>
              <Button 
                variant="danger" 
                onClick={handleBulkOrder}
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
              <Button variant="outline" onClick={handleViewProducts}>
                <ExternalLink size={16} />
                View Products
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
                    {summary.digikeyItems.map((item, index) => (
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
                            href={`https://www.digikey.com/en/products/detail/${encodeURIComponent(item.digikeyPN)}`}
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

            {/* Enhanced Instructions */}
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
                <div>
                  <strong>Method 3 - Manual Search:</strong>
                  <ol className="list-decimal list-inside ml-4 mt-1">
                    <li>Click "DigiKey Home" → Opens DigiKey main page</li>
                    <li>Search for each part number individually</li>
                    <li>Copy part numbers from the table below</li>
                    <li>Add quantities and build cart manually</li>
                  </ol>
                </div>
                <div>
                  <strong>Method 4 - Individual Product Pages:</strong>
                  <ol className="list-decimal list-inside ml-4 mt-1">
                    <li>Click "View Products" → Opens each part in separate tabs</li>
                    <li>Review specifications and pricing</li>
                    <li>Add to cart from individual product pages</li>
                    <li>Best for orders under 5 parts</li>
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

// Main BOM Management Component
const BOMManager = () => {
  const [bomData, setBomData] = useState<any[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editingCell, setEditingCell] = useState<any>(null); // {itemId, field}
  const [editValue, setEditValue] = useState('');

  // Load data on component mount
  useEffect(() => {
    const loadedData = BOMStorage.load();
    setBomData(loadedData);
  }, []);

  const handleSave = () => {
    const success = BOMStorage.save(bomData);
    if (success) {
      setLastSaved(new Date());
    }
  };

  const handleExport = () => {
    BOMStorage.exportJSON(bomData);
  };

  const handleImport = (file) => {
    BOMStorage.importJSON(file, (importedData) => {
      setBomData(importedData);
      handleSave();
      alert('BOM data imported successfully!');
    });
  };

  const handleCellClick = (itemId, field, currentValue) => {
    setEditingCell({ itemId, field });
    setEditValue(currentValue || '');
  };

  const handleCellSave = () => {
    if (!editingCell) return;

    const { itemId, field } = editingCell;
    const updatedData = bomData.map(item => {
      if (item.id === itemId) {
        let newValue = editValue;
        
        // Handle numeric fields
        if (field === 'quantity') {
          newValue = parseInt(editValue) || 0;
        } else if (field === 'unitCost') {
          newValue = parseFloat(editValue) || 0;
        }
        
        const updatedItem = { ...item, [field]: newValue };
        
        // Recalculate extended cost if quantity or unitCost changed
        if (field === 'quantity' || field === 'unitCost') {
          updatedItem.extendedCost = updatedItem.quantity * updatedItem.unitCost;
        }
        
        return updatedItem;
      }
      return item;
    });

    setBomData(updatedData);
    setEditingCell(null);
    setEditValue('');
    handleSave();
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const renderEditableCell = (item, field, value, className = "") => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field;
    
    if (isEditing) {
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
          ? `$${(value || 0).toFixed(2)}` 
          : value || 'Click to add'}
      </div>
    );
  };

  const handleAddItem = () => {
    const newItem = {
      id: Math.max(...bomData.map(item => item.id), 0) + 1,
      partNumber: 'NEW-001-001',
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
    setBomData([...bomData, newItem]);
    handleSave();
  };

  const handleDeleteItem = (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      const updatedData = bomData.filter(item => item.id !== itemId);
      setBomData(updatedData);
      handleSave();
    }
  };

  const totalCost = bomData.reduce((sum, item) => sum + item.extendedCost, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        lastSaved={lastSaved}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Bill of Materials</h2>
          <div className="flex space-x-2">
            <DigikeyShoppingList bomData={bomData} />
            <Button variant="primary" onClick={handleAddItem}>
              <Plus size={16} />
              Add Item
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
        </div>

        {/* BOM Table */}
        <Card>
          <div className="overflow-x-auto">
            <div className="mb-2 p-3 bg-blue-50 border-l-4 border-blue-400">
              <p className="text-sm text-blue-700">
                💡 <strong>Tip:</strong> Click any cell to edit directly. Press Enter to save, Escape to cancel.
              </p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Part Number</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Qty</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Unit Cost</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Supplier</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bomData.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                      {renderEditableCell(item, 'partNumber', item.partNumber)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        {renderEditableCell(item, 'description', item.description)}
                        <div className="mt-1 flex items-center space-x-2">
                          <span className="text-xs text-gray-500">DigiKey:</span>
                          {renderEditableCell(item, 'digikeyPN', item.digikeyPN || '', 'text-xs')}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className="cursor-pointer hover:bg-gray-100">
                        {renderEditableCell(item, 'category', item.category)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {renderEditableCell(item, 'quantity', item.quantity, 'text-right')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {renderEditableCell(item, 'unitCost', item.unitCost, 'text-right')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      <div className="px-2 py-1">
                        ${item.extendedCost.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {renderEditableCell(item, 'supplier', item.supplier)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Delete item"
                        >
                          <X size={16} />
                        </button>
                        <a 
                          href={item.digikeyPN ? `https://www.digikey.com/en/products/detail/${encodeURIComponent(item.digikeyPN)}` : '#'}
                          target={item.digikeyPN ? '_blank' : '_self'}
                          rel="noopener noreferrer"
                          className={`p-1 transition-colors ${
                            item.digikeyPN 
                              ? 'text-blue-500 hover:text-blue-700' 
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title={item.digikeyPN ? 'View on DigiKey' : 'No DigiKey part number'}
                          onClick={!item.digikeyPN ? (e) => e.preventDefault() : undefined}
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                  <td colSpan={5} className="px-4 py-3 text-sm text-gray-900">TOTAL</td>
                  <td className="px-4 py-3 text-sm text-right text-lg text-gray-900">
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
            <p>• <strong>Storage:</strong> Data saved locally in browser (no server required)</p>
            <p>• <strong>Export/Import:</strong> JSON format for data sharing and backup</p>
            <p>• <strong>DigiKey Integration:</strong> CSV export and direct product links</p>
            <p>• <strong>Hosting:</strong> Deploy for free on Netlify, Vercel, or GitHub Pages</p>
            <p className="text-xs mt-2 text-gray-600 font-mono bg-gray-100 p-2 rounded">
              Deploy command: npm run build && npx netlify deploy --prod --dir=build
            </p>
          </div>
        </div>

      </div>
      
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