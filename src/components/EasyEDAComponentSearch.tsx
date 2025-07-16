import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Package, DollarSign, Zap, Download } from 'lucide-react';
import { EnhancedEasyEDAService, EasyEDAComponent } from '../services/EnhancedEasyEDAService';

interface ComponentSearchProps {
  onComponentSelect?: (component: EasyEDAComponent) => void;
  searchQuery?: string;
}

const EasyEDAComponentSearch: React.FC<ComponentSearchProps> = ({ 
  onComponentSelect, 
  searchQuery: initialQuery = '' 
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [components, setComponents] = useState<EasyEDAComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<EasyEDAComponent | null>(null);
  const [service] = useState(() => new EnhancedEasyEDAService());

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      const results = await service.searchComponents(query, {
        includeStock: true,
        includePricing: true,
        maxResults: 15
      });
      
      setComponents(results);
      
      if (results.length === 0) {
        setError('No components found. Try a different search term.');
      }
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Component search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleComponentSelect = (component: any) => {
    setSelectedComponent(component);
    onComponentSelect?.(component);
  };

  const downloadBOM = (component: any) => {
    const bomData = service.generateBOMData([{
      itemNumber: 1,
      quantity: 1,
      reference: 'U1',
      partNumber: component.partNumber,
      value: component.title,
      package: component.package,
      description: component.description,
      lcscPartNumber: component.lcscPartNumber,
      manufacturer: component.manufacturer
    }]);

    const blob = new Blob([bomData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${component.partNumber}_bom.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPrice = (pricing: any, quantity: number = 1) => {
    if (!pricing) return 'Price not available';
    
    return `$${pricing.unitPrice.toFixed(4)} (${quantity}x = $${pricing.totalPrice.toFixed(2)})`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Zap className="text-blue-600" />
          EasyEDA Component Search with LCSC Integration
        </h2>
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search components (e.g., STM32, 10k resistor, 100nF capacitor)..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Search
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Searching LCSC and EasyEDA databases...</p>
          </div>
        </div>
      )}

      {!loading && components.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Found {components.length} components
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {components.map((component: any, index: number) => {
              const pricing = service.getComponentPricing(component, 1);
              const availability = service.checkAvailability(component);
              const urls = service.generateComponentUrls(component);
              
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    selectedComponent === component ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
                  }`}
                  onClick={() => handleComponentSelect(component)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-800 line-clamp-2">
                      {component.title}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      availability.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {availability.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{component.partNumber}</span>
                      {component.lcscPartNumber && (
                        <span className="text-blue-600 text-xs">(LCSC)</span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 line-clamp-2">{component.description}</p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">
                        {component.manufacturer}
                      </span>
                      <span className="text-gray-500">
                        {component.package}
                      </span>
                    </div>

                    {pricing && (
                      <div className="flex items-center gap-1 text-green-600 font-medium">
                        <DollarSign className="w-4 h-4" />
                        {formatPrice(pricing, 1)}
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Stock: {availability.stockLevel.toLocaleString()} | 
                      Min Order: {availability.minimumOrder}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t flex gap-2">
                    {urls.lcsc && (
                      <a
                        href={urls.lcsc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        LCSC
                      </a>
                    )}
                    
                    {urls.easyeda && (
                      <a
                        href={urls.easyeda}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        EasyEDA
                      </a>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadBOM(component);
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                    >
                      <Download className="w-3 h-3" />
                      BOM
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedComponent && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Integration Options</h4>
          <div className="grid gap-2 md:grid-cols-2">
            <a
              href={service.generateComponentUrls(selectedComponent).addToSchematic}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Zap className="w-4 h-4" />
              Add to EasyEDA Schematic
            </a>
            <a
              href={selectedComponent ? service.generateComponentUrls(selectedComponent).addToPCB || '#' : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Package className="w-4 h-4" />
              Add to PCB Layout
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default EasyEDAComponentSearch;
