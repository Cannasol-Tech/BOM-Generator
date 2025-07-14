// Test setup file
require('@testing-library/jest-dom');

global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock XLSX library
global.XLSX = {
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    sheet_to_csv: jest.fn(),
    decode_range: jest.fn()
  }
};

// Mock Firebase modules for testing
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({
    name: '[DEFAULT]',
    options: {}
  }))
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ isEqual: () => false })),
  onSnapshot: jest.fn(),
  connectFirestoreEmulator: jest.fn()
}));

// Global test utilities
global.mockBOMItem = {
  id: 1,
  partNumber: 'TEST-001',
  description: 'Test Component',
  itemName: 'Test Item',
  package: 'DIP-8',
  quantity: 10,
  unitCost: 1.50,
  supplier: 'Test Supplier',
  digikeyPN: 'TEST-DK-001',
  lcscPart: 'C123456',
  designator: 'U1',
  notes: 'Test notes'
};

global.mockFirebaseDoc = {
  id: 'test-doc-id',
  data: () => global.mockBOMItem,
  exists: () => true
};

global.mockFirebaseCollection = {
  docs: [global.mockFirebaseDoc],
  size: 1,
  empty: false
};
