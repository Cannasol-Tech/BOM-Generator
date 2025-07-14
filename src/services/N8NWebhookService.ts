/**
 * N8N Webhook Service
 * 
 * Handles communication with n8n automation workflows
 * n8n will handle BOM storage to Firebase
 */

interface BOMWebhookData {
  bomId: string;
  bomName: string;
  requestedBy: string;
  bomData: {
    parts: Array<{
      partNumber: string;
      description: string;
      quantityRequired: number;
      unitCost: number;
      totalCost: number;
      supplier?: string;
      digikeyPN?: string;
      lcscPart?: string;
      designator?: string;
      notes?: string;
    }>;
    summary: {
      totalParts: number;
      totalCost: number;
      partsAvailable: number;
      partsMissing: number;
    };
  };
}

interface N8NResponse {
  success: boolean;
  bomId?: string;
  message?: string;
  error?: string;
}

class N8NWebhookService {
  private webhookUrl: string;
  
  constructor() {
    // Get webhook URL from environment variables
    this.webhookUrl = (import.meta as any).env?.VITE_N8N_WEBHOOK_URL || 'https://your-n8n-instance.com/webhook/bom-test';
  }

  /**
   * Send BOM data to n8n webhook for processing and storage
   */
  async sendBOMToAutomation(bomData: {
    bomId?: string;
    bomName: string;
    parts: any[];
    requestedBy?: string;
  }): Promise<N8NResponse> {
    try {
      // Calculate summary data
      const summary = this.calculateBOMSummary(bomData.parts);
      
      // Prepare webhook payload
      const webhookPayload: BOMWebhookData = {
        bomId: bomData.bomId || `bom-${Date.now()}`,
        bomName: bomData.bomName,
        requestedBy: bomData.requestedBy || 'bom-app-user@cannasol.com',
        bomData: {
          parts: bomData.parts.map(part => ({
            partNumber: part.partNumber,
            description: part.description || part.itemName,
            quantityRequired: part.quantity,
            unitCost: part.unitCost,
            totalCost: part.quantity * part.unitCost,
            supplier: part.supplier,
            digikeyPN: part.digikeyPN,
            lcscPart: part.lcscPart,
            designator: part.designator,
            notes: part.notes
          })),
          summary
        }
      };

      console.log('Sending BOM to n8n:', webhookPayload);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json() as N8NResponse;
      console.log('n8n Response:', result);
      
      return {
        success: true,
        bomId: result.bomId || webhookPayload.bomId,
        message: result.message || 'BOM sent successfully'
      };

    } catch (error) {
      console.error('Error sending BOM to n8n:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Test the n8n webhook connection
   */
  async testConnection(): Promise<N8NResponse> {
    const testBOM = {
      bomId: "bom-app-test-001",
      bomName: "BOM App Integration Test",
      parts: [
        {
          partNumber: "CT-IAS-001",
          description: "ACE 1630c PLC",
          quantity: 1,
          unitCost: 95.00,
          supplier: "TBD"
        }
      ]
    };

    return this.sendBOMToAutomation(testBOM);
  }

  /**
   * Calculate BOM summary statistics
   */
  private calculateBOMSummary(parts: any[]) {
    const totalParts = parts.length;
    const totalCost = parts.reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);
    
    // For now, assume all parts are available - this would be enhanced with inventory checking
    const partsAvailable = totalParts;
    const partsMissing = 0;

    return {
      totalParts,
      totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
      partsAvailable,
      partsMissing
    };
  }

  /**
   * Set custom webhook URL (for testing or different environments)
   */
  setWebhookUrl(url: string): void {
    this.webhookUrl = url;
  }

  /**
   * Get current webhook URL
   */
  getWebhookUrl(): string {
    return this.webhookUrl;
  }
}

export default N8NWebhookService;
export type { BOMWebhookData, N8NResponse };
