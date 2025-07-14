import { describe, it, expect, vi } from 'vitest';

// Mock Firebase config
vi.mock('../config/firebase', () => ({
  default: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '123456789',
    appId: 'test-app-id'
  }
}));

// Mock Firebase SDK
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' }))
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ type: 'firestore' })),
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn()
}));

describe('Firebase Integration Tests', () => {
  describe('Firebase Configuration', () => {
    it('should have Firebase configuration defined', async () => {
      // Import the mocked config
      const firebaseConfig = (await import('../config/firebase')).default;
      expect(firebaseConfig).toBeDefined();
      expect(firebaseConfig.apiKey).toBeDefined();
      expect(firebaseConfig.projectId).toBeDefined();
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
      const mockCollection = collection(db, 'test');
      
      expect(db).toBeDefined();
      expect(mockCollection).toBeDefined();
      expect(addDoc).toBeDefined();
      
      // Test that our mocks are working
      expect(typeof getFirestore).toBe('function');
      expect(typeof collection).toBe('function');
      expect(typeof addDoc).toBe('function');
    });
  });
});

