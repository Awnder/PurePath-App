import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where, GeoPoint, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

// Define user profile interface
export interface UserProfile {
  id: string;
  username?: string;
  email?: string;
  location?: GeoPoint;
  role?: 'admin' | 'member';
  joinedAt?: Timestamp;
  streakDays?: number;
  lastCheckIn?: Timestamp;
}

// Firebase configuration with provided credentials
const firebaseConfig = {
  apiKey: "AIzaSyBSUhzRzywLJBBJLECv8bIpmEKKM--uaJ8",
  authDomain: "purepath-cd3bd.firebaseapp.com",
  projectId: "purepath-cd3bd",
  storageBucket: "purepath-cd3bd.appspot.com", // Fixed storage bucket URL
  messagingSenderId: "642958711026",
  appId: "1:642958711026:web:89f31bb19487fba76b986b",
  measurementId: "G-MSC58HV9T2"
};

console.log("Firebase config:", firebaseConfig);

// Initialize Firebase with better error handling
let app, auth, db;
try {
  console.log("Initializing Firebase app...");
  app = initializeApp(firebaseConfig);
  console.log("Firebase app initialized successfully");
  
  console.log("Initializing Firebase auth...");
  auth = getAuth(app);
  console.log("Firebase auth initialized successfully");
  
  console.log("Initializing Firestore...");
  db = getFirestore(app);
  console.log("Firestore initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export { app, auth, db };

// Auth functions with conditional checks to prevent errors
export const login = async (email: string, password: string) => {
  if (!auth) {
    console.error("Firebase auth not initialized");
    toast.error('Firebase not configured. Please add your Firebase credentials in environment variables.');
    return false;
  }
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    toast.success('Welcome back to PurePath');
    return true;
  } catch (error: any) {
    toast.error('Login failed: ' + error.message);
    return false;
  }
};

export const register = async (email: string, password: string, username: string, location?: { lat: number, lng: number }) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      username,
      email,
      location: location ? new GeoPoint(location.lat, location.lng) : null,
      role: 'member', // Default role
      joinedAt: Timestamp.now(),
      streakDays: 0,
      lastCheckIn: Timestamp.now()
    });
    
    toast.success('Welcome to PurePath');
    return true;
  } catch (error: any) {
    toast.error('Registration failed: ' + error.message);
    return false;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    toast.success('You have been logged out');
    return true;
  } catch (error: any) {
    toast.error('Logout failed: ' + error.message);
    return false;
  }
};

// User data functions
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!db) {
    console.error("Firebase db not initialized");
    return { id: userId };
  }
  
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    } else {
      return { id: userId };
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { id: userId };
  }
};

export const checkUserRole = async (userId: string): Promise<'admin' | 'member' | null> => {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile?.role as 'admin' | 'member' | null;
  } catch (error) {
    console.error('Error checking user role:', error);
    return null;
  }
};

// Streaks and check-ins
export const updateStreak = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const lastCheckIn = userData.lastCheckIn?.toDate() || new Date(0);
      const now = new Date();
      
      // Check if the last check-in was yesterday (maintaining streak)
      const isYesterday = 
        lastCheckIn.getDate() === now.getDate() - 1 && 
        lastCheckIn.getMonth() === now.getMonth() && 
        lastCheckIn.getFullYear() === now.getFullYear();
        
      // Check if already checked in today
      const isToday = 
        lastCheckIn.getDate() === now.getDate() && 
        lastCheckIn.getMonth() === now.getMonth() && 
        lastCheckIn.getFullYear() === now.getFullYear();
      
      if (isToday) {
        return { success: true, streakDays: userData.streakDays, message: 'Already checked in today' };
      }
      
      let streakDays = userData.streakDays || 0;
      
      if (isYesterday) {
        // Maintain streak
        streakDays += 1;
      } else if (!isToday) {
        // Reset streak if more than a day has been missed
        streakDays = 1;
      }
      
      // Update user data
      await updateDoc(userRef, {
        lastCheckIn: Timestamp.now(),
        streakDays
      });
      
      return { success: true, streakDays, message: 'Streak updated successfully' };
    }
    
    return { success: false, message: 'User not found' };
  } catch (error: any) {
    console.error('Error updating streak:', error);
    return { success: false, message: error.message };
  }
};

// Log relapse (used for analytics)
export const logRelapse = async (userId: string, notes?: string) => {
  try {
    await setDoc(doc(collection(db, 'relapses')), {
      userId,
      timestamp: Timestamp.now(),
      notes: notes || ''
    });
    
    // Reset streak
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      streakDays: 0,
      lastCheckIn: Timestamp.now()
    });
    
    return { success: true, message: 'Progress reset. Remember: every moment is a new opportunity.' };
  } catch (error: any) {
    console.error('Error logging relapse:', error);
    return { success: false, message: error.message };
  }
};

// Community map data (anonymized)
export const getCommunityLocations = async () => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const locations: { id: string; location: GeoPoint }[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.location) {
        // Only include location data, not user identifiable information
        locations.push({
          id: doc.id,
          location: data.location
        });
      }
    });
    
    return locations;
  } catch (error) {
    console.error('Error fetching community locations:', error);
    return [];
  }
};

export default app;
