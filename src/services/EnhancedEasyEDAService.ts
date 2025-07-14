// Enhanced EasyEDA Service with LCSC API Integration
// LCSC is the official component supplier for EasyEDA

export interface LCSCComponent {
  productCode: string;
  productModel: string;
  productIntroEn: string;
  catalogName: string;
  brandNameEn: string;
  encapStandard: string;
  minPacketUnit: number;
  productPriceList: Array<{
    startQty: number;
    endQty: number;
    productPrice: number;
  }>;
  stockNumber: number;
  dataManualUrl: string;
  productImages: string[];
  paramVOList: Array<{
    paramName: string;
    paramValue: string;
  }>;
}

export interface EasyEDAComponent {
  uuid: string;
  title: string;
  partNumber: string;
  lcscPartNumber?: string;
  manufacturer: string;
  description: string;
  package: string;
  datasheet?: string;
  footprint?: string;
  symbol?: string;
  easyedaUrl: string;
  lcscComponent?: LCSCComponent;
}

export class EnhancedEasyEDAService {
  private baseUrl = 'https://easyeda.com';
  private oshwlabUrl = 'https://oshwlab.com';
  private lcscApiUrl = 'https://wmsc.lcsc.com/wmsc/product/list';
  private componentCache = new Map<string, EasyEDAComponent[]>();
  private lcscCache = new Map<string, LCSCComponent[]>();
  private apiKey: string | null = null;
  private hasApiAccess = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.VITE_LCSC_API_KEY || null;
    this.hasApiAccess = !!this.apiKey;
    this.setupCorsProxy();
    
    if (!this.hasApiAccess) {
      console.warn('LCSC API key not found. Using fallback methods only.');
    }
  }

  /**
   * Search for components using both EasyEDA and LCSC APIs
   */
  async searchComponents(query: string, options: {
    includeStock?: boolean;
    includePricing?: boolean;
    maxResults?: number;
    category?: string;
  } = {}): Promise<EasyEDAComponent[]> {
    const { includeStock = true, includePricing = true, maxResults = 20 } = options;

    try {
      // Search LCSC API first (more reliable and comprehensive)
      const lcscResults = await this.searchLCSCComponents(query, {
        maxResults,
        category: options.category
      });

      // Enhance with EasyEDA symbols and footprints
      const enhancedResults = await this.enhanceWithEasyEDAData(lcscResults);

      return enhancedResults.slice(0, maxResults);
    } catch (error) {
      console.warn('LCSC API search failed, falling back to EasyEDA:', error);
      return this.searchEasyEDAOnly(query, maxResults);
    }
  }

  /**
   * Search LCSC API for components
   */
  async searchLCSCComponents(query: string, options: {
    maxResults?: number;
    category?: string;
  } = {}): Promise<LCSCComponent[]> {
    const cacheKey = `lcsc_${query}_${options.category || 'all'}`;
    if (this.lcscCache.has(cacheKey)) {
      return this.lcscCache.get(cacheKey)!;
    }

    try {
      const searchParams = new URLSearchParams({
        keyword: query,
        currentPage: '1',
        pageSize: (options.maxResults || 20).toString(),
        searchSource: 'search',
        simpleSearch: 'true'
      });

      if (options.category) {
        searchParams.append('catalogNodeId', options.category);
      }

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

  /**
   * Parse LCSC API response
   */
  private parseLCSCResponse(data: any): LCSCComponent[] {
    if (!data.result || !data.result.productSearchResultVO || !Array.isArray(data.result.productSearchResultVO.productList)) {
      return [];
    }

    return data.result.productSearchResultVO.productList.map((product: any) => ({
      productCode: product.productCode,
      productModel: product.productModel,
      productIntroEn: product.productIntroEn,
      catalogName: product.catalogName,
      brandNameEn: product.brandNameEn,
      encapStandard: product.encapStandard,
      minPacketUnit: product.minPacketUnit,
      productPriceList: product.productPriceList || [],
      stockNumber: product.stockNumber || 0,
      dataManualUrl: product.dataManualUrl,
      productImages: product.productImages || [],
      paramVOList: product.paramVOList || []
    }));
  }

  /**
   * Enhance LCSC components with EasyEDA symbol/footprint data
   */
  async enhanceWithEasyEDAData(lcscComponents: LCSCComponent[]): Promise<EasyEDAComponent[]> {
    const enhancedComponents: EasyEDAComponent[] = [];

    for (const lcscComp of lcscComponents) {
      try {
        // Search EasyEDA for matching component
        const easyedaData = await this.findEasyEDAMatch(lcscComp.productCode);
        
        const enhanced: EasyEDAComponent = {
          uuid: easyedaData?.uuid || `lcsc_${lcscComp.productCode}`,
          title: lcscComp.productModel,
          partNumber: lcscComp.productCode,
          lcscPartNumber: lcscComp.productCode,
          manufacturer: lcscComp.brandNameEn,
          description: lcscComp.productIntroEn,
          package: lcscComp.encapStandard,
          datasheet: lcscComp.dataManualUrl,
          footprint: easyedaData?.footprint,
          symbol: easyedaData?.symbol,
          easyedaUrl: easyedaData ? `${this.baseUrl}/component/${easyedaData.uuid}` : '',
          lcscComponent: lcscComp
        };

        enhancedComponents.push(enhanced);
      } catch (error) {
        console.warn(`Failed to enhance component ${lcscComp.productCode}:`, error);
        
        // Add basic component without EasyEDA data
        enhancedComponents.push({
          uuid: `lcsc_${lcscComp.productCode}`,
          title: lcscComp.productModel,
          partNumber: lcscComp.productCode,
          lcscPartNumber: lcscComp.productCode,
          manufacturer: lcscComp.brandNameEn,
          description: lcscComp.productIntroEn,
          package: lcscComp.encapStandard,
          datasheet: lcscComp.dataManualUrl,
          easyedaUrl: '',
          lcscComponent: lcscComp
        });
      }
    }

    return enhancedComponents;
  }

  /**
   * Find matching EasyEDA component for LCSC part
   */
  async findEasyEDAMatch(lcscPartNumber: string): Promise<any> {
    try {
      // EasyEDA API endpoint for component lookup
      const response = await fetch(`https://modules.easyeda.com/api/components/search?wd=${lcscPartNumber}&lcsc=${lcscPartNumber}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.result && data.result.length > 0 ? data.result[0] : null;
    } catch (error) {
      console.warn('EasyEDA lookup failed:', error);
      return null;
    }
  }

  /**
   * Fallback search using EasyEDA only
   */
  async searchEasyEDAOnly(query: string, maxResults: number): Promise<EasyEDAComponent[]> {
    try {
      const response = await fetch(`https://modules.easyeda.com/api/components/search?wd=${encodeURIComponent(query)}&currentpage=1&pagesize=${maxResults}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`EasyEDA API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseEasyEDAResponse(data);
    } catch (error) {
      console.error('EasyEDA search failed:', error);
      return this.getFallbackComponents(query);
    }
  }

  /**
   * Parse EasyEDA API response
   */
  private parseEasyEDAResponse(data: any): EasyEDAComponent[] {
    if (!data.result || !Array.isArray(data.result)) {
      return [];
    }

    return data.result.map((comp: any) => ({
      uuid: comp.uuid,
      title: comp.title,
      partNumber: comp.lcscPart || comp.partnumber,
      lcscPartNumber: comp.lcscPart,
      manufacturer: comp.manufacturer,
      description: comp.description,
      package: comp.package,
      datasheet: comp.datasheet,
      footprint: comp.footprint,
      symbol: comp.symbol,
      easyedaUrl: `${this.baseUrl}/component/${comp.uuid}`
    }));
  }

  /**
   * Generate URLs for component integration
   */
  generateComponentUrls(component: EasyEDAComponent) {
    const searchQuery = encodeURIComponent(component.partNumber || component.title);
    
    return {
      // LCSC product page
      lcsc: `https://lcsc.com/product-detail/${component.lcscPartNumber}.html`,
      // EasyEDA component page
      easyeda: component.easyedaUrl,
      // OSHWLab search
      oshwlab: `${this.oshwlabUrl}/search?wd=${searchQuery}`,
      // Direct schematic integration
      addToSchematic: `${this.baseUrl}/editor#import=component:${component.uuid}`,
      // PCB footprint
      addToPCB: component.footprint ? `${this.baseUrl}/editor#import=footprint:${component.footprint}` : null
    };
  }

  /**
   * Generate BOM integration data for EasyEDA
   */
  generateBOMData(bomItems: any[]): string {
    const bomData = bomItems.map(item => ({
      'Item#': item.itemNumber || '',
      'Qty': item.quantity || 1,
      'Reference': item.reference || '',
      'Part': item.partNumber || '',
      'Value': item.value || '',
      'Package': item.package || '',
      'Description': item.description || '',
      'LCSC Part #': item.lcscPartNumber || '',
      'Manufacturer': item.manufacturer || '',
      'Comment': item.comment || ''
    }));

    return JSON.stringify(bomData, null, 2);
  }

  /**
   * Setup CORS proxy for API calls if needed
   */
  private setupCorsProxy() {
    // In production, you might need a CORS proxy
    // For development, browser extensions can handle CORS
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: CORS may be blocked for LCSC API calls');
    }
  }

  /**
   * Get fallback components when APIs fail
   */
  private getFallbackComponents(query: string): EasyEDAComponent[] {
    const commonComponents = [
      {
        uuid: 'fallback_1',
        title: 'Resistor 10kΩ',
        partNumber: 'C25804',
        manufacturer: 'UNI-ROYAL',
        description: '10kΩ ±1% 1/4W 0805 Thick Film Resistor',
        package: '0805',
        easyedaUrl: 'https://easyeda.com/component/C25804'
      },
      {
        uuid: 'fallback_2', 
        title: 'Capacitor 100nF',
        partNumber: 'C49678',
        manufacturer: 'SAMSUNG',
        description: '100nF ±10% 50V X7R 0805 MLCC',
        package: '0805',
        easyedaUrl: 'https://easyeda.com/component/C49678'
      }
    ];

    return commonComponents
      .filter(comp => 
        comp.title.toLowerCase().includes(query.toLowerCase()) ||
        comp.partNumber.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 3) as EasyEDAComponent[];
  }

  /**
   * Get component pricing from LCSC
   */
  getComponentPricing(component: EasyEDAComponent, quantity: number = 1): {
    unitPrice: number;
    totalPrice: number;
    priceBreaks: Array<{ qty: number; price: number }>;
    currency: string;
  } | null {
    if (!component.lcscComponent || !component.lcscComponent.productPriceList) {
      return null;
    }

    const priceList = component.lcscComponent.productPriceList;
    let unitPrice = 0;

    // Find applicable price based on quantity
    for (const priceBreak of priceList) {
      if (quantity >= priceBreak.startQty && quantity <= priceBreak.endQty) {
        unitPrice = priceBreak.productPrice;
        break;
      }
    }

    // If no exact match, use the lowest quantity price
    if (unitPrice === 0 && priceList.length > 0) {
      unitPrice = priceList[0].productPrice;
    }

    return {
      unitPrice,
      totalPrice: unitPrice * quantity,
      priceBreaks: priceList.map(p => ({ qty: p.startQty, price: p.productPrice })),
      currency: 'USD'
    };
  }

  /**
   * Check component availability
   */
  checkAvailability(component: EasyEDAComponent): {
    inStock: boolean;
    stockLevel: number;
    minimumOrder: number;
    leadTime?: string;
  } {
    if (!component.lcscComponent) {
      return {
        inStock: false,
        stockLevel: 0,
        minimumOrder: 1
      };
    }

    return {
      inStock: component.lcscComponent.stockNumber > 0,
      stockLevel: component.lcscComponent.stockNumber,
      minimumOrder: component.lcscComponent.minPacketUnit,
      leadTime: component.lcscComponent.stockNumber > 1000 ? '1-2 days' : '3-7 days'
    };
  }
}

export default EnhancedEasyEDAService;
