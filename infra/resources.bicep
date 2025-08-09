@description('The location used for all deployed resources')
param location string = resourceGroup().location

@description('Tags that will be applied to all resources')
param tags object = {}

@description('Id of the user or app to assign application roles')
param principalId string

@description('Principal type of user or app')
param principalType string

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = uniqueString(subscription().id, resourceGroup().id, location)

// Create Azure Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2024-04-01' = {
  name: '${abbrs.webStaticSites}bom-generator-${resourceToken}'
  location: location
  tags: union(tags, { 'azd-service-name': 'bom-generator' })
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: 'https://github.com/Cannasol-Tech/BOM-Generator'
    branch: 'main'
    buildProperties: {
      appLocation: '/'
      apiLocation: ''
      outputLocation: 'dist'
      appBuildCommand: 'npm run build'
      skipGithubActionWorkflowGeneration: false
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'GitHub'
    enterpriseGradeCdnStatus: 'Disabled'
    publicNetworkAccess: 'Enabled'
  }
}

// Output the Static Web App details
@description('The name of the Static Web App')
output STATIC_WEB_APP_NAME string = staticWebApp.name

@description('The default hostname of the Static Web App')
output STATIC_WEB_APP_URL string = 'https://${staticWebApp.properties.defaultHostname}'

@description('The resource ID of the Static Web App')
output STATIC_WEB_APP_RESOURCE_ID string = staticWebApp.id
