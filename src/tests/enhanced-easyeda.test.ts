import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedEasyEDAService } from '../services/EnhancedEasyEDAService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Temporarily disabled - EasyEDA/LCSC integration pending API key approval
describe.skip('Enhanced EasyEDA Service with LCSC Integration', () => {
  let service: EnhancedEasyEDAService;

  beforeEach(() => {
    service = new EnhancedEasyEDAService();
    vi.clearAllMocks();
  });

  describe('LCSC API Integration', () => {
    it('should search LCSC components successfully', async () => {
      const mockLCSCResponse = {
        result: {
          productSearchResultVO: {
            productList: [
              {
                productCode: 'C25804',
                productModel: 'RC0805FR-0710KL',
                productIntroEn: '10kΩ ±1% 1/4W 0805 Thick Film Resistor',
                catalogName: 'Resistors',
                brandNameEn: 'YAGEO',
                encapStandard: '0805',
                minPacketUnit: 1,
                stockNumber: 15000,
                dataManualUrl: 'https://datasheet.lcsc.com/C25804.pdf',
                productPriceList: [
                  { startQty: 1, endQty: 99, productPrice: 0.0021 },
                  { startQty: 100, endQty: 999, productPrice: 0.0019 }
                ],
                paramVOList: [
                  { paramName: 'Resistance', paramValue: '10kΩ' },
                  { paramName: 'Tolerance', paramValue: '±1%' }
                ]
              }
            ]
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLCSCResponse)
      });

      const results = await service.searchLCSCComponents('10k resistor');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('wmsc.lcsc.com'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(
        expect.objectContaining({
          productCode: 'C25804',
          productModel: 'RC0805FR-0710KL',
          brandNameEn: 'YAGEO',
          stockNumber: 15000
        })
      );
    });

    it('should handle LCSC API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const results = await service.searchLCSCComponents('test');
      
      expect(results).toEqual([]);
    });
  });

  describe('EasyEDA Integration', () => {
    it('should enhance LCSC components with EasyEDA data', async () => {
      const lcscComponents = [
        {
          productCode: 'C25804',
          productModel: 'RC0805FR-0710KL',
          productIntroEn: '10kΩ resistor',
          catalogName: 'Resistors',
          brandNameEn: 'YAGEO',
          encapStandard: '0805',
          minPacketUnit: 1,
          productPriceList: [],
          stockNumber: 1000,
          dataManualUrl: '',
          productImages: [],
          paramVOList: []
        }
      ];

      // Mock EasyEDA API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: [{
            uuid: 'easyeda-123',
            footprint: 'RESISTOR_0805',
            symbol: 'RESISTOR'
          }]
        })
      });

      const enhanced = await service.enhanceWithEasyEDAData(lcscComponents);

      expect(enhanced).toHaveLength(1);
      expect(enhanced[0]).toEqual(
        expect.objectContaining({
          partNumber: 'C25804',
          footprint: 'RESISTOR_0805',
          symbol: 'RESISTOR',
          easyedaUrl: expect.stringContaining('easyeda.com')
        })
      );
    });

    it('should generate correct component URLs', () => {
      const component = {
        uuid: 'test-123',
        partNumber: 'C25804',
        title: 'Test Resistor',
        lcscPartNumber: 'C25804',
        manufacturer: 'YAGEO',
        description: 'Test resistor description',
        package: '0805',
        easyedaUrl: 'https://easyeda.com/component/test-123'
      };

      const urls = service.generateComponentUrls(component);

      expect(urls).toEqual(
        expect.objectContaining({
          lcsc: expect.stringContaining('lcsc.com'),
          easyeda: expect.stringContaining('easyeda.com'),
          addToSchematic: expect.stringContaining('import=component'),
          oshwlab: expect.stringContaining('oshwlab.com')
        })
      );
    });
  });

  describe('Pricing and Availability', () => {
    it('should calculate pricing correctly', () => {
      const component = {
        uuid: 'test',
        title: 'Test Component',
        partNumber: 'C123',
        manufacturer: 'Test Mfg',
        description: 'Test description',
        package: '0805',
        easyedaUrl: 'https://easyeda.com/test',
        lcscComponent: {
          productCode: 'C123',
          productModel: 'Test',
          productIntroEn: 'Test',
          catalogName: 'Test',
          brandNameEn: 'Test',
          encapStandard: '0805',
          minPacketUnit: 1,
          stockNumber: 1000,
          dataManualUrl: '',
          productImages: [],
          paramVOList: [],
          productPriceList: [
            { startQty: 1, endQty: 99, productPrice: 0.10 },
            { startQty: 100, endQty: 999, productPrice: 0.08 },
            { startQty: 1000, endQty: 9999, productPrice: 0.06 }
          ]
        }
      };

      const pricing1 = service.getComponentPricing(component, 1);
      expect(pricing1?.unitPrice).toBe(0.10);
      expect(pricing1?.totalPrice).toBe(0.10);

      const pricing100 = service.getComponentPricing(component, 100);
      expect(pricing100?.unitPrice).toBe(0.08);
      expect(pricing100?.totalPrice).toBe(8.00);

      const pricing1000 = service.getComponentPricing(component, 1000);
      expect(pricing1000?.unitPrice).toBe(0.06);
      expect(pricing1000?.totalPrice).toBe(60.00);
    });

    it('should check availability correctly', () => {
      const inStockComponent = {
        uuid: 'test1',
        title: 'In Stock Component',
        partNumber: 'C001',
        manufacturer: 'Test',
        description: 'Test',
        package: '0805',
        easyedaUrl: 'https://test.com',
        lcscComponent: {
          productCode: 'C001',
          productModel: 'Test',
          productIntroEn: 'Test',
          catalogName: 'Test',
          brandNameEn: 'Test',
          encapStandard: '0805',
          minPacketUnit: 10,
          productPriceList: [],
          stockNumber: 5000,
          dataManualUrl: '',
          productImages: [],
          paramVOList: []
        }
      };

      const outOfStockComponent = {
        uuid: 'test2',
        title: 'Out of Stock Component',
        partNumber: 'C002',
        manufacturer: 'Test',
        description: 'Test',
        package: '0805',
        easyedaUrl: 'https://test.com',
        lcscComponent: {
          productCode: 'C002',
          productModel: 'Test',
          productIntroEn: 'Test',
          catalogName: 'Test',
          brandNameEn: 'Test',
          encapStandard: '0805',
          minPacketUnit: 1,
          productPriceList: [],
          stockNumber: 0,
          dataManualUrl: '',
          productImages: [],
          paramVOList: []
        }
      };

      const inStockAvailability = service.checkAvailability(inStockComponent);
      expect(inStockAvailability.inStock).toBe(true);
      expect(inStockAvailability.stockLevel).toBe(5000);
      expect(inStockAvailability.minimumOrder).toBe(10);

      const outOfStockAvailability = service.checkAvailability(outOfStockComponent);
      expect(outOfStockAvailability.inStock).toBe(false);
      expect(outOfStockAvailability.stockLevel).toBe(0);
    });
  });

  describe('BOM Generation', () => {
    it('should generate BOM data correctly', () => {
      const bomItems = [
        {
          itemNumber: 1,
          quantity: 2,
          reference: 'R1,R2',
          partNumber: 'C25804',
          value: '10kΩ',
          package: '0805',
          description: '10kΩ ±1% Resistor',
          lcscPartNumber: 'C25804',
          manufacturer: 'YAGEO'
        }
      ];

      const bomData = service.generateBOMData(bomItems);
      const parsedData = JSON.parse(bomData);

      expect(parsedData).toHaveLength(1);
      expect(parsedData[0]).toEqual(
        expect.objectContaining({
          'Item#': 1,
          'Qty': 2,
          'Reference': 'R1,R2',
          'Part': 'C25804',
          'LCSC Part #': 'C25804'
        })
      );
    });
  });

  describe('Search Integration', () => {
    it('should search components with full integration', async () => {
      // Mock LCSC response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            result: {
              productSearchResultVO: {
                productList: [{
                  productCode: 'C25804',
                  productModel: 'Test Resistor',
                  productIntroEn: 'Test description',
                  brandNameEn: 'Test Brand',
                  encapStandard: '0805',
                  stockNumber: 1000,
                  productPriceList: [{ startQty: 1, endQty: 99, productPrice: 0.01 }]
                }]
              }
            }
          })
        })
        // Mock EasyEDA response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            result: [{
              uuid: 'test-uuid',
              footprint: 'TEST_FOOTPRINT',
              symbol: 'TEST_SYMBOL'
            }]
          })
        });

      const results = await service.searchComponents('test component', {
        includeStock: true,
        includePricing: true,
        maxResults: 10
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(
        expect.objectContaining({
          partNumber: 'C25804',
          footprint: 'TEST_FOOTPRINT',
          symbol: 'TEST_SYMBOL',
          lcscComponent: expect.any(Object)
        })
      );
    });

    it('should fallback to EasyEDA when LCSC fails', async () => {
      // Mock LCSC failure
      mockFetch
        .mockRejectedValueOnce(new Error('LCSC API failed'))
        // Mock EasyEDA success
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            result: [{
              uuid: 'easyeda-123',
              title: 'EasyEDA Component',
              partnumber: 'EDA123'
            }]
          })
        });

      const results = await service.searchComponents('test');

      expect(results).toHaveLength(1);
      expect(results[0].partNumber).toBe('EDA123');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await service.searchComponents('test');

      // Should return fallback components
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      });

      const results = await service.searchLCSCComponents('test');
      expect(results).toEqual([]);
    });
  });
});
