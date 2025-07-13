/**
 * Enhanced Excel/CSV Parser for BOM Generator
 * Addresses critical issues with quote handling, header detection, and data validation
 * 
 * Usage:
 *   import { EnhancedImportService } from './enhanced-import-service';
 *   const data = await EnhancedImportService.parseExcel(file);
 */

import * as XLSX from 'xlsx';

export class EnhancedImportService {
  /**
   * Enhanced CSV parser with proper quote handling
   * Fixes: quoted commas, escaped quotes, flexible column validation
   */
  static parseCSV(csvString: string): any[] {
    console.log('🔍 Enhanced CSV Parser: Starting parse...');
    
    const lines = csvString.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse CSV line with proper quote handling
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote: "" becomes "
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator (only when not in quotes)
          result.push(current.trim());
          current = '';
        } else {
          // Regular character
          current += char;
        }
      }
      
      // Add the final field
      result.push(current.trim());
      return result;
    };

    // Parse headers
    const headers = parseCSVLine(lines[0]);
    console.log(`📊 Found ${headers.length} columns:`, headers);

    const data: any[] = [];
    let processedRows = 0;
    let skippedRows = 0;

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        
        // Flexible validation: pad short rows, truncate long rows
        while (values.length < headers.length) {
          values.push(''); // Add empty strings for missing columns
        }
        if (values.length > headers.length) {
          values.length = headers.length; // Truncate extra columns
        }

        // Create row object
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        data.push(row);
        processedRows++;
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ Skipping malformed row ${i + 1}:`, errorMsg);
        skippedRows++;
      }
    }

    console.log(`✅ CSV Parse complete: ${processedRows} rows processed, ${skippedRows} skipped`);
    return data;
  }

  /**
   * Enhanced Excel parser with intelligent header detection
   * Fixes: title row detection, merged cells, fallback strategies
   */
  static async parseExcel(file: File): Promise<any[]> {
    console.log('🔍 Enhanced Excel Parser: Starting parse...');
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          console.log(`📄 Processing sheet: ${firstSheetName}`);
          
          // Try enhanced parsing with intelligent header detection
          const result = this.parseExcelWithIntelligentHeaders(worksheet);
          
          if (result.length > 0) {
            console.log(`✅ Enhanced Excel parse successful: ${result.length} rows`);
            resolve(result);
            return;
          }
          
          // Fallback: Try CSV conversion with enhanced parser
          console.log('🔄 Attempting CSV fallback...');
          const csvString = XLSX.utils.sheet_to_csv(worksheet, { FS: ',', RS: '\n' });
          const csvResult = this.parseCSV(csvString);
          
          if (csvResult.length > 0) {
            console.log(`✅ CSV fallback successful: ${csvResult.length} rows`);
            resolve(csvResult);
            return;
          }
          
          throw new Error('Could not parse Excel file with any method');
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('❌ Excel parse failed:', error);
          reject(new Error(`Failed to parse Excel file: ${errorMsg}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Intelligent header detection for Excel files
   * Analyzes multiple rows to find the best header candidate
   */
  private static parseExcelWithIntelligentHeaders(worksheet: XLSX.WorkSheet): any[] {
    console.log('🧠 Using intelligent header detection...');
    
    // Get raw data from Excel
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: '',
      blankrows: false 
    }) as any[][];
    
    if (jsonData.length === 0) {
      throw new Error('Excel sheet is empty');
    }
    
    console.log(`📊 Analyzing ${jsonData.length} rows for header detection...`);
    
    // Analyze first few rows to find best header candidate
    const analyzeRows = (maxRows = 5) => {
      const analysis: Array<{ row: number; score: number; data: any[] }> = [];
      
      for (let i = 0; i < Math.min(maxRows, jsonData.length); i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;
        
        let score = 0;
        
        // Count non-empty cells
        const nonEmptyCount = row.filter(cell => cell && String(cell).trim()).length;
        score += nonEmptyCount * 2;
        
        // Look for header-like keywords
        const headerKeywords = [
          'part', 'number', 'description', 'quantity', 'cost', 'price', 'vendor',
          'item', 'id', 'name', 'type', 'category', 'supplier', 'code', 'ref',
          'model', 'serial', 'location', 'status', 'notes', 'manufacturer'
        ];
        
        const headerMatches = row.filter(cell => 
          cell && headerKeywords.some(keyword => 
            String(cell).toLowerCase().includes(keyword)
          )
        ).length;
        score += headerMatches * 5;
        
        // Prefer rows with multiple unique values
        const uniqueValues = new Set(row.filter(cell => cell && String(cell).trim())).size;
        score += (uniqueValues > 1 ? 3 : 0);
        
        // Bonus for having reasonable number of columns (2-20)
        if (nonEmptyCount >= 2 && nonEmptyCount <= 20) {
          score += 5;
        }
        
        analysis.push({ row: i, score, data: row });
        console.log(`📈 Row ${i} analysis: score=${score}, columns=${nonEmptyCount}, matches=${headerMatches}`);
      }
      
      return analysis.sort((a, b) => b.score - a.score);
    };
    
    const rowAnalysis = analyzeRows();
    const bestHeader = rowAnalysis[0];
    
    if (bestHeader.score === 0) {
      throw new Error('Could not detect valid headers in Excel file');
    }
    
    console.log(`🎯 Best header found at row ${bestHeader.row} (score: ${bestHeader.score})`);
    
    // Use the best header row
    const headers = bestHeader.data
      .map(h => String(h || '').trim())
      .filter(h => h); // Remove empty headers
    
    if (headers.length === 0) {
      throw new Error('No valid column headers found');
    }
    
    console.log(`📋 Using headers:`, headers);
    
    // Parse data rows (everything after the header row)
    const data: any[] = [];
    for (let i = bestHeader.row + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      // Create row object with flexible validation
      const rowObject: any = {};
      let hasData = false;
      
      headers.forEach((header, index) => {
        const value = row[index] || '';
        rowObject[header] = String(value).trim();
        if (rowObject[header]) hasData = true;
      });
      
      // Only include rows with at least some data
      if (hasData) {
        data.push(rowObject);
      }
    }
    
    console.log(`✅ Parsed ${data.length} data rows with ${headers.length} columns`);
    return data;
  }

  /**
   * Validate and clean imported data
   */
  static validateImportedData(data: any[]): { valid: any[]; errors: string[] } {
    const valid: any[] = [];
    const errors: string[] = [];
    
    data.forEach((item, index) => {
      try {
        // Basic validation - ensure we have some required fields
        const hasPartNumber = item.partNumber || item['Part Number'] || item.part || item.id;
        const hasDescription = item.description || item.Description || item.name;
        
        if (!hasPartNumber && !hasDescription) {
          errors.push(`Row ${index + 1}: Missing both part number and description`);
          return;
        }
        
        // Normalize common fields
        const normalized = {
          partNumber: hasPartNumber || `AUTO-${index + 1}`,
          description: hasDescription || 'No description',
          quantity: this.parseNumber(item.quantity || item.Quantity || item.qty || 1),
          cost: this.parseNumber(item.cost || item.Cost || item.price || item.Price || 0),
          vendor: item.vendor || item.Vendor || item.supplier || item.Supplier || '',
          ...item // Include all original fields
        };
        
        valid.push(normalized);
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Row ${index + 1}: ${errorMsg}`);
      }
    });
    
    return { valid, errors };
  }
  
  private static parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols and commas
      const cleaned = value.replace(/[$,]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}

export default EnhancedImportService;
