# BOM Generator - Azure Deployment Guide

## FREE Azure Static Web Apps Deployment

This guide shows you how to deploy your BOM Generator for **$0/month** using Azure's free tiers.

### What You Get FREE
- ✅ Frontend hosting (React app)
- ✅ API hosting (Python functions)
- ✅ SSL certificates
- ✅ Custom domains
- ✅ Authentication (Azure AD)
- ✅ 500MB bandwidth/month
- ✅ Global CDN

### Prerequisites
1. Azure account (free tier)
2. GitHub account
3. Your BOM Generator repository

### Step 1: Prepare Your Repository

Make sure your project structure looks like this:
```
BOM-Generator/
├── src/                    # React frontend
├── api/                    # Python API functions
├── staticwebapp.config.json # Already created
└── README.md
```

### Step 2: Create Azure Static Web App

1. **Go to Azure Portal**: https://portal.azure.com
2. **Create Resource** → Search "Static Web Apps"
3. **Fill in details**:
   - Subscription: Your subscription
   - Resource Group: Create new "rg-bom-generator"
   - Name: "cannasol-bom-generator"
   - Plan Type: **Free**
   - Region: Choose closest to you
   - Source: **GitHub**
   - GitHub Account: Connect your account
   - Repository: Select your BOM-Generator repo
   - Branch: main
   - Build Details:
     - Framework: **React**
     - App location: `/src`
     - API location: `/api`
     - Output location: `dist`

4. **Click "Review + Create"**

### Step 3: Configure Database Connection

1. **In Azure Portal**, go to your Static Web App
2. **Configuration** → **Application settings**
3. **Add new setting**:
   - Name: `AZURE_SQL_CONNECTION_STRING`
   - Value: Your Azure SQL connection string

### Step 4: Set up Azure SQL Database (FREE)

1. **Create Azure SQL Database**:
   - Service tier: **Basic** (5 DTU, 2GB) - $4.90/month
   - OR use **Serverless** tier - scales to zero, pay per use

2. **Connection String Format**:
```
Driver={ODBC Driver 18 for SQL Server};Server=tcp:your-server.database.windows.net,1433;Database=your-database;Uid=your-username;Pwd=your-password;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;
```

### Step 5: Update Your Frontend

Update your React app to call the new API endpoints:

```javascript
// src/services/api.js
const API_BASE = ''; // Empty for same-origin API calls

export const api = {
  async getInventory() {
    const response = await fetch('/api/inventory');
    return response.json();
  },
  
  async getInventoryItem(partNumber) {
    const response = await fetch(`/api/inventory/${partNumber}`);
    return response.json();
  },
  
  async getLowStock() {
    const response = await fetch('/api/inventory/low-stock');
    return response.json();
  },
  
  async getBOMTemplates() {
    const response = await fetch('/api/bom/templates');
    return response.json();
  },
  
  async checkBOMAvailability(bomId) {
    const response = await fetch(`/api/bom/${bomId}/availability`);
    return response.json();
  }
};
```

### Step 6: Deploy

1. **Push to GitHub**: Your changes will automatically trigger deployment
2. **Check deployment**: Go to GitHub Actions tab to see build status
3. **Access your app**: URL will be shown in Azure Portal

### Step 7: Custom Domain (Optional)

1. **In Azure Portal** → Your Static Web App → **Custom domains**
2. **Add domain**: Enter your domain (e.g., bom.cannasol.com)
3. **Follow DNS setup instructions**

## Alternative: If You Need More Power

If the free tier isn't enough, upgrade to:

### Azure Container Apps ($10-20/month)
- Use the FastAPI version instead
- Better database connection pooling
- More control over scaling
- Still very cost-effective

### Azure App Service Basic ($13/month)
- Dedicated compute
- Always-on availability
- More predictable performance

## Database Schema Setup

Run this SQL to create your tables:

```sql
-- Create tables for BOM Generator
CREATE TABLE inventory_items (
    part_number NVARCHAR(50) PRIMARY KEY,
    component_name NVARCHAR(200) NOT NULL,
    current_stock INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    inventory_value AS (current_stock * unit_cost),
    digikey_pn NVARCHAR(100),
    lead_time INT,
    status NVARCHAR(20) DEFAULT 'Unknown',
    supplier NVARCHAR(100),
    category NVARCHAR(100),
    last_updated DATETIME2 DEFAULT GETUTCDATE(),
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE bom_templates (
    bom_id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(1000),
    version NVARCHAR(20) DEFAULT '1.0',
    status NVARCHAR(20) DEFAULT 'draft',
    total_estimated_cost DECIMAL(15,2),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    created_by NVARCHAR(100) DEFAULT 'system'
);

CREATE TABLE bom_template_parts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    bom_id NVARCHAR(50) REFERENCES bom_templates(bom_id),
    part_number NVARCHAR(50),
    description NVARCHAR(500),
    category NVARCHAR(100),
    quantity_required INT NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost AS (quantity_required * unit_cost),
    supplier NVARCHAR(100),
    digikey_pn NVARCHAR(100),
    availability NVARCHAR(20) DEFAULT 'Unknown'
);

CREATE TABLE audit_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    action NVARCHAR(50) NOT NULL,
    entity_type NVARCHAR(20) NOT NULL,
    entity_id NVARCHAR(50) NOT NULL,
    details NVARCHAR(MAX),
    user_id NVARCHAR(100) DEFAULT 'system',
    success BIT DEFAULT 1,
    timestamp DATETIME2 DEFAULT GETUTCDATE()
);
```

## Monitoring and Maintenance

### View Logs
1. **Azure Portal** → Your Static Web App
2. **Functions** → Click on a function
3. **Monitor** → View execution logs

### Cost Monitoring
1. **Azure Portal** → **Cost Management + Billing**
2. Set up budget alerts
3. Monitor daily costs

### Backup Strategy
- Azure SQL automatic backups (7-35 days retention)
- Consider exporting important data periodically

## Troubleshooting

### Common Issues:
1. **API not working**: Check Application Settings for connection string
2. **Database connection fails**: Verify firewall rules allow Azure services
3. **Authentication issues**: Configure Azure AD in staticwebapp.config.json
4. **Build failures**: Check GitHub Actions logs

### Support Resources:
- Azure Static Web Apps docs: https://docs.microsoft.com/azure/static-web-apps/
- Azure SQL docs: https://docs.microsoft.com/azure/sql-database/

## Cost Summary

| Service | Free Tier | Small Business |
|---------|-----------|----------------|
| Static Web Apps | $0 | $0 |
| SQL Database | $0 (limited) | $5-25/month |
| **Total** | **$0/month** | **$5-25/month** |

Perfect for a 10-person company managing BOMs across 1-2 locations!
