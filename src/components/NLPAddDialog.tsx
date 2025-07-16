import { useState } from "react";
import NLPService from "../services/NLPService";
import PartNumberService from "../services/partNumberService";
import { Button, Card, Badge } from "../components/ui/utilities.tsx"
import { X, PlusCircle, ChevronUp, ChevronDown, Target } from "lucide-react";

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

export default NLPAddDialog;