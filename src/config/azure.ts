// Azure Free Tier Configuration
// 100% FREE Azure services configuration

export interface AzureEnvironmentConfig {
  // Azure AD B2C Configuration (FREE - 50k users)
  auth: {
    tenantId: string;
    clientId: string;
    authority: string;
    knownAuthorities: string[];
    redirectUri: string;
  };

  // Existing Database Configuration (FREE - use your existing database)
  database: {
    type: 'sql' | 'mysql' | 'postgresql' | 'mongodb';
    connectionString: string;
    inventoryTable: string;
    bomTemplatesTable: string;
    bomItemsTable: string;
  };
}

// Azure configuration from environment variables
const azureConfig: AzureEnvironmentConfig = {
  auth: {
    tenantId: import.meta.env.VITE_AZURE_TENANT_ID || 'your-tenant-id',
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || 'your-client-id',
    authority: `https://your-tenant.b2clogin.com/your-tenant.onmicrosoft.com/B2C_1_signupsignin`,
    knownAuthorities: [`your-tenant.b2clogin.com`],
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin
  },

  database: {
    type: (import.meta.env.VITE_DB_TYPE as any) || 'sql',
    connectionString: import.meta.env.VITE_DB_CONNECTION_STRING || 'your-existing-database-connection',
    inventoryTable: import.meta.env.VITE_DB_INVENTORY_TABLE || 'inventory_items',
    bomTemplatesTable: import.meta.env.VITE_DB_BOM_TEMPLATES_TABLE || 'bom_templates',
    bomItemsTable: import.meta.env.VITE_DB_BOM_ITEMS_TABLE || 'bom_items'
  }
};

export default azureConfig;

// Azure Free Tier Limits (for reference)
export const AZURE_FREE_TIER_LIMITS = {
  staticWebApps: {
    bandwidth: '100 GB/month',
    storage: '0.5 GB',
    customDomains: 2
  },
  adB2C: {
    users: '50,000 monthly active users',
    authentications: 'Unlimited'
  }
};

// Cost tracking (all FREE!)
export const AZURE_MONTHLY_COSTS = {
  staticWebApps: 0,
  adB2C: 0,
  existingDatabase: 0,
  total: 0
};

console.log('📇 Azure Free Tier Configuration Loaded');
console.log('💲 Estimated monthly cost: $0 (100% FREE)');