import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import type { FirebaseApp } from 'firebase/app'
import type { Firestore } from 'firebase/firestore'
import type { Auth } from 'firebase/auth'

// TODO: Replace with your Firebase config
// Get this from Firebase Console → Project Settings → General → Your Apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
}

// Initialize Firebase (only once)
let app: FirebaseApp
let db: Firestore
let auth: Auth

try {
  // Check if Firebase app already exists
  const existingApps = getApps()
  if (existingApps.length > 0) {
    app = existingApps[0]!
  } else {
    app = initializeApp(firebaseConfig)
  }
  db = getFirestore(app)
  auth = getAuth(app)
} catch (error) {
  console.error('Error initializing Firebase:', error)
  throw error
}

export { app, db, auth }

// Collection names
export const COLLECTIONS = {
  EVENTS: 'events',
  RESPONSES: 'responses',
  ADMIN_SETTINGS: 'adminSettings',
  DEALS: 'deals',
  PIPELINE_EVENTS: 'pipelineEvents',
  USERS: 'users',
  FUNCTIONS: 'functions'
} as const
