// N8N Webhook Service
// Implements N8N webhook integration for BOM processing

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
}

export interface N8NWebhookConfig {
  webhookUrl: string;
  secret?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface BOMSaveResponse {
  success: boolean;
  bomId?: string;
  message?: string;
  error?: string;
}

export class N8NWebhookService {
  private config: N8NWebhookConfig;
  private initialized = false;

  constructor(config: N8NWebhookConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      retryAttempts: 3,
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      // Validate webhook configuration
      if (!this.config.webhookUrl) {
        throw new Error('Webhook URL is required');
      }

      // Test connection to webhook
      const isReachable = await this.testConnection();
      if (!isReachable) {
        throw new Error('Unable to reach N8N webhook endpoint');
      }

      this.initialized = true;
      console.log('✅ N8N Webhook Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize N8N Webhook Service:', error);
      this.initialized = false;
      throw error;
    }
  }

  async sendWebhook(payload: WebhookPayload): Promise<any> {
    if (!this.initialized) {
      throw new Error('N8N Webhook Service not initialized');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Cannasol-BOM-Generator/1.0'
    };

    // Add secret header if configured
    if (this.config.secret) {
      headers['X-N8N-Secret'] = this.config.secret;
    }

    const requestOptions: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout || 30000)
    };

    let lastError: Error | null = null;
    
    // Retry logic
    for (let attempt = 1; attempt <= (this.config.retryAttempts || 3); attempt++) {
      try {
        console.log(`🚀 Sending webhook to N8N (attempt ${attempt}):`, payload.event);
        
        const response = await fetch(this.config.webhookUrl, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log('✅ Webhook sent successfully:', responseData);
        return responseData;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ Webhook attempt ${attempt} failed:`, lastError.message);
        
        // Don't retry on certain errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          break; // Network error, don't retry
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < (this.config.retryAttempts || 3)) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to send webhook after ${this.config.retryAttempts || 3} attempts: ${lastError?.message}`);
  }

  async sendBOMSave(bomData: any): Promise<BOMSaveResponse> {
    try {
      const payload: WebhookPayload = {
        event: 'bom_save',
        data: {
          bom: bomData,
          source: 'bom-generator',
          version: '1.0'
        },
        timestamp: new Date()
      };

      const response = await this.sendWebhook(payload);
      
      return {
        success: true,
        bomId: response.bomId || response.id,
        message: response.message || 'BOM saved successfully'
      };
    } catch (error) {
      console.error('❌ Failed to save BOM via webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async sendBOMUpdate(bomId: string, bomData: any): Promise<BOMSaveResponse> {
    try {
      const payload: WebhookPayload = {
        event: 'bom_update',
        data: {
          bomId,
          bom: bomData,
          source: 'bom-generator',
          version: '1.0'
        },
        timestamp: new Date()
      };

      const response = await this.sendWebhook(payload);
      
      return {
        success: true,
        bomId: response.bomId || bomId,
        message: response.message || 'BOM updated successfully'
      };
    } catch (error) {
      console.error('❌ Failed to update BOM via webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async sendInventoryUpdate(inventoryData: any): Promise<any> {
    try {
      const payload: WebhookPayload = {
        event: 'inventory_update',
        data: {
          inventory: inventoryData,
          source: 'bom-generator',
          version: '1.0'
        },
        timestamp: new Date()
      };

      return await this.sendWebhook(payload);
    } catch (error) {
      console.error('❌ Failed to send inventory update:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const testPayload: WebhookPayload = {
        event: 'connection_test',
        data: {
          source: 'bom-generator',
          message: 'Testing N8N webhook connectivity'
        },
        timestamp: new Date()
      };

      // Create a test request with shorter timeout
      const testRequestOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cannasol-BOM-Generator/1.0'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(5000) // 5 second timeout for test
      };

      if (this.config.secret) {
        (testRequestOptions.headers as Record<string, string>)['X-N8N-Secret'] = this.config.secret;
      }

      const response = await fetch(this.config.webhookUrl, testRequestOptions);
      
      // Consider 2xx and 404 as successful (webhook might not handle test events)
      return response.status >= 200 && response.status < 300 || response.status === 404;
    } catch (error) {
      console.warn('⚠️ Webhook connectivity test failed:', error);
      return false;
    }
  }

  async getWebhookStatus(): Promise<{ connected: boolean; lastTest: Date }> {
    const connected = await this.testConnection();
    return {
      connected,
      lastTest: new Date()
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getConfig(): Omit<N8NWebhookConfig, 'secret'> {
    const { secret, ...config } = this.config;
    return config;
  }

  updateConfig(newConfig: Partial<N8NWebhookConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initialized = false; // Require re-initialization
  }
}

export default N8NWebhookService;
