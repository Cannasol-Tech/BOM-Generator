import React, { useState, useEffect } from 'react';
import { 
  Save, 
  FolderOpen, 
  CheckCircle, 
  Edit2, 
  Trash2, 
  X, 
  ChevronUp, 
  ChevronDown 
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

// Types
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
}

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

interface BOMManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadBOM: (bomId: string) => void;
  onSaveBOM: (name: string, description: string) => void;
  currentBOMId: string | null;
  currentBOMData: BOMItem[];
  BOMStorage: any; // TODO: Type this properly
}

const BOMManagementDialog: React.FC<BOMManagementDialogProps> = ({
  isOpen,
  onClose,
  onLoadBOM,
  onSaveBOM,
  currentBOMId,
  currentBOMData,
  BOMStorage
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

export default BOMManagementDialog;
