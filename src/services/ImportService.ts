/**
 * Import Service
 * 
 * Handles parsing of Excel and CSV files for BOM data import
 */

import * as XLSX from 'xlsx';

export interface ParsedBOMItem {
  [key: string]: string;
}

export class ImportService {
  /**
   * Parse CSV text into structured data
   * @param csvText - Raw CSV text content
   * @returns Array of parsed objects
   */
  static parseCSV(csvText: string): ParsedBOMItem[] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    // Enhanced CSV line parser with proper quote handling
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

    const headers = parseCSVLine(lines[0]);
    const data: ParsedBOMItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      // Flexible validation: pad short rows, truncate long rows
      while (values.length < headers.length) {
        values.push(''); // Add empty strings for missing columns
      }
      if (values.length > headers.length) {
        values.length = headers.length; // Truncate extra columns
      }

      const row: ParsedBOMItem = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  }

  /**
   * Parse Excel file into structured data
   * @param file - File object to parse
   * @returns Promise resolving to array of parsed objects
   */
  static async parseExcel(file: File): Promise<ParsedBOMItem[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          let processedData: ParsedBOMItem[] = [];
          
          // Method 1: Standard JSON parsing
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: ''
          }) as any[][];
          
          if (jsonData.length >= 2) {
            const headers = jsonData[0];
            
            if (Array.isArray(headers) && headers.length > 1) {
              for (let i = 1; i < jsonData.length; i++) {
                const row: ParsedBOMItem = {};
                headers.forEach((header, index) => {
                  row[header] = jsonData[i][index] || '';
                });
                processedData.push(row);
              }
              
              resolve(processedData);
              return;
            }
          }
          
          // Method 2: CSV conversion
          try {
            const csvString = XLSX.utils.sheet_to_csv(worksheet, { 
              FS: ',',
              RS: '\n'
            });
            
            const csvData = ImportService.parseCSV(csvString);
            
            if (csvData.length > 0) {
              resolve(csvData);
              return;
            }
          } catch (csvError) {
            // Continue to method 3
          }
          
          // Method 3: Alternative parsing
          const altJsonData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: '',
            blankrows: false,
            skipHidden: false
          }) as ParsedBOMItem[];
          
          if (altJsonData.length > 0) {
            resolve(altJsonData);
            return;
          }
          
          throw new Error('Unable to parse Excel file with any method');
          
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Enhanced Excel parser that automatically detects and skips title rows
   * @param jsonData - Raw JSON data from Excel
   * @returns Processed data with title rows skipped
   */
  static parseExcelWithTitleDetection(jsonData: any[][]): ParsedBOMItem[] {
    // Find the row with the most non-empty cells (likely the real header)
    let bestHeaderRow = 0;
    let maxNonEmpty = 0;
    
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const nonEmpty = jsonData[i].filter(cell => cell && cell.toString().trim()).length;
      if (nonEmpty > maxNonEmpty && nonEmpty > 1) {
        maxNonEmpty = nonEmpty;
        bestHeaderRow = i;
      }
    }
    
    if (maxNonEmpty <= 1) return []; // No valid header found
    
    const headers = jsonData[bestHeaderRow];
    const data: ParsedBOMItem[] = [];
    
    for (let i = bestHeaderRow + 1; i < jsonData.length; i++) {
      const row: ParsedBOMItem = {};
      headers.forEach((header, index) => {
        row[header] = jsonData[i][index] || '';
      });
      data.push(row);
    }
    
    return data;
  }

  /**
   * Enhanced CSV parser with better quote handling
   * @param csvText - Raw CSV text content
   * @returns Array of parsed objects with proper quote handling
   */
  static parseCSVEnhanced(csvText: string): ParsedBOMItem[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const data: ParsedBOMItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      // Pad short rows, truncate long rows
      while (values.length < headers.length) {
        values.push('');
      }
      values.length = headers.length;
      
      const row: ParsedBOMItem = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }

    return data;
  }
}

export default ImportService;
