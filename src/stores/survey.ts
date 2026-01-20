import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Event, Response, ResponseWithEvent, AdminSettings } from '@/types/survey'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'
import { hashPin } from '@/lib/surveyUtils'
import { DEFAULT_REVIEW_THRESHOLD, DEFAULT_WEBHOOK_URL } from '@/lib/surveyConstants'

export const useSurveyStore = defineStore('survey', () => {
  // State
  const events = ref<Event[]>([])
  const responses = ref<ResponseWithEvent[]>([])
  const adminSettings = ref<AdminSettings>({
    reviewThreshold: DEFAULT_REVIEW_THRESHOLD,
    googleReviewUrl: 'https://search.google.com/local/writereview',
    webhookUrl: DEFAULT_WEBHOOK_URL,
    adminPinHash: ''
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const responsesWithEvents = computed(() => {
    return responses.value.map(response => ({
      ...response,
      event: events.value.find(e => e.id === response.eventId)
    }))
  })

  // Actions
  async function loadEvents() {
    loading.value = true
    error.value = null
    try {
      const eventsSnapshot = await getDocs(
        query(collection(db, COLLECTIONS.EVENTS), orderBy('createdAt', 'desc'))
      )
      events.value = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Event[]
    } catch (err) {
      error.value = 'Failed to load events'
      console.error('Error loading events:', err)
    } finally {
      loading.value = false
    }
  }

  async function loadResponses() {
    loading.value = true
    error.value = null
    try {
      const responsesSnapshot = await getDocs(
        query(collection(db, COLLECTIONS.RESPONSES), orderBy('createdAt', 'desc'))
      )
      const responsesData = responsesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Response[]

      // Join with events
      responses.value = responsesData.map(response => ({
        ...response,
        event: events.value.find(e => e.id === response.eventId)
      }))
    } catch (err) {
      error.value = 'Failed to load responses'
      console.error('Error loading responses:', err)
    } finally {
      loading.value = false
    }
  }

  async function loadAdminSettings() {
    try {
      const settingsDoc = await getDoc(doc(db, COLLECTIONS.ADMIN_SETTINGS, 'config'))
      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        adminSettings.value = {
          reviewThreshold: data.reviewThreshold || DEFAULT_REVIEW_THRESHOLD,
          googleReviewUrl: data.googleReviewUrl || 'https://search.google.com/local/writereview',
          webhookUrl: data.webhookUrl || DEFAULT_WEBHOOK_URL,
          adminPinHash: data.adminPinHash || ''
        }
      }
    } catch (err) {
      console.error('Error loading admin settings:', err)
    }
  }

  async function loadAllData() {
    await loadEvents()
    await loadResponses()
    await loadAdminSettings()
  }

  async function createEvent(eventData: Omit<Event, 'id' | 'createdAt'>) {
    try {
      await addDoc(collection(db, COLLECTIONS.EVENTS), {
        ...eventData,
        createdAt: new Date()
      })
      await loadEvents()
    } catch (err) {
      error.value = 'Failed to create event'
      console.error('Error creating event:', err)
      throw err
    }
  }

  async function deleteEvent(eventId: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.EVENTS, eventId))
      await loadEvents()
    } catch (err) {
      error.value = 'Failed to delete event'
      console.error('Error deleting event:', err)
      throw err
    }
  }

  async function submitSurvey(responseData: Omit<Response, 'id' | 'createdAt'>) {
    try {
      await addDoc(collection(db, COLLECTIONS.RESPONSES), {
        ...responseData,
        createdAt: new Date()
      })
    } catch (err) {
      error.value = 'Failed to submit survey'
      console.error('Error submitting survey:', err)
      throw err
    }
  }

  async function updateAdminSettings(settings: Partial<AdminSettings>) {
    try {
      await updateDoc(doc(db, COLLECTIONS.ADMIN_SETTINGS, 'config'), settings)
      adminSettings.value = { ...adminSettings.value, ...settings }
    } catch (err) {
      error.value = 'Failed to update settings'
      console.error('Error updating settings:', err)
      throw err
    }
  }

  async function initializeAdmin() {
    const settingsDoc = await getDoc(doc(db, COLLECTIONS.ADMIN_SETTINGS, 'config'))
    if (!settingsDoc.exists()) {
      // Create default admin settings
      const defaultPinHash = await hashPin('1234')
      await updateDoc(doc(db, COLLECTIONS.ADMIN_SETTINGS, 'config'), {
        adminPinHash: defaultPinHash,
        reviewThreshold: DEFAULT_REVIEW_THRESHOLD,
        googleReviewUrl: 'https://search.google.com/local/writereview',
        webhookUrl: DEFAULT_WEBHOOK_URL
      })
    }
  }

  return {
    // State
    events,
    responses,
    adminSettings,
    loading,
    error,
    // Computed
    responsesWithEvents,
    // Actions
    loadEvents,
    loadResponses,
    loadAdminSettings,
    loadAllData,
    createEvent,
    deleteEvent,
    submitSurvey,
    updateAdminSettings,
    initializeAdmin
  }
})
