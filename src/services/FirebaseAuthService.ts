import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export class FirebaseAuthService {
  private static instance: FirebaseAuthService;
  private googleProvider: GoogleAuthProvider;

  private constructor() {
    this.googleProvider = new GoogleAuthProvider();
  }

  static getInstance(): FirebaseAuthService {
    if (!FirebaseAuthService.instance) {
      FirebaseAuthService.instance = new FirebaseAuthService();
    }
    return FirebaseAuthService.instance;
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return this.userToAuthUser(result.user);
  }

  // Create account with email and password
  async createAccount(email: string, password: string, displayName?: string): Promise<AuthUser> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    
    return this.userToAuthUser(result.user);
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<AuthUser> {
    const result = await signInWithPopup(auth, this.googleProvider);
    return this.userToAuthUser(result.user);
  }

  // Sign out
  async signOut(): Promise<void> {
    await signOut(auth);
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    const user = auth.currentUser;
    return user ? this.userToAuthUser(user) : null;
  }

  // Listen for auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      callback(user ? this.userToAuthUser(user) : null);
    });
  }

  // Convert Firebase User to AuthUser
  private userToAuthUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  }
}

// Export singleton instance
export const firebaseAuthService = FirebaseAuthService.getInstance();
