// NLP Service for AI-Powered Component Recognition
import DigikeyService from './DigikeyService';

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

  parseNaturalLanguage: async (input: string, existingCategories: string[] = [], existingSuppliers: string[] = []) => {
    const text = input.toLowerCase().trim();
    
    // Extract quantity if mentioned
    const quantityMatch = text.match(/(?:(\d+)\s*(?:pieces?|pcs?|units?|ea|each|x))|(?:qty\s*:?\s*(\d+))|(?:quantity\s*:?\s*(\d+))/i);
    const quantity = quantityMatch ? parseInt(quantityMatch[1] || quantityMatch[2] || quantityMatch[3]) || 1 : 1;

    // Extract cost if mentioned
    const costMatch = text.match(/\$(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*dollars?/i);
    let unitCost = costMatch ? parseFloat(costMatch[1] || costMatch[2]) || 0 : 0;

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

    // Try to get DigiKey pricing if no cost was specified and it looks like an electronic component
    let digikeyPN = '';
    let manufacturerPN = '';
    
    if (unitCost === 0 && (supplier === 'DigiKey' || ['IC', 'Resistor', 'Capacitor', 'Inductor', 'Diode', 'Transistor'].includes(category))) {
      console.log('🔍 Attempting to fetch DigiKey pricing for:', description);
      
      // Try to extract part number from input
      const extractedPN = DigikeyService.extractDigikeyPartNumber(input);
      if (extractedPN) {
        try {
          const pricing = await DigikeyService.searchDigikeyPart(extractedPN, description);
          if (pricing) {
            unitCost = pricing.unitPrice;
            digikeyPN = pricing.digikeyPN;
            manufacturerPN = pricing.manufacturerPN;
            supplier = 'DigiKey';
            console.log('✅ Found DigiKey pricing:', pricing);
          }
        } catch (error) {
          console.warn('⚠️ DigiKey pricing lookup failed:', error);
        }
      } else {
        // If no part number found, try searching by description
        try {
          const pricing = await DigikeyService.searchDigikeyPart('', description);
          if (pricing) {
            unitCost = pricing.unitPrice;
            digikeyPN = pricing.digikeyPN;
            manufacturerPN = pricing.manufacturerPN;
            supplier = 'DigiKey';
            console.log('✅ Found DigiKey pricing by description:', pricing);
          }
        } catch (error) {
          console.warn('⚠️ DigiKey pricing lookup by description failed:', error);
        }
      }
    }

    return {
      description,
      category,
      quantity,
      unitCost,
      supplier,
      specifications,
      digikeyPN,
      manufacturerPN,
      confidence: NLPService.calculateConfidence(text, category),
      originalInput: input
    };
  },

  // Synchronous version for fallback
  parseNaturalLanguageSync: (input: string, existingCategories: string[] = [], existingSuppliers: string[] = []) => {
    // This is the original synchronous parsing logic
    const result = {
      originalInput: input,
      description: '',
      category: 'Other',
      quantity: 1,
      unitCost: 0,
      supplier: '',
      confidence: 0.5,
      specifications: {},
      digikeyPN: '',
      manufacturerPN: '',
      digikeyData: null
    };

    // Extract quantity
    const qtyMatch = input.match(/(\d+)\s*(?:pieces?|pcs?|qty|quantity|x)?/i);
    if (qtyMatch) {
      result.quantity = parseInt(qtyMatch[1]);
    }

    // Extract cost
    const costMatch = input.match(/\$?(\d+(?:\.\d{2})?)/);
    if (costMatch) {
      result.unitCost = parseFloat(costMatch[1]);
    }

    // Detect component type and category
    let detectedCategory = 'Other';
    let confidence = 0.3;

    for (const [category, pattern] of Object.entries(NLPService.componentPatterns)) {
      if (pattern.test(input)) {
        detectedCategory = category.charAt(0).toUpperCase() + category.slice(1);
        confidence = 0.7;
        break;
      }
    }

    // Check against existing categories
    const matchingCategory = existingCategories.find(cat => 
      input.toLowerCase().includes(cat.toLowerCase())
    );
    if (matchingCategory) {
      detectedCategory = matchingCategory;
      confidence = Math.max(confidence, 0.6);
    }

    result.category = detectedCategory;
    result.confidence = confidence;
    result.description = input.trim();

    // Extract supplier
    const supplierMatch = input.match(/(?:from|supplier|vendor)\s+(\w+)/i);
    if (supplierMatch) {
      result.supplier = supplierMatch[1];
    } else {
      // Check against existing suppliers
      const matchingSupplier = existingSuppliers.find(sup => 
        input.toLowerCase().includes(sup.toLowerCase())
      );
      if (matchingSupplier) {
        result.supplier = matchingSupplier;
      }
    }

    return result;
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

export default NLPService;