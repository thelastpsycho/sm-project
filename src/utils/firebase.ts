import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, signInAnonymously } from 'firebase/auth'

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const analytics = getAnalytics(app)
const auth = getAuth(app)

export const ensureAuth = async () => {
    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth)
        } catch (error) {
            console.error("Error signing in anonymously:", error)
            throw error
        }
    }
    return auth.currentUser
}

export { db, analytics, auth }
