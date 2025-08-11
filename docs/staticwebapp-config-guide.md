# staticwebapp.config.json Documentation

This file configures routing and authentication for the Azure Static Web Apps deployment.

## Routes Configuration

| Route | Access Level | Purpose |
|-------|-------------|---------|
| `/api/health` | **Anonymous** | Public health check endpoint - no authentication required |
| `/api/inventory` | **Authenticated** | Main inventory list endpoint - requires user login |
| `/api/inventory/*` | **Authenticated** | All inventory sub-routes (get item, update stock, etc.) |
| `/api/bom/*` | **Authenticated** | All BOM operations (templates, availability checks, etc.) |

## Authentication Flow

1. **Unauthenticated user** tries to access `/api/inventory`
2. **Gets 401 response** 
3. **Automatically redirected** to `/.auth/login/aad` (Azure AD login)
4. **After login**, redirected back to original page

## Navigation Fallback

- **All frontend routes** (like `/inventory`, `/bom`) serve `/index.html`
- **Enables React Router** to handle client-side routing

## Azure AD Configuration

Requires these environment variables in Azure Portal:
- `AZURE_CLIENT_ID` - Your Azure AD App Registration Client ID
- `AZURE_CLIENT_SECRET` - Your Azure AD App Registration Secret
- Replace `{tenant-id}` with your actual Azure AD tenant ID

## Security Notes

- **Health endpoint is public** - useful for monitoring/uptime checks
- **All business data requires authentication** - protects sensitive inventory/BOM data
- **HTTPS enforced** - all traffic encrypted
- **Azure AD integration** - enterprise-grade authentication
