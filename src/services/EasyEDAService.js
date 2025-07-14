// EasyEDA Integration Service with LCSC API
// Enhanced with LCSC component search and real-time pricing

class EasyEDAService {
  constructor() {
    this.baseUrl = 'https://easyeda.com';
    this.oshwlabUrl = 'https://oshwlab.com';
    this.apiUrl = 'https://modules.easyeda.com/api';
    this.lcscApiUrl = 'https://wmsc.lcsc.com/wmsc/product/list';
    this.componentCache = new Map();
    this.lcscCache = new Map();
  }

  // Enhanced search using LCSC API first, then EasyEDA
  async searchComponents(query) {
    try {
      // Try LCSC API first (official EasyEDA supplier)
      const lcscResults = await this.searchLCSCComponents(query);
      if (lcscResults.length > 0) {
        return await this.enhanceWithEasyEDAData(lcscResults);
      }
      
      // Fallback to EasyEDA API
      return await this.searchEasyEDAComponents(query);
    } catch (error) {
      console.warn('Component search failed, using fallback:', error);
      return this.getFallbackResults(query);
    }
  }

  // Search LCSC API for components
  async searchLCSCComponents(query) {
    const cacheKey = `lcsc_${query}`;
    if (this.lcscCache.has(cacheKey)) {
      return this.lcscCache.get(cacheKey);
    }

    try {
      const searchParams = new URLSearchParams({
        keyword: query,
        currentPage: '1',
        pageSize: '20',
        searchSource: 'search',
        simpleSearch: 'true'
      });

      const response = await fetch(`${this.lcscApiUrl}?${searchParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BOM-Generator/1.0',
          'Referer': 'https://lcsc.com'
        }
      });

      if (!response.ok) {
        throw new Error(`LCSC API error: ${response.status}`);
      }

      const data = await response.json();
      const components = this.parseLCSCResponse(data);
      this.lcscCache.set(cacheKey, components);
      return components;
    } catch (error) {
      console.error('LCSC API search failed:', error);
      return [];
    }
  }

  // Parse LCSC API response
  parseLCSCResponse(data) {
    if (!data.result || !data.result.productSearchResultVO || !Array.isArray(data.result.productSearchResultVO.productList)) {
      return [];
    }

    return data.result.productSearchResultVO.productList.map(product => ({
      id: product.productCode,
      title: product.productModel,
      partNumber: product.productCode,
      lcscPartNumber: product.productCode,
      manufacturer: product.brandNameEn,
      description: product.productIntroEn,
      package: product.encapStandard,
      datasheet: product.dataManualUrl,
      stock: product.stockNumber || 0,
      pricing: product.productPriceList || [],
      minOrder: product.minPacketUnit || 1,
      lcscUrl: `https://lcsc.com/product-detail/${product.productCode}.html`,
      category: product.catalogName,
      parameters: product.paramVOList || [],
      images: product.productImages || []
    }));
  }

  // Search EasyEDA API (fallback)
  async searchEasyEDAComponents(query) {
    try {
      // EasyEDA component search endpoint
      const searchUrl = `${this.apiUrl}/components/search`;
      const params = new URLSearchParams({
        wd: query,
        currentpage: 1,
        pagesize: 20,
        sortfield: 'updatetime'
      });

      const response = await fetch(`${searchUrl}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BOM-Generator/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      return this.parseEasyEDAResults(data);
    } catch (error) {
      console.warn('EasyEDA search failed:', error);
      return [];
    }
  }

  // Enhance LCSC components with EasyEDA symbol/footprint data
  async enhanceWithEasyEDAData(lcscComponents) {
    const enhanced = [];
    
    for (const lcscComp of lcscComponents) {
      try {
        // Try to find matching EasyEDA component
        const easyedaMatch = await this.findEasyEDAMatch(lcscComp.partNumber);
        
        enhanced.push({
          ...lcscComp,
          footprint: easyedaMatch?.footprint,
          symbol: easyedaMatch?.symbol,
          easyedaUrl: easyedaMatch ? `${this.baseUrl}/component/${easyedaMatch.uuid}` : '',
          easyedaId: easyedaMatch?.uuid
        });
      } catch (error) {
        console.warn(`Failed to enhance ${lcscComp.partNumber}:`, error);
        enhanced.push(lcscComp);
      }
    }
    
    return enhanced;
  }

  // Find matching EasyEDA component
  async findEasyEDAMatch(lcscPartNumber) {
    try {
      const response = await fetch(`${this.apiUrl}/components/search?wd=${lcscPartNumber}&lcsc=${lcscPartNumber}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.result && data.result.length > 0 ? data.result[0] : null;
    } catch (error) {
      return null;
    }
  }

  // Parse search results from EasyEDA API
  parseEasyEDAResults(data) {
    if (!data.result || !Array.isArray(data.result)) {
      return [];
    }

    return data.result.map(component => ({
      id: component.uuid || component.lcscPart,
      title: component.title || component.componentName,
      partNumber: component.lcscPart || component.partnumber,
      manufacturer: component.manufacturer,
      description: component.description,
      package: component.package,
      datasheet: component.datasheet,
      price: component.price,
      stock: component.stock,
      easyedaUrl: `${this.baseUrl}/component/${component.uuid}`,
      lcscUrl: component.lcscUrl,
      footprint: component.footprint,
      symbol: component.symbol
    }));
  }

  // Get fallback results when API is unavailable
  getFallbackResults(query) {
    const commonComponents = this.getCommonComponents();
    return commonComponents.filter(comp => 
      comp.title.toLowerCase().includes(query.toLowerCase()) ||
      comp.partNumber.toLowerCase().includes(query.toLowerCase()) ||
      comp.description.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  }

  // Generate direct EasyEDA URLs for component selection
  generateEasyEDAUrls(bomItem) {
    const searchQuery = encodeURIComponent(
      bomItem.partNumber || bomItem.description || bomItem.itemName
    );
    
    return {
      // Direct search in OSHWLab (correct EasyEDA search URL)
      search: `${this.oshwlabUrl}/search?wd=${searchQuery}`,
      // Component library search
      library: `${this.oshwlabUrl}/search?wd=${searchQuery}`,
      // LCSC component search (EasyEDA's preferred supplier)
      lcsc: `https://lcsc.com/search?q=${searchQuery}`,
      // Schematic symbol search
      symbol: `${this.baseUrl}/editor#search=symbol:${searchQuery}`,
      // PCB footprint search  
      footprint: `${this.baseUrl}/editor#search=footprint:${searchQuery}`
    };
  }

  // Auto-select component in EasyEDA (requires browser extension)
  async autoSelectComponent(bomItem, easyedaTabId) {
    try {
      // This would require a browser extension to work
      // For now, we'll open the component and copy selection code
      const urls = this.generateEasyEDAUrls(bomItem);
      
      // Generate JavaScript code to inject into EasyEDA
      const selectionScript = this.generateSelectionScript(bomItem);
      
      return {
        success: true,
        urls,
        selectionScript,
        instructions: this.getManualInstructions(bomItem)
      };
    } catch (error) {
      console.error('Auto-selection failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate JavaScript for component selection in EasyEDA
  generateSelectionScript(bomItem) {
    return `
      // Auto-generated selection script for EasyEDA
      // Component: ${bomItem.itemName}
      // Part Number: ${bomItem.partNumber}
      
      function selectComponent() {
        const searchQuery = "${bomItem.partNumber || bomItem.description}";
        
        // Try to find search input
        const searchInput = document.querySelector('input[placeholder*="search" i], input[type="search"]');
        if (searchInput) {
          searchInput.value = searchQuery;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        }
        
        // Wait for results and select first match
        setTimeout(() => {
          const firstResult = document.querySelector('.component-item:first-child, .search-result:first-child');
          if (firstResult) {
            firstResult.click();
            console.log('Component selected:', searchQuery);
          }
        }, 1000);
      }
      
      selectComponent();
    `;
  }

  // Get manual instructions for component selection
  getManualInstructions(bomItem) {
    return [
      `1. Open EasyEDA and go to the Component Library`,
      `2. Search for: "${bomItem.partNumber || bomItem.description}"`,
      `3. Look for components matching: ${bomItem.itemName}`,
      `4. Check package type: ${bomItem.package || 'Not specified'}`,
      `5. Verify specifications match your requirements`,
      `6. Add to your schematic by clicking "Place"`
    ];
  }

  // Export BOM in EasyEDA format
  exportForEasyEDA(bomData) {
    const easyedaFormat = bomData.map((item, index) => ({
      'Item': index + 1,
      'Designator': item.designator || `U${index + 1}`,
      'Package': item.package || 'Unknown',
      'Quantity': item.quantity || 1,
      'Manufacturer Part Number': item.partNumber || '',
      'Manufacturer': item.supplier || '',
      'Description': item.description || item.itemName,
      'LCSC Part Number': item.lcscPart || '',
      'Note': item.notes || ''
    }));

    return {
      format: 'EasyEDA_BOM',
      data: easyedaFormat,
      csv: this.convertToCSV(easyedaFormat),
      timestamp: new Date().toISOString()
    };
  }

  // Get component pricing from LCSC
  getComponentPricing(component, quantity = 1) {
    if (!component.pricing || !Array.isArray(component.pricing) || component.pricing.length === 0) {
      return null;
    }

    // Find applicable price tier
    let unitPrice = 0;
    for (const priceBreak of component.pricing) {
      if (quantity >= priceBreak.startQty && quantity <= priceBreak.endQty) {
        unitPrice = priceBreak.productPrice;
        break;
      }
    }

    // Use first price if no exact match
    if (unitPrice === 0) {
      unitPrice = component.pricing[0].productPrice;
    }

    return {
      unitPrice,
      totalPrice: unitPrice * quantity,
      priceBreaks: component.pricing.map(p => ({
        qty: p.startQty,
        price: p.productPrice
      })),
      currency: 'USD',
      minOrder: component.minOrder || 1
    };
  }

  // Check component availability
  checkAvailability(component) {
    return {
      inStock: (component.stock || 0) > 0,
      stockLevel: component.stock || 0,
      minimumOrder: component.minOrder || 1,
      leadTime: (component.stock || 0) > 1000 ? '1-2 days' : '3-7 days'
    };
  }

  // Generate comprehensive component URLs
  generateComponentUrls(component) {
    const searchQuery = encodeURIComponent(component.partNumber || component.title);
    
    return {
      // LCSC product page (primary)
      lcsc: component.lcscUrl || `https://lcsc.com/search?q=${searchQuery}`,
      // EasyEDA component (if available)
      easyeda: component.easyedaUrl || `${this.oshwlabUrl}/search?wd=${searchQuery}`,
      // Direct integration URLs
      addToSchematic: component.easyedaId ? 
        `${this.baseUrl}/editor#import=component:${component.easyedaId}` : null,
      addToPCB: component.footprint ? 
        `${this.baseUrl}/editor#import=footprint:${component.footprint}` : null,
      // Search URLs
      searchSymbol: `${this.baseUrl}/editor#search=symbol:${searchQuery}`,
      searchFootprint: `${this.baseUrl}/editor#search=footprint:${searchQuery}`
    };
  }

  // Generate BOM data for EasyEDA import
  generateEasyEDABOM(bomItems) {
    const bomData = bomItems.map((item, index) => ({
      'Item#': index + 1,
      'Qty': item.quantity || 1,
      'Reference': item.reference || `R${index + 1}`,
      'Part': item.partNumber || '',
      'Value': item.value || item.description || '',
      'Package': item.package || '',
      'Description': item.description || '',
      'LCSC Part #': item.lcscPartNumber || item.partNumber || '',
      'Manufacturer': item.manufacturer || '',
      'Supplier': 'LCSC',
      'Comment': item.comment || ''
    }));

    return {
      csvData: this.convertToCSV(bomData),
      jsonData: bomData,
      easyedaImportUrl: `${this.baseUrl}/editor#import=bom`
    };
  }

  // Convert data to CSV format
  convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          `"${(row[header] || '').toString().replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }

  // Get common electronic components for fallback
  getCommonComponents() {
    return [
      {
        id: 'res_1k',
        title: '1KΩ Resistor',
        partNumber: 'RC0603FR-071KL',
        manufacturer: 'Yageo',
        description: '1 kOhms ±1% 0.1W, 1/10W Chip Resistor 0603',
        package: '0603',
        easyedaUrl: `${this.baseUrl}/component/resistor-1k-0603`
      },
      {
        id: 'cap_100n',
        title: '100nF Capacitor',
        partNumber: 'CC0603KRX7R9BB104',
        manufacturer: 'Yageo',
        description: '0.1µF ±10% 50V Ceramic Capacitor X7R 0603',
        package: '0603',
        easyedaUrl: `${this.baseUrl}/component/capacitor-100nf-0603`
      },
      {
        id: 'led_red',
        title: 'Red LED',
        partNumber: 'LTST-C170KRKT',
        manufacturer: 'Lite-On',
        description: 'Red 631nm LED Indication - Discrete 2V 0603',
        package: '0603',
        easyedaUrl: `${this.baseUrl}/component/led-red-0603`
      }
    ];
  }

  // Create browser bookmarklet for easy integration
  generateBookmarklet() {
    const bookmarkletCode = `
      javascript:(function(){
        const bomData = localStorage.getItem('bomData');
        if (bomData) {
          const components = JSON.parse(bomData);
          const currentComponent = components[0]; // Start with first component
          if (currentComponent) {
            const searchQuery = currentComponent.partNumber || currentComponent.description;
            const searchUrl = 'https://oshwlab.com/search?wd=' + encodeURIComponent(searchQuery);
            window.open(searchUrl, '_blank');
          }
        } else {
          alert('No BOM data found. Please generate a BOM first.');
        }
      })();
    `;
    
    return {
      name: 'EasyEDA BOM Helper',
      code: bookmarkletCode,
      instructions: [
        '1. Copy the bookmarklet code above',
        '2. Create a new bookmark in your browser',
        '3. Paste the code as the URL',
        '4. Click the bookmark when viewing your BOM to search in EasyEDA'
      ]
    };
  }
}

export default EasyEDAService;
