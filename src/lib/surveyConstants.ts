import type { EventLanguage, SurveyQuestion, LikertOption, UIText, ValidationMessages } from '@/types/survey'

export const surveyQuestions: Record<EventLanguage, SurveyQuestion[]> = {
  en: [
    { id: 'q1', question: 'How would you rate your overall experience at The ANVAYA Beach Resort Bali?', type: 'rating' },
    { id: 'q2', question: 'How satisfied were you with your room (comfort, cleanliness, and amenities)?', type: 'rating' },
    { id: 'q3', question: 'How satisfied were you with our food & beverage experience (quality and service)?', type: 'rating' },
    { id: 'q4', question: 'How satisfied were you with the event experience?', type: 'rating' },
    { id: 'q5', question: 'How would you rate the friendliness and attentiveness of our team?', type: 'rating' },
    { id: 'q6', question: 'How likely are you to recommend The ANVAYA Beach Resort Bali to others?', type: 'rating' },
    { id: 'q7', question: 'What did you enjoy most during your stay or visit?', type: 'text' },
    { id: 'q8', question: 'Is there anything we could improve for your next visit?', type: 'text' }
  ],
  id: [
    { id: 'q1', question: 'Bagaimana penilaian Anda tentang pengalaman secara keseluruhan di The ANVAYA Beach Resort Bali?', type: 'rating' },
    { id: 'q2', question: 'Seberapa puasakah Anda dengan kamar Anda (kenyamanan, kebersihan, dan fasilitas)?', type: 'rating' },
    { id: 'q3', question: 'Seberapa puasakah Anda dengan pengalaman makanan dan minuman kami (kualitas dan pelayanan)?', type: 'rating' },
    { id: 'q4', question: 'Seberapa puasakah Anda dengan pengalaman acara?', type: 'rating' },
    { id: 'q5', question: 'Bagaimana penilaian Anda tentang keramahan dan perhatian tim kami?', type: 'rating' },
    { id: 'q6', question: 'Seberapa besar kemungkinan Anda akan merekomendasikan The ANVAYA Beach Resort Bali kepada orang lain?', type: 'rating' },
    { id: 'q7', question: 'Apa yang paling Anda nikmati selama menginap atau berkunjung?', type: 'text' },
    { id: 'q8', question: 'Adakah yang bisa kami tingkatkan untuk kunjungan Anda berikutnya?', type: 'text' }
  ]
}

export const likertOptions: Record<EventLanguage, LikertOption[]> = {
  en: [
    { value: 1, label: 'Poor' },
    { value: 2, label: 'Fair' },
    { value: 3, label: 'Good' },
    { value: 4, label: 'Very Good' },
    { value: 5, label: 'Excellent' }
  ],
  id: [
    { value: 1, label: 'Buruk' },
    { value: 2, label: 'Cukup' },
    { value: 3, label: 'Baik' },
    { value: 4, label: 'Sangat Baik' },
    { value: 5, label: 'Luar Biasa' }
  ]
}

export const uiText: Record<EventLanguage, UIText> = {
  en: {
    welcomeTitle: 'Welcome to Our Survey',
    welcomeDescription: 'Please provide your information before proceeding to the survey.',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    emailAddress: 'Email Address',
    emailAddressPlaceholder: 'Enter your email address',
    role: 'Role',
    roleParticipant: 'Participant',
    roleOrganizer: 'Organizer',
    roleSpeaker: 'Speaker',
    next: 'Next',
    rateYourExperience: 'RATE YOUR EXPERIENCE',
    yourFeedback: 'YOUR FEEDBACK',
    placeholderShareThoughts: 'Please share your thoughts...',
    submitSurvey: 'Submit Survey',
    progress: 'Progress',
    answeredOf: 'answered',
    eventSurvey: 'Event Survey',
    thankYouForChoosing: 'Thank you for choosing The Anvaya Beach Resort Bali',
    selectRating: 'Please select a rating'
  },
  id: {
    welcomeTitle: 'Selamat Datang di Survei Kami',
    welcomeDescription: 'Mohon berikan informasi Anda sebelum melanjutkan ke survei.',
    fullName: 'Nama Lengkap',
    fullNamePlaceholder: 'Masukkan nama lengkap Anda',
    emailAddress: 'Alamat Email',
    emailAddressPlaceholder: 'Masukkan alamat email Anda',
    role: 'Peran',
    roleParticipant: 'Peserta',
    roleOrganizer: 'Penyelenggara',
    roleSpeaker: 'Pembicara',
    next: 'Lanjut',
    rateYourExperience: 'NILAI PENGALAMAN ANDA',
    yourFeedback: 'MASUKAN ANDA',
    placeholderShareThoughts: 'Silakan bagikan pemikiran Anda...',
    submitSurvey: 'Kirim Survei',
    progress: 'Kemajuan',
    answeredOf: 'dijawab',
    eventSurvey: 'Survei Acara',
    thankYouForChoosing: 'Terima kasih telah memilih The Anvaya Beach Resort Bali',
    selectRating: 'Silakan pilih penilaian'
  }
}

export const validationMessages: Record<EventLanguage, ValidationMessages> = {
  en: {
    nameRequired: 'Please enter your name',
    emailRequired: 'Please enter your email',
    emailInvalid: 'Please enter a valid email address',
    roleRequired: 'Please select your role'
  },
  id: {
    nameRequired: 'Mohon masukkan nama Anda',
    emailRequired: 'Mohon masukkan email Anda',
    emailInvalid: 'Mohon masukkan alamat email yang valid',
    roleRequired: 'Mohon pilih peran Anda'
  }
}

export function getSurveyQuestions(language: EventLanguage): SurveyQuestion[] {
  return surveyQuestions[language]
}

export function getLikertOptions(language: EventLanguage): LikertOption[] {
  return likertOptions[language]
}

export function getUIText(language: EventLanguage): UIText {
  return uiText[language]
}

export function getValidationMessages(language: EventLanguage): ValidationMessages {
  return validationMessages[language]
}

export const DEFAULT_REVIEW_THRESHOLD = 4.0
export const DEFAULT_ADMIN_PIN = '1234'
