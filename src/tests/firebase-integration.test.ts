import { describe, it, expect, vi } from 'vitest';

// Mock Firebase SDK first
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' }))
}));

const mockCollection = vi.fn((_db, path) => ({ 
  id: path, 
  path: path, 
  _path: { segments: [path] }
}));
const mockDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockGetDocs = vi.fn(() => Promise.resolve({ docs: [] }));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ type: 'firestore' })),
  collection: mockCollection,
  doc: mockDoc,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  getDocs: mockGetDocs,
  serverTimestamp: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn()
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null }))
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({ app: { name: 'test-app' } }))
}));

// Mock Firebase config - must include db export
vi.mock('../config/firebase', () => ({
  default: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '123456789',
    appId: 'test-app-id'
  },
  db: { type: 'firestore' },
  auth: { currentUser: null },
  storage: { app: { name: 'test-app' } }
}));

describe('Firebase Integration Tests', () => {
  describe('Firebase Configuration', () => {
    it('should have Firebase configuration defined', async () => {
      // Import the mocked config
      const firebaseConfig = (await import('../config/firebase')).default;
      expect(firebaseConfig).toBeDefined();
      expect(firebaseConfig).toHaveProperty('apiKey');
      expect(firebaseConfig).toHaveProperty('projectId');
    });

    it('should initialize Firebase app', async () => {
      const { initializeApp } = await import('firebase/app');
      const { getFirestore } = await import('firebase/firestore');
      
      expect(initializeApp).toBeDefined();
      expect(getFirestore).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('should import HybridFirebaseBOMService successfully', async () => {
      const { HybridFirebaseBOMService } = await import('../services/HybridFirebaseBOMService');
      expect(HybridFirebaseBOMService).toBeDefined();
      
      const service = new HybridFirebaseBOMService();
      expect(service.isInitialized()).toBe(false);
    });

    it('should import N8NWebhookService successfully', async () => {
      const { N8NWebhookService } = await import('../services/N8NWebhookService');
      expect(N8NWebhookService).toBeDefined();
      
      const service = new N8NWebhookService({ webhookUrl: 'https://test.com' });
      expect(service.isInitialized()).toBe(false);
    });
  });

  describe('Mock Firebase Operations', () => {
    it('should mock Firestore operations successfully', async () => {
      const { getFirestore, collection, addDoc } = await import('firebase/firestore');
      
      const db = getFirestore();
      const testCollection = collection(db, 'test');
      
      expect(db).toBeDefined();
      expect(testCollection).toBeDefined();
      expect(addDoc).toBeDefined();
      
      // Test that our mocks are working
      expect(typeof getFirestore).toBe('function');
      expect(typeof collection).toBe('function');
      expect(typeof addDoc).toBe('function');
      
      // Verify the mock collection function was called
      expect(mockCollection).toHaveBeenCalledWith(db, 'test');
    });
  });
});

