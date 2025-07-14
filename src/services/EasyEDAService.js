// EasyEDA Integration Service
// Provides component search, selection, and data integration with EasyEDA

class EasyEDAService {
  constructor() {
    this.baseUrl = 'https://easyeda.com';
    this.oshwlabUrl = 'https://oshwlab.com';
    this.apiUrl = 'https://modules.easyeda.com/api';
    this.componentCache = new Map();
  }

  // Search for components in EasyEDA library
  async searchComponents(query) {
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
      return this.parseSearchResults(data);
    } catch (error) {
      console.warn('EasyEDA search failed, using fallback:', error);
      return this.getFallbackResults(query);
    }
  }

  // Parse search results from EasyEDA API
  parseSearchResults(data) {
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
