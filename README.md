# Cannasol BOM Generator

A modern, browser-based Bill of Materials (BOM) management system built for Cannasol Technologies. Features electronic component tracking, DigiKey integration, and cost analysis - all running locally in your browser with no server required!

## 🚀 Features

- **📋 Interactive BOM Management** - Click-to-edit spreadsheet interface
- **🔗 DigiKey Integration** - Direct product links and CSV export for ordering
- **💰 Cost Analysis** - Real-time cost calculations and summaries
- **💾 Local Storage** - Data saved in browser, no server required
- **📊 Analytics Dashboard** - Visual cost breakdowns and supplier analysis
- **📱 Responsive Design** - Works on desktop, tablet, and mobile
- **🚀 Fast Deployment** - Deploy for free on Netlify, Vercel, or GitHub Pages

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Testing**: Vitest + Testing Library
- **CI/CD**: GitHub Actions
- **Deployment**: Netlify (recommended)

## 🧪 Testing & CI/CD

[![Test Suite](https://github.com/Cannasol-Tech/BOM-Generator/actions/workflows/test.yml/badge.svg)](https://github.com/Cannasol-Tech/BOM-Generator/actions/workflows/test.yml)

This project includes a comprehensive GitHub Actions pipeline that automatically:

- **🔍 Tests**: Runs on Node.js 18.x and 20.x
- **📊 Coverage**: Generates detailed code coverage reports
- **🔧 Linting**: ESLint code quality checks
- **📝 Type Checking**: TypeScript validation
- **🏗️ Build Validation**: Ensures deployable builds
- **🔒 Security**: npm audit for vulnerabilities
- **📱 PR Integration**: Automatic test results in pull requests
- **🚨 Error Analysis**: Detailed failure reports and auto-issue creation

### Running Tests Locally

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

For more details, see [GitHub Actions Documentation](./docs/github-actions.md).

## 🚀 Quick Deploy to Netlify (Free)

### Method 1: GitHub Integration (Recommended)

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add build configuration for deployment"
   git push origin main
   ```

2. **Deploy to Netlify**:
   - Go to [netlify.com](https://netlify.com) and sign up/login
   - Click "New site from Git" 
   - Choose GitHub and authorize Netlify
   - Select your repository
   - Build settings will auto-detect:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   - Click "Deploy site"

3. **Custom Domain** (optional):
   - In Netlify dashboard, go to Site settings > Domain management
   - Add your custom domain or use the provided `.netlify.app` URL

### Method 2: Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and Deploy**:
   ```bash
   npm install
   npm run build
   npx netlify deploy --prod --dir=dist
   ```

### Method 3: Drag & Drop

1. **Build the project**:
   ```bash
   npm install
   npm run build
   ```

2. **Manual Deploy**:
   - Go to [netlify.com](https://netlify.com)
   - Drag the `dist` folder to the deploy area

## 🛠️ Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open browser**: http://localhost:3000

4. **Build for production**:
   ```bash
   npm run build
   ```

## 📋 Usage

### Basic BOM Management
- **Add Items**: Click "Add Item" to create new BOM entries
- **Edit Values**: Click any cell to edit directly
- **Delete Items**: Use the delete button in the Actions column
- **Auto-Calculate**: Extended costs update automatically

### DigiKey Integration
- **Add DigiKey P/N**: Click to edit the DigiKey part number field
- **Export CSV**: Use the DigiKey button to download order-ready CSV
- **Bulk Order**: Open DigiKey myLists for bulk ordering
- **Product Links**: Click external link icons to view parts on DigiKey

### Data Management
- **Auto-Save**: Data automatically saves to browser localStorage
- **Export**: Download JSON backup files
- **Import**: Upload JSON files to restore data
- **Persistence**: Data persists between browser sessions

## 🚀 Deployment Options

### Netlify (Recommended)
- ✅ Free tier available
- ✅ Automatic builds from Git
- ✅ Custom domains
- ✅ CDN included

### Vercel
```bash
npm install -g vercel
vercel --prod
```

### GitHub Pages
```bash
npm run build
# Deploy dist folder to gh-pages branch
```

## 🆘 Quick Deploy Command

```bash
npm install && npm run build && npx netlify deploy --prod --dir=dist
```

## 🏢 About

Built by Cannasol Technologies for modern manufacturing and electronics development workflows. 
