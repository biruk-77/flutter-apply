import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

// The collection name in Firestore
const COLLECTION_NAME = 'users';
const LOCAL_STORAGE_PREFIX = 'flutter_apply_profile_';

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  let profile: UserProfile | null = null;

  // 1. Try to fetch from Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      profile = docSnap.data() as UserProfile;
    }
  } catch (error: any) {
    // Permission denied or other Firestore errors
    console.warn("Firestore fetch warning (using local fallback):", error.message);
  }

  // 2. If no profile found in DB (or DB failed), check LocalStorage
  if (!profile) {
    try {
      const localData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${userId}`);
      if (localData) {
        profile = JSON.parse(localData) as UserProfile;
        console.log("Loaded profile from local storage.");
      }
    } catch (e) {
      console.error("Failed to parse local profile", e);
    }
  }

  return profile;
};

export const saveUserProfile = async (userId: string, profile: UserProfile): Promise<void> => {
  // 1. Always save to LocalStorage first for resilience
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${userId}`, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save to local storage", e);
  }

  // 2. Try to sync with Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    // setDoc with merge: true ensures we don't overwrite fields if we add more later
    await setDoc(docRef, profile, { merge: true });
  } catch (error: any) {
    // We re-throw so the UI knows something went wrong with the CLOUD sync
    // The data is safe locally, but the user needs to know sync failed.
    
    // Check specifically for permission errors to give a better message
    if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
       console.warn("Cloud sync skipped: Firestore Security Rules blocked the write.");
       throw new Error("Firestore Rules blocked write. Update rules in Console.");
    }
    
    console.warn("Firestore save failed:", error.message);
    throw new Error("Cloud Sync Failed: " + error.message);
  }
};