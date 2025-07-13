/**
 * Enhanced Excel Parser - Improved Implementation
 * 
 * This file contains improved versions of the Excel and CSV parsers
 * that address the issues identified in testing.
 */

const EnhancedImportService = {
  /**
   * Improved CSV Parser that properly handles quoted fields, commas, and edge cases
   */
  parseCSV: (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    /**
     * Parse a single CSV line properly handling quotes and escaped characters
     */
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote inside quoted field
            current += '"';
            i++; // Skip the next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator (only when not inside quotes)
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add the last field
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      // Handle mismatched column counts by padding or truncating
      while (values.length < headers.length) {
        values.push(''); // Pad with empty strings
      }
      values.length = headers.length; // Truncate if too long
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  },

  /**
   * Enhanced Excel Parser with intelligent header detection and better fallback logic
   */
  parseExcel: async (file) => {
    console.log('📊 Enhanced Excel parsing:', file.name, file.type, file.size);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          console.log('📖 File loaded, parsing with enhanced SheetJS...');
          
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          console.log('📚 Workbook sheets:', workbook.SheetNames);
          
          // Get the first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Enhanced Method 1: Intelligent header detection
          try {
            const result = EnhancedImportService.parseExcelWithIntelligentHeaders(worksheet);
            if (result.length > 0) {
              console.log('✅ Enhanced Method 1 succeeded:', result);
              resolve(result);
              return;
            }
          } catch (error) {
            console.log('⚠️ Enhanced Method 1 failed:', error.message);
          }
          
          // Enhanced Method 2: Improved CSV conversion
          try {
            const result = await EnhancedImportService.parseExcelViaEnhancedCSV(worksheet);
            if (result.length > 0) {
              console.log('✅ Enhanced Method 2 succeeded:', result);
              resolve(result);
              return;
            }
          } catch (error) {
            console.log('⚠️ Enhanced Method 2 failed:', error.message);
          }
          
          // Enhanced Method 3: Multiple header detection strategies
          try {
            const result = EnhancedImportService.parseExcelWithMultipleStrategies(worksheet);
            if (result.length > 0) {
              console.log('✅ Enhanced Method 3 succeeded:', result);
              resolve(result);
              return;
            }
          } catch (error) {
            console.log('⚠️ Enhanced Method 3 failed:', error.message);
          }
          
          throw new Error('Unable to parse Excel file with any enhanced method');
          
        } catch (error) {
          console.error('❌ Enhanced Excel parsing error:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        const error = new Error('Failed to read file');
        console.error('❌ File reading error:', error);
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Intelligent header detection - finds the best row to use as headers
   */
  parseExcelWithIntelligentHeaders: (worksheet) => {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      blankrows: false
    });
    
    if (jsonData.length < 2) {
      throw new Error('Insufficient data rows');
    }
    
    console.log('🔍 Analyzing rows for best header candidate...');
    
    // Analyze first 5 rows to find the best header row
    let bestHeaderRow = -1;
    let maxScore = 0;
    
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (!Array.isArray(row)) continue;
      
      let score = 0;
      
      // Score based on:
      // 1. Number of non-empty cells
      const nonEmptyCount = row.filter(cell => 
        cell && cell.toString().trim() && cell.toString().trim() !== ''
      ).length;
      
      // 2. Presence of typical header keywords
      const headerKeywords = [
        'part', 'number', 'description', 'quantity', 'cost', 'price', 
        'supplier', 'vendor', 'category', 'type', 'stock', 'inventory',
        'digikey', 'mfg', 'manufacturer'
      ];
      
      const headerMatches = row.filter(cell => {
        if (!cell) return false;
        const cellText = cell.toString().toLowerCase();
        return headerKeywords.some(keyword => cellText.includes(keyword));
      }).length;
      
      // 3. Variety of content (not all same value)
      const uniqueValues = new Set(row.map(cell => 
        cell ? cell.toString().trim().toLowerCase() : ''
      ));
      
      // Calculate score
      score = nonEmptyCount * 2 + headerMatches * 5 + (uniqueValues.size > 1 ? 3 : 0);
      
      // Bonus for having at least 2 columns
      if (nonEmptyCount >= 2) score += 5;
      
      console.log(`Row ${i} score: ${score} (nonEmpty: ${nonEmptyCount}, headerMatches: ${headerMatches}, unique: ${uniqueValues.size})`);
      console.log(`Row ${i} content:`, row);
      
      if (score > maxScore) {
        maxScore = score;
        bestHeaderRow = i;
      }
    }
    
    if (bestHeaderRow === -1 || maxScore < 5) {
      throw new Error('Could not identify a valid header row');
    }
    
    console.log(`🎯 Selected row ${bestHeaderRow} as header (score: ${maxScore})`);
    
    // Extract data using the identified header row
    const headers = jsonData[bestHeaderRow].map(h => h ? h.toString().trim() : '');
    const data = [];
    
    // Validate headers
    const validHeaders = headers.filter(h => h && h !== '');
    if (validHeaders.length < 2) {
      throw new Error('Insufficient valid headers found');
    }
    
    for (let i = bestHeaderRow + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!Array.isArray(row)) continue;
      
      const rowData = {};
      let hasData = false;
      
      headers.forEach((header, index) => {
        const value = row[index] ? row[index].toString().trim() : '';
        rowData[header] = value;
        if (value) hasData = true;
      });
      
      // Only include rows that have at least some data
      if (hasData) {
        data.push(rowData);
      }
    }
    
    return data;
  },

  /**
   * Enhanced CSV conversion with better handling
   */
  parseExcelViaEnhancedCSV: async (worksheet) => {
    const csvString = XLSX.utils.sheet_to_csv(worksheet, { 
      FS: ',',
      RS: '\n',
      forceQuotes: false
    });
    
    console.log('📝 Generated CSV (first 300 chars):', csvString.substring(0, 300));
    
    if (!csvString || csvString.trim() === '') {
      throw new Error('Empty CSV generated');
    }
    
    // Use enhanced CSV parser
    const csvData = EnhancedImportService.parseCSV(csvString);
    
    if (csvData.length === 0) {
      throw new Error('No data extracted from CSV');
    }
    
    return csvData;
  },

  /**
   * Multiple strategy parsing for complex Excel files
   */
  parseExcelWithMultipleStrategies: (worksheet) => {
    const strategies = [
      // Strategy 1: Default object format
      () => XLSX.utils.sheet_to_json(worksheet, { 
        defval: '',
        blankrows: false,
        skipHidden: false
      }),
      
      // Strategy 2: Raw format with range detection
      () => {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          range: range,
          defval: ''
        });
        
        // Apply intelligent header detection to this data
        return EnhancedImportService.processRawJsonData(jsonData);
      },
      
      // Strategy 3: Skip empty rows and try different starting points
      () => {
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          blankrows: false
        });
        
        // Try starting from different rows
        for (let startRow = 0; startRow < Math.min(3, jsonData.length); startRow++) {
          try {
            const subset = jsonData.slice(startRow);
            const result = EnhancedImportService.processRawJsonData(subset);
            if (result.length > 0) {
              return result;
            }
          } catch (e) {
            continue;
          }
        }
        
        throw new Error('No valid data found with any starting row');
      }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`🔄 Trying strategy ${i + 1}...`);
        const result = strategies[i]();
        
        if (Array.isArray(result) && result.length > 0) {
          // Validate that result has reasonable structure
          const firstRow = result[0];
          const keys = Object.keys(firstRow);
          
          if (keys.length >= 2 && keys.some(key => key && key.trim() !== '')) {
            console.log(`✅ Strategy ${i + 1} succeeded with ${result.length} rows`);
            return result;
          }
        }
      } catch (error) {
        console.log(`❌ Strategy ${i + 1} failed:`, error.message);
      }
    }
    
    throw new Error('All parsing strategies failed');
  },

  /**
   * Process raw JSON data with intelligent header detection
   */
  processRawJsonData: (jsonData) => {
    if (!Array.isArray(jsonData) || jsonData.length < 2) {
      throw new Error('Insufficient raw data');
    }
    
    // Find best header row (reuse logic from intelligent headers)
    let bestHeaderRow = -1;
    let maxScore = 0;
    
    for (let i = 0; i < Math.min(3, jsonData.length); i++) {
      const row = jsonData[i];
      if (!Array.isArray(row)) continue;
      
      const nonEmptyCount = row.filter(cell => 
        cell && cell.toString().trim()
      ).length;
      
      if (nonEmptyCount >= 2) {
        const score = nonEmptyCount;
        if (score > maxScore) {
          maxScore = score;
          bestHeaderRow = i;
        }
      }
    }
    
    if (bestHeaderRow === -1) {
      throw new Error('No valid header row found');
    }
    
    const headers = jsonData[bestHeaderRow];
    const data = [];
    
    for (let i = bestHeaderRow + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!Array.isArray(row)) continue;
      
      const rowData = {};
      let hasData = false;
      
      headers.forEach((header, index) => {
        const value = row[index] ? row[index].toString().trim() : '';
        rowData[header] = value;
        if (value) hasData = true;
      });
      
      if (hasData) {
        data.push(rowData);
      }
    }
    
    return data;
  },

  /**
   * Validate parsed data quality
   */
  validateParsedData: (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return { valid: false, reason: 'No data found' };
    }
    
    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    if (keys.length < 2) {
      return { valid: false, reason: 'Insufficient columns' };
    }
    
    const nonEmptyKeys = keys.filter(key => key && key.trim() !== '');
    if (nonEmptyKeys.length < 2) {
      return { valid: false, reason: 'No valid column headers' };
    }
    
    // Check if at least 50% of rows have some data
    const rowsWithData = data.filter(row => {
      return Object.values(row).some(value => value && value.toString().trim() !== '');
    });
    
    if (rowsWithData.length < data.length * 0.5) {
      return { valid: false, reason: 'Too many empty rows' };
    }
    
    return { valid: true, reason: 'Data appears valid' };
  }
};

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedImportService;
}
