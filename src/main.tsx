import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore - EasyEDAService is a JavaScript file without type declarations
import EasyEDAService from './services/EasyEDAService.js';
import { HybridFirebaseBOMService } from './services/HybridFirebaseBOMService';
import ImportService from './services/ImportService';
import PartNumberService from './services/partNumberService';
import NLPService from './services/NLPService';
import DigikeyService from './services/DigikeyService';
// Import Firebase test functions for console testing
import './firebase-test.js';
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
  Edit2,
  Cpu
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
  inventoryValidated?: boolean;
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
  existingPartNumbers,
  firebaseInventory 
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: any[]) => void;
  existingPartNumbers: string[];
  firebaseInventory: any[];
}) => {
  const [columnOrder, setColumnOrder] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [previewData, setPreviewData] = useState<BOMItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPartNumber, setSelectedPartNumber] = useState('');

  // Autocomplete Part Number Input Component
  const PartNumberAutocomplete = ({ value, onChange, onSelect }: { 
    value: string; 
    onChange: (value: string) => void; 
    onSelect: (item: any) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredItems = firebaseInventory.filter(item => 
      item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.componentName.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10); // Limit to 10 results

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setSearchTerm(newValue);
      onChange(newValue);
      setIsOpen(true);
    };

    const handleItemSelect = (item: any) => {
      setSearchTerm(item.partNumber);
      onChange(item.partNumber);
      onSelect(item);
      setIsOpen(false);
    };

    return (
      <div className="relative" ref={inputRef}>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search part numbers from inventory..."
        />
        
        {isOpen && filteredItems.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredItems.map((item, index) => (
              <div
                key={index}
                onClick={() => handleItemSelect(item)}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.partNumber}</div>
                    <div className="text-xs text-gray-600 truncate">{item.componentName}</div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="text-xs text-gray-500">Stock: {item.currentStock}</div>
                    <div className="text-xs text-green-600">${item.unitCost?.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {isOpen && searchTerm && filteredItems.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3">
            <div className="text-sm text-gray-500">No matching parts found in inventory</div>
          </div>
        )}
      </div>
    );
  };

  const parseTextInput = () => {
    if (!columnOrder.trim()) {
      alert('Please specify the column order first');
      return;
    }

    const lines = bulkText.split('\n').filter(line => line.trim());
    const columnNames = columnOrder.split(',').map(col => col.trim().toLowerCase());
    
    const parsed = lines.map((line, index) => {
      const parts = line.split(/\t|,/).map(p => p.trim());
      
      // Create mapping based on column order
      const itemData: any = {};
      columnNames.forEach((colName, colIndex) => {
        const value = parts[colIndex] || '';
        
        // Map column names to our internal structure
        switch (colName) {
          case 'description':
            itemData.description = value;
            break;
          case 'category':
            itemData.category = value;
            break;
          case 'quantity':
            itemData.quantity = parseInt(value) || 1;
            break;
          case 'unitcost':
          case 'unit cost':
          case 'cost':
          case 'price':
            itemData.unitCost = parseFloat(value.replace(/[$,]/g, '')) || 0;
            break;
          case 'supplier':
          case 'vendor':
            itemData.supplier = value;
            break;
          case 'digikeyPN':
          case 'digikey pn':
          case 'digikey':
          case 'digi-key':
            itemData.digikeyPN = value;
            break;
          case 'manufacturerPN':
          case 'manufacturer pn':
          case 'mfr pn':
          case 'mpn':
            itemData.manufacturerPN = value;
            break;
          case 'partnumber':
          case 'part number':
          case 'pn':
            itemData.partNumber = value;
            break;
          case 'leadtime':
          case 'lead time':
            itemData.leadTime = parseInt(value) || 1;
            break;
          case 'revision':
          case 'rev':
            itemData.revision = value;
            break;
          case 'status':
            itemData.status = value;
            break;
          case 'requiredfor':
          case 'required for':
            itemData.requiredFor = value;
            break;
          default:
            // Store unmapped fields as custom properties
            itemData[colName] = value;
        }
      });

      // Validate part number against inventory if provided
      let inventoryItem = null;
      if (itemData.partNumber && firebaseInventory.length > 0) {
        inventoryItem = firebaseInventory.find(item => 
          item.partNumber.toLowerCase() === itemData.partNumber.toLowerCase()
        );
        
        if (!inventoryItem) {
          console.warn(`⚠️ Part number "${itemData.partNumber}" not found in inventory`);
        }
      }

      // Create final BOM item with defaults, use inventory data if available
      const finalItem = {
        id: Date.now() + index,
        partNumber: itemData.partNumber || PartNumberService.generatePartNumber(itemData.category || 'Other', existingPartNumbers),
        description: itemData.description || (inventoryItem ? inventoryItem.componentName : `Bulk Item ${index + 1}`),
        category: itemData.category || (inventoryItem ? inventoryItem.category : 'Other'),
        quantity: itemData.quantity || 1,
        unit: 'EA',
        unitCost: itemData.unitCost || (inventoryItem ? inventoryItem.unitCost : 0),
        extendedCost: (itemData.quantity || 1) * (itemData.unitCost || (inventoryItem ? inventoryItem.unitCost : 0)),
        supplier: itemData.supplier || (inventoryItem ? inventoryItem.supplier : ''),
        leadTime: itemData.leadTime || (inventoryItem ? inventoryItem.leadTime : 1),
        revision: itemData.revision || 'A',
        status: itemData.status || 'Active',
        requiredFor: itemData.requiredFor || 'Base System',
        digikeyPN: itemData.digikeyPN || (inventoryItem ? inventoryItem.digikeyPN : ''),
        manufacturerPN: itemData.manufacturerPN || (inventoryItem ? inventoryItem.partNumber : ''),
        fromInventory: !!inventoryItem,
        inventoryValidated: !!inventoryItem
      };

      return finalItem;
    });

    // Check for invalid part numbers
    const invalidParts = parsed.filter(item => item.partNumber && !item.inventoryValidated);
    if (invalidParts.length > 0) {
      const invalidPartNumbers = invalidParts.map(item => item.partNumber).join(', ');
      const proceed = confirm(
        `⚠️ Warning: The following part numbers are not in your inventory database:\n\n${invalidPartNumbers}\n\nDo you want to continue anyway? These parts will be marked as "not validated against inventory."`
      );
      if (!proceed) return;
    }

    setPreviewData(parsed);
    setShowPreview(true);
  };

  const handleAdd = () => {
    onAdd(previewData);
    setColumnOrder('');
    setBulkText('');
    setPreviewData([]);
    setShowPreview(false);
    onClose();
  };

  const getColumnOrderExample = () => {
    const examples = [
      'DigiKey PN, Description, Quantity, Unit Cost',
      'Part Number, Description, Category, Quantity, Unit Cost, Supplier',
      'Description, Category, Quantity, Unit Cost',
      'Manufacturer PN, Description, Quantity, Unit Cost, Supplier'
    ];
    return examples[Math.floor(Math.random() * examples.length)];
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
              <p className="text-sm text-gray-600">Add multiple parts at once with custom column order</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Single Item Add from Inventory */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 text-blue-800">Add Single Item from Inventory</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Number
                </label>
                <PartNumberAutocomplete
                  value={selectedPartNumber}
                  onChange={setSelectedPartNumber}
                  onSelect={(item) => {
                    setSelectedPartNumber(item.partNumber);
                    // Auto-populate other fields based on inventory item
                    const newItem = {
                      id: Date.now(),
                      partNumber: item.partNumber,
                      description: item.componentName,
                      category: item.category || 'Unknown',
                      quantity: 1,
                      unit: 'EA',
                      unitCost: item.unitCost || 0,
                      extendedCost: item.unitCost || 0,
                      supplier: item.supplier || 'Unknown',
                      leadTime: item.leadTime || 1,
                      revision: 'A',
                      status: 'Active',
                      requiredFor: 'Base System',
                      digikeyPN: item.digikeyPN || '',
                      manufacturerPN: item.partNumber,
                      fromInventory: true
                    };
                    onAdd([newItem]);
                    setSelectedPartNumber('');
                    onClose();
                  }}
                />
              </div>
              <div className="text-xs text-gray-600">
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>{firebaseInventory.length} parts available in inventory</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Add Section */}
          <div>
            <h4 className="font-semibold mb-3">Step 1: Define Column Order</h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Column Order (comma-separated)
              </label>
              <input
                type="text"
                value={columnOrder}
                onChange={(e) => setColumnOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={getColumnOrderExample()}
              />
              <div className="mt-2 text-xs text-gray-600">
                <p><strong>Available columns:</strong> Description, Category, Quantity, Unit Cost, Supplier, DigiKey PN, Manufacturer PN, Part Number, Lead Time, Revision, Status, Required For</p>
                <p className="mt-1 text-amber-600"><strong>Note:</strong> Part Numbers will be validated against your inventory database</p>
              </div>
            </div>

            <h4 className="font-semibold mb-3">Step 2: Enter Data</h4>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700 mb-2">Enter one part per line matching your column order:</p>
              {columnOrder && (
                <code className="text-xs bg-white p-2 rounded block">
                  {columnOrder}
                </code>
              )}
              <div className="mt-2 text-xs text-gray-600">
                <p>• Separate fields with commas or tabs</p>
                <p>• Fields will be mapped to your column order</p>
                <p>• Part numbers must exist in your inventory database</p>
                <p>• Missing fields will use defaults</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste Part Data
              </label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder={columnOrder ? 
                  `Match your column order: ${columnOrder}\n\nExample:\nC123456, STM32F407VGT6 Microcontroller, 1, 12.50\nC789012, 10K Resistor 1%, 50, 0.12\nC345678, 100nF Capacitor, 25, 0.18` :
                  "First, define your column order above..."
                }
                disabled={!columnOrder.trim()}
              />
            </div>

            <div className="flex space-x-2">
              <Button onClick={parseTextInput} disabled={!bulkText.trim() || !columnOrder.trim()}>
                <Eye size={16} />
                Preview
              </Button>
              <Button variant="outline" onClick={() => {
                setColumnOrder('');
                setBulkText('');
                setShowPreview(false);
                setPreviewData([]);
              }}>
                Clear All
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="mt-6">
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
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Cost</th>
                    <th className="px-3 py-2 text-left">Supplier</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{item.partNumber}</td>
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-xs">{item.category}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">${item.extendedCost.toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs">{item.supplier}</td>
                      <td className="px-3 py-2 text-center">
                        {item.inventoryValidated ? (
                          <Badge variant="success">✓ In Inventory</Badge>
                        ) : (
                          <Badge variant="warning">⚠ Not Found</Badge>
                        )}
                      </td>
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
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
  onEasyEDAExport,
  currentBOMName,
  savingToFirebase 
}: {
  lastSaved: Date | null;
  onSave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onBulkAdd: () => void;
  onImportFile: () => void;
  onNLPAdd: () => void;
  onBOMManagement: () => void;
  onEasyEDAExport: () => void;
  currentBOMName: string | null;
  savingToFirebase?: boolean;
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!event.target) return;
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowDropdown(false);
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {/* Cannasol Logo */}
              <img 
                src="/SmallIcon.png" 
                alt="Cannasol Technologies" 
                className="w-12 h-12 rounded-lg shadow-md"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cannasol Technologies</h1>
                <p className="text-sm text-gray-600 font-medium">BOM Generator</p>
              </div>
            </div>
            
            {/* Current BOM Name */}
            {currentBOMName && (
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <FolderOpen size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-800">{currentBOMName}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Quick Save */}
            <Button onClick={onSave} variant="outline" size="sm" disabled={savingToFirebase}>
              <Save size={16} />
              <span className="hidden sm:inline">{savingToFirebase ? 'Saving...' : 'Save'}</span>
            </Button>

            {/* BOM Management */}
            <Button onClick={onBOMManagement} variant="outline" size="sm">
              <FolderOpen size={16} />
              <span className="hidden sm:inline">BOMs</span>
            </Button>

            {/* Add Menu */}
            <div className="relative dropdown-container">
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
            <div className="relative dropdown-container">
              <Button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                variant="outline" 
                size="sm"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown size={14} />
              </Button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => { onExport(); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <FileSpreadsheet size={16} />
                      <span>Export JSON</span>
                    </button>
                    <button
                      onClick={() => { onEasyEDAExport(); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Cpu size={16} />
                      <span>Export for EasyEDA</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

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
  
  // Firebase/n8n states
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  const [firebaseInventory, setFirebaseInventory] = useState<any[]>([]);
  const [savingToFirebase, setSavingToFirebase] = useState(false);
  
  // BOM Management states
  const [currentBOMId, setCurrentBOMId] = useState<string | null>(null);
  const [currentBOMName, setCurrentBOMName] = useState<string | null>(null);
  
  // Dialog states
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showNLPAdd, setShowNLPAdd] = useState(false);
  const [showBOMManagement, setShowBOMManagement] = useState(false);

  // Initialize services
  const easyEDAService = useRef(new EasyEDAService()).current;
  const firebaseService = useRef(new HybridFirebaseBOMService()).current;

  // EasyEDA Integration functions
  const handleEasyEDASearch = async (bomItem: BOMItem) => {
    try {
      const results = await easyEDAService.searchComponents(bomItem.partNumber || bomItem.description);
      console.log('EasyEDA search results:', results);
      
      if (results.length > 0) {
        // Show results in a dialog or open EasyEDA directly
        const urls = easyEDAService.generateEasyEDAUrls(bomItem);
        window.open(urls.search, '_blank');
      } else {
        // Fallback to direct search
        const urls = easyEDAService.generateEasyEDAUrls(bomItem);
        window.open(urls.library, '_blank');
      }
    } catch (error) {
      console.error('EasyEDA search failed:', error);
      // Fallback to direct URL
      const urls = easyEDAService.generateEasyEDAUrls(bomItem);
      window.open(urls.search, '_blank');
    }
  };

  const handleEasyEDAExport = () => {
    try {
      const easyedaData = easyEDAService.exportForEasyEDA(bomData);
      
      // Create and download CSV file
      const blob = new Blob([easyedaData.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentBOMName || 'BOM'}_EasyEDA_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'EasyEDA BOM exported successfully!';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (error) {
      console.error('EasyEDA export failed:', error);
      alert('Failed to export EasyEDA BOM');
    }
  };

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

  // Initialize Firebase and N8N services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        
        // Initialize Firebase service
        console.log('🔥 Initializing Firebase service...');
        await firebaseService.initialize();
        setFirebaseConnected(true);
        console.log('✅ Firebase service initialized');
        
        // Load inventory from Firebase
        console.log('📦 Loading inventory from Firebase...');
        const inventoryItems = await firebaseService.getInventoryItems();
        setFirebaseInventory(inventoryItems);
        console.log(`✅ Loaded ${inventoryItems.length} inventory items from Firebase`);
        
      } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error);
        setFirebaseConnected(false);
        // Fallback to localStorage
        console.log('📂 Falling back to localStorage data');
      }
    };

    initializeServices();
  }, [firebaseService]);

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

  const handleSave = async () => {
    console.log('🔄 SAVE DEBUG: Starting BOM save operation');
    console.log('📊 SAVE DEBUG: BOM Data Overview:', {
      currentBOMId,
      currentBOMName,
      bomDataLength: bomData.length,
      totalCost: bomData.reduce((sum, item) => sum + item.extendedCost, 0),
      firebaseConnected,
      timestamp: new Date().toISOString()
    });
    
    // Debug: Log first few items for verification
    if (bomData.length > 0) {
      console.log('📋 SAVE DEBUG: First 3 BOM items:', bomData.slice(0, 3).map(item => ({
        id: item.id,
        partNumber: item.partNumber,
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitCost,
        extendedCost: item.extendedCost,
        category: item.category,
        supplier: item.supplier
      })));
    }
    
    try {
      setSavingToFirebase(true);
      
      if (currentBOMId) {
        console.log('🗂️ SAVE DEBUG: Updating existing named BOM with ID:', currentBOMId);
        
        // Update existing named BOM locally
        const success = BOMStorage.updateNamedBOM(currentBOMId, bomData);
        console.log('📝 SAVE DEBUG: Named BOM update result:', success);
        
        // Save to Firebase if connected
        if (firebaseConnected && firebaseService.isInitialized()) {
          try {
            console.log('🔥 SAVE DEBUG: Updating BOM in Firebase...');
            await firebaseService.updateNamedBOM(currentBOMId, bomData);
            console.log('✅ SAVE DEBUG: BOM updated in Firebase successfully');
          } catch (error) {
            console.error('❌ SAVE DEBUG: Failed to update BOM in Firebase:', error);
          }
        }
        
        // Verify the save by reading it back
        const savedBOM = BOMStorage.getNamedBOM(currentBOMId);
        console.log('🔍 SAVE DEBUG: Verification - BOM read back:', {
          found: !!savedBOM,
          name: savedBOM?.name,
          itemCount: savedBOM?.bomData.length,
          totalCost: savedBOM?.totalCost,
          lastModified: savedBOM?.lastModified
        });
        
        if (success) {
          setLastSaved(new Date());
          console.log('✅ SAVE DEBUG: Named BOM saved locally successfully');
        } else {
          console.error('❌ SAVE DEBUG: Failed to save named BOM locally');
        }
      } else {
        console.log('💾 SAVE DEBUG: No current BOM ID, using legacy save');
        
        // Legacy save to localStorage
        const success = BOMStorage.save(bomData);
        console.log('💾 SAVE DEBUG: Legacy save result:', success);
        
        // Save to Firebase if connected
        if (firebaseConnected && firebaseService.isInitialized()) {
          try {
            console.log('� SAVE DEBUG: Saving legacy BOM to Firebase...');
            await firebaseService.saveBOM(bomData);
            console.log('✅ SAVE DEBUG: Legacy BOM saved to Firebase successfully');
          } catch (error) {
            console.error('❌ SAVE DEBUG: Failed to save legacy BOM to Firebase:', error);
          }
        }
        
        // Verify the legacy save
        const savedData = BOMStorage.load();
        console.log('🔍 SAVE DEBUG: Legacy verification - Data read back:', {
          itemCount: savedData.length,
          totalCost: savedData.reduce((sum: number, item: any) => sum + item.extendedCost, 0),
          firstItem: savedData[0] ? {
            partNumber: savedData[0].partNumber,
            description: savedData[0].description
          } : null
        });
        
        if (success) {
          setLastSaved(new Date());
          console.log('✅ SAVE DEBUG: Legacy BOM saved locally successfully');
        } else {
          console.error('❌ SAVE DEBUG: Failed to save legacy BOM');
        }
      }
    } catch (error) {
      console.error('❌ SAVE DEBUG: Error during save operation:', error);
      console.log('🔍 SAVE DEBUG: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        currentBOMId,
        bomDataLength: bomData.length
      });
    } finally {
      setSavingToFirebase(false);
      console.log('🏁 SAVE DEBUG: Save operation completed');
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

  const handleSaveBOM = async (name: string, description: string) => {
    console.log('💾 SAVE_BOM DEBUG: Starting named BOM save operation');
    console.log('📋 SAVE_BOM DEBUG: Input parameters:', {
      name,
      description,
      bomDataLength: bomData.length,
      currentBOMId,
      currentBOMName,
      timestamp: new Date().toISOString()
    });
    
    // Debug: Log BOM data structure
    console.log('📊 SAVE_BOM DEBUG: BOM data overview:', {
      totalItems: bomData.length,
      totalCost: bomData.reduce((sum, item) => sum + item.extendedCost, 0),
      categories: [...new Set(bomData.map(item => item.category))],
      suppliers: [...new Set(bomData.map(item => item.supplier))]
    });
    
    // Debug: Log sample items
    if (bomData.length > 0) {
      console.log('📋 SAVE_BOM DEBUG: Sample BOM items:', bomData.slice(0, 3).map(item => ({
        id: item.id,
        partNumber: item.partNumber,
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitCost,
        extendedCost: item.extendedCost
      })));
    }
    
    try {
      setSavingToFirebase(true);
      
      console.log('🔄 SAVE_BOM DEBUG: Calling BOMStorage.saveNamedBOM...');
      const bomId = BOMStorage.saveNamedBOM(name, description, bomData);
      console.log('✅ SAVE_BOM DEBUG: Named BOM saved locally with ID:', bomId);
      
      // Verify the save
      const savedBOM = BOMStorage.getNamedBOM(bomId);
      console.log('🔍 SAVE_BOM DEBUG: Verification - saved BOM:', {
        found: !!savedBOM,
        id: savedBOM?.id,
        name: savedBOM?.name,
        description: savedBOM?.description,
        itemCount: savedBOM?.bomData.length,
        totalCost: savedBOM?.totalCost,
        createdDate: savedBOM?.createdDate,
        lastModified: savedBOM?.lastModified
      });
      
      setCurrentBOMId(bomId);
      setCurrentBOMName(name);
      BOMStorage.setCurrentBOM(bomId);
      setLastSaved(new Date());
      
      console.log('📝 SAVE_BOM DEBUG: State updated successfully');
      
      // Save to Firebase if connected
      if (firebaseConnected && firebaseService.isInitialized()) {
        try {
          console.log('� SAVE_BOM DEBUG: Saving named BOM to Firebase...');
          const firebaseBomId = await firebaseService.saveNamedBOM(name, description, bomData);
          console.log('✅ SAVE_BOM DEBUG: Named BOM saved to Firebase with ID:', firebaseBomId);
        } catch (error) {
          console.error('❌ SAVE_BOM DEBUG: Failed to save named BOM to Firebase:', error);
        }
      } else {
        console.log('🔌 SAVE_BOM DEBUG: Firebase not connected, skipping cloud save');
      }
    } catch (error) {
      console.error('❌ SAVE_BOM DEBUG: Failed to save named BOM:', error);
      console.log('🔍 SAVE_BOM DEBUG: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        bomDataLength: bomData.length,
        name,
        description
      });
    } finally {
      setSavingToFirebase(false);
      console.log('🏁 SAVE_BOM DEBUG: Named BOM save operation completed');
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

  // Helper function to check inventory availability
  const checkInventoryAvailability = (partNumber: string): {
    available: boolean;
    currentStock: number;
    unitCost: number;
    inventoryItem?: any;
  } => {
    if (!firebaseConnected || firebaseInventory.length === 0) {
      return { available: false, currentStock: 0, unitCost: 0 };
    }

    const inventoryItem = firebaseInventory.find(item => 
      item.partNumber === partNumber || 
      item.componentName.toLowerCase().includes(partNumber.toLowerCase())
    );

    if (inventoryItem) {
      return {
        available: inventoryItem.currentStock > 0,
        currentStock: inventoryItem.currentStock,
        unitCost: inventoryItem.unitCost || 0,
        inventoryItem
      };
    }

    return { available: false, currentStock: 0, unitCost: 0 };
  };

  // Helper function to suggest parts from inventory
  const suggestPartsFromInventory = (searchTerm: string): any[] => {
    if (!firebaseConnected || firebaseInventory.length === 0 || !searchTerm) {
      return [];
    }

    const term = searchTerm.toLowerCase();
    return firebaseInventory
      .filter(item => 
        item.partNumber.toLowerCase().includes(term) ||
        item.componentName.toLowerCase().includes(term)
      )
      .slice(0, 5); // Limit to 5 suggestions
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
    
    // For part number fields, pre-populate with inventory suggestions
    if (field === 'partNumber' && firebaseConnected && currentValue) {
      const availability = checkInventoryAvailability(currentValue);
      if (availability.inventoryItem) {
        console.log('📦 Found inventory item for:', currentValue, availability);
      }
    }
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
        
        // Auto-populate from inventory when part number is changed
        if (field === 'partNumber' && firebaseConnected) {
          const availability = checkInventoryAvailability(newValue);
          if (availability.inventoryItem) {
            const inventoryItem = availability.inventoryItem;
            console.log('📦 Auto-populating from inventory:', inventoryItem.partNumber);
            
            // Update fields with inventory data
            updatedItem.description = inventoryItem.componentName;
            updatedItem.unitCost = inventoryItem.unitCost || 0;
            updatedItem.supplier = inventoryItem.supplier || '';
            updatedItem.digikeyPN = inventoryItem.digikeyPN || '';
            updatedItem.category = inventoryItem.category || updatedItem.category;
            updatedItem.fromInventory = true;
            
            // Add a note about stock availability
            if (availability.currentStock > 0) {
              updatedItem.status = `In Stock (${availability.currentStock})`;
            } else {
              updatedItem.status = 'Out of Stock';
            }
          }
        }
        
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
      // For part number field, show inventory suggestions
      if (field === 'partNumber') {
        const inventorySuggestions = suggestPartsFromInventory(editValue);
        return (
          <div className="relative">
            <input
              type="text"
              list="inventory-parts"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={handleKeyPress}
              className={`w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
              placeholder="Start typing to see inventory suggestions..."
              autoFocus
            />
            <datalist id="inventory-parts">
              {inventorySuggestions.map(inv => (
                <option key={inv.partNumber} value={inv.partNumber}>
                  {inv.componentName} (Stock: {inv.currentStock})
                </option>
              ))}
            </datalist>
            {inventorySuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                {inventorySuggestions.map(inv => (
                  <div
                    key={inv.partNumber}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                    onClick={() => {
                      setEditValue(inv.partNumber);
                      setTimeout(() => handleCellSave(), 100);
                    }}
                  >
                    <div className="font-medium">{inv.partNumber}</div>
                    <div className="text-gray-600">{inv.componentName}</div>
                    <div className="text-xs text-gray-500">
                      Stock: {inv.currentStock} | Cost: ${inv.unitCost?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      
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
        className={`cursor-pointer hover:bg-gray-50 px-2 py-1 rounded transition-colors ${className} ${
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
        onEasyEDAExport={handleEasyEDAExport}
        currentBOMName={currentBOMName}
        savingToFirebase={savingToFirebase}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold text-gray-900">Bill of Materials</h2>
            {currentBOMName && (
              <Badge variant="info" className="text-sm bg-green-100 text-green-800 border-green-300">
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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
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
          <Card className="p-6 bg-green-50">
            <div className="flex items-center space-x-3">
              <Database className="text-green-600" size={24} />
              <div>
                <p className="text-2xl font-semibold text-green-900">
                  {bomData.filter(item => {
                    const availability = checkInventoryAvailability(item.partNumber);
                    return availability.available && availability.currentStock >= item.quantity;
                  }).length}
                </p>
                <p className="text-sm text-green-600">In Stock</p>
                <p className="text-xs text-green-600">
                  {bomData.filter(item => {
                    const availability = checkInventoryAvailability(item.partNumber);
                    return availability.available && availability.currentStock > 0 && availability.currentStock < item.quantity;
                  }).length} partial
                </p>
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
          <Card className="p-4 mb-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-green-800">
                  {selectedItems.size} items selected
                </span>
                <span className="text-sm text-green-600">
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
                <Package size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-800">
                  {filteredData.length} items
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAddItem}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Item</span>
                </button>
              </div>
            </div>
            <div className="mb-2 p-3 bg-gray-50 border-l-4 border-gray-400">
              <p className="text-sm text-gray-700">
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
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Stock</th>
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
                      selectedItems.has(item.id) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
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
                      <div>
                        {renderEditableCell(item, 'partNumber', item.partNumber)}
                        {item.fromInventory && (
                          <div className="mt-0.5">
                            <Badge className="bg-green-100 text-green-800 text-xs py-0 px-1">
                              From Inventory
                            </Badge>
                          </div>
                        )}
                      </div>
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
                      {(() => {
                        const availability = checkInventoryAvailability(item.partNumber);
                        if (availability.available) {
                          return (
                            <div className="flex flex-col items-end">
                              <span className="text-green-600 font-medium">
                                {availability.currentStock}
                              </span>
                              <span className="text-xs text-gray-500">
                                {availability.currentStock >= item.quantity ? 'Available' : 'Partial'}
                              </span>
                            </div>
                          );
                        } else if (availability.inventoryItem) {
                          return (
                            <div className="flex flex-col items-end">
                              <span className="text-red-600 font-medium">0</span>
                              <span className="text-xs text-red-500">Out of Stock</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex flex-col items-end">
                              <span className="text-gray-400">-</span>
                              <span className="text-xs text-gray-400">Not Tracked</span>
                            </div>
                          );
                        }
                      })()}
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
                          onClick={() => handleEasyEDASearch(item)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Search in EasyEDA"
                        >
                          <Cpu size={16} />
                        </button>
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
                    <td colSpan={10} className="px-3 py-12 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <Package size={48} className="text-gray-300" />
                        <div className="text-gray-500">
                          <p className="text-lg font-medium">No items found</p>
                          <p className="text-sm">Add your first component to get started</p>
                        </div>
                        <button
                          onClick={handleAddItem}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
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
                  <td colSpan={6} className="px-3 py-1.5 text-xs text-gray-900">TOTAL</td>
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
            <p>• <strong>Inventory Integration:</strong> Real-time stock levels from Firebase inventory</p>
            <p className="text-xs text-green-600 ml-4">📦 Green = Available, Red = Out of Stock, Gray = Not Tracked</p>
            <p>• <strong>Auto-Population:</strong> Part numbers from inventory auto-fill description and cost</p>
            <p>• <strong>Dynamic Dropdowns:</strong> Categories and suppliers auto-update from your data</p>
            <p>• <strong>Smart Suggestions:</strong> System learns your naming patterns and preferences</p>
            <p>• <strong>Firebase Storage:</strong> Data synced to cloud database for reliability</p>
            <p>• <strong>Export/Import:</strong> JSON format for data sharing and backup</p>
            <p>• <strong>DigiKey Integration:</strong> CSV export and direct product links</p>
            <p>• <strong>EasyEDA Integration:</strong> Component search, library access, and BOM export</p>
            <p className="text-xs text-green-600 ml-4">🔌 Click the CPU icon next to components to search in EasyEDA</p>
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
        firebaseInventory={firebaseInventory}
      />
      
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportItems}
      />
      
      <button 
        className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-105"
        onClick={() => window.open('https://cannasoltechnologies.com', '_blank')}
        title="Cannasol Technologies Website"
      >
        <Building size={20} />
      </button>
    </div>
  );
};

export default BOMManager;