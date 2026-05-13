<template>
  <div class="pb-24 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-sm-bg-dark dark:to-gray-900 min-h-screen">
    <!-- Enhanced Header -->
    <div class="px-6 py-8 bg-white/80 dark:bg-sm-card-dark/80 backdrop-blur-lg border-b border-gray-200 dark:border-white/10 sticky top-0 z-30 safe-area-top shadow-lg">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Tactical Offer</h1>
          <p class="text-xs text-gray-500 dark:text-gray-400">Create new tactical offer request</p>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="p-4 space-y-6">

      <!-- Market & Subject Section -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-white/10 animate-fade-in-up" style="animation-delay: 100ms;">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">Target Market</h2>
        </div>

        <!-- Market Selection -->
        <div class="mb-4">
          <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">Select Market</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in marketOptions"
              :key="opt.value"
              type="button"
              class="relative px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border-2"
              :class="form.market === opt.value
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent shadow-lg scale-105'
                : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-600'"
              @click="form.market = opt.value"
            >
              <span class="relative z-10">{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Subject Input -->
        <div>
          <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Offer Subject</label>
          <div class="relative">
            <input
              v-model="form.subject"
              type="text"
              class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
              placeholder="Tactical Offer Q3 2026 - Chinese Market"
            />
            <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Company & Contact Section -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-white/10 animate-fade-in-up" style="animation-delay: 200ms;">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          </div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">Company Details</h2>
        </div>

        <div class="space-y-4">
          <!-- Company Name -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Company Name</label>
            <div class="relative">
              <input
                v-model="form.company"
                type="text"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-medium"
                placeholder="e.g. Go Vacation"
              />
              <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- Name & Title Row -->
          <div class="grid grid-cols-[80px_1fr] gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Title</label>
              <select
                v-model="form.title"
                class="w-full px-3 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-medium appearance-none cursor-pointer"
              >
                <option v-for="t in titleOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Full Name</label>
              <input
                v-model="form.fullName"
                type="text"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-medium"
                placeholder="John Doe"
              />
            </div>
          </div>

          <!-- Designation -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Designation</label>
            <input
              v-model="form.designation"
              type="text"
              class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-medium"
              placeholder="Manager"
            />
          </div>
        </div>
      </div>

      <!-- Contact Information -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-white/10 animate-fade-in-up" style="animation-delay: 300ms;">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">Contact Information</h2>
        </div>

        <div class="space-y-4">
          <!-- Address Fields -->
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Address Line 1</label>
              <input
                v-model="form.addressLine1"
                type="text"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
                placeholder="Street Address"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Address Line 2</label>
              <input
                v-model="form.addressLine2"
                type="text"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
                placeholder="Apt, Suite, Etc"
              />
            </div>
          </div>

          <!-- Email & Phone Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Email</label>
              <div class="relative">
                <input
                  v-model="form.email"
                  type="email"
                  class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
                  placeholder="user@example.com"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Phone</label>
              <div class="relative">
                <input
                  v-model="form.phone"
                  type="tel"
                  class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
                  placeholder="+1..."
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dates Section -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-white/10 animate-fade-in-up" style="animation-delay: 400ms;">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">Important Dates</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Booking Period -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Booking Period</label>
            <div
              @click="openDatePicker('booking')"
              class="relative px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 cursor-pointer hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group"
            >
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Select Period</span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ form.bookingPeriodStart && form.bookingPeriodEnd
                      ? `${formatDate(form.bookingPeriodStart)} - ${formatDate(form.bookingPeriodEnd)}`
                      : 'Choose dates...'
                    }}
                  </span>
                </div>
                <div class="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Travel Period -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Travel Period</label>
            <div
              @click="openDatePicker('travel')"
              class="relative px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 cursor-pointer hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group"
            >
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Select Period</span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ form.travelPeriodStart && form.travelPeriodEnd
                      ? `${formatDate(form.travelPeriodStart)} - ${formatDate(form.travelPeriodEnd)}`
                      : 'Choose dates...'
                    }}
                  </span>
                </div>
                <div class="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications Section -->
      <div class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-3xl p-6 shadow-lg border border-green-200 dark:border-green-800 animate-fade-in-up" style="animation-delay: 500ms;">
        <label class="cursor-pointer">
          <input type="checkbox" v-model="form.notifyMe" value="yes" class="peer sr-only">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center peer-checked:scale-110 transition-transform">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
              </div>
              <div>
                <span class="block font-bold text-gray-900 dark:text-white">Email Notifications</span>
                <span class="block text-xs text-gray-600 dark:text-gray-400">Get updates about your offer status</span>
              </div>
            </div>
            <div class="w-6 h-6 rounded-full border-2 border-gray-300 peer-checked:border-green-500 peer-checked:bg-green-500 transition-all flex items-center justify-center">
              <svg class="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
        </label>
      </div>

      <!-- Notification Email (Conditional) -->
      <div v-if="form.notifyMe.includes('yes')" class="bg-white dark:bg-sm-card-dark rounded-3xl p-6 shadow-lg border-2 border-green-400 dark:border-green-600 animate-fade-in-up">
        <label class="block text-xs font-semibold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wider">Notification Email</label>
        <div class="relative">
          <input
            v-model="form.emailToNotify"
            type="email"
            class="w-full px-4 py-3 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-medium"
            placeholder="notify@example.com"
          />
          <div class="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 pt-4">
        <button
          type="button"
          @click="resetForm"
          class="px-6 py-4 rounded-2xl bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 font-semibold border-2 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-all hover:scale-105 active:scale-95 shadow-md"
        >
          Reset Form
        </button>
        <button
          type="submit"
          :disabled="isSubmitting || !isFormValid"
          class="flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold shadow-xl shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
          <span v-if="!isSubmitting">Submit Tactical Offer</span>
          <span v-else>
            <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        </button>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-4 text-center animate-fade-in-up">
        <div class="flex items-center justify-center gap-2">
          <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-red-700 dark:text-red-400 text-sm font-medium">{{ errorMessage }}</span>
        </div>
      </div>
    </form>

    <!-- Date Range Picker Modal -->
    <div v-if="showDatePicker" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-md" @click="showDatePicker = false"></div>

      <div class="relative bg-white dark:bg-sm-card-dark w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up">
        <DateRangePicker
          mode="range"
          :initial-start="activeDatePicker === 'booking' ? form.bookingPeriodStart : form.travelPeriodStart"
          :initial-end="activeDatePicker === 'booking' ? form.bookingPeriodEnd : form.travelPeriodEnd"
          @select="handleDateRangeSelect"
          @close="showDatePicker = false"
        />
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="isApprovalModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-md" @click="closeModal"></div>

      <div class="relative bg-white dark:bg-sm-card-dark w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up">
        <div class="p-8 text-center">
          <div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>

          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Offer Submitted!</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-8 text-sm">Your tactical offer has been sent and is waiting for approval.</p>

          <button
            @click="closeModal"
            class="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
          >
            Perfect, Thanks!
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { postTacticalOffer } from '@/utils/api'
import { useSession } from '@/composables/useSession'
import { useSessionStore } from '@/stores/session'
import type { TacticalOfferForm } from '@/types/tacticalOffer'
import { useHead } from '@vueuse/head'
import DateRangePicker from '@/components/DateRangePicker.vue'

useHead({
  title: 'Submit Tactical Offer - SM Mobile App',
  meta: [
    {
      name: 'description',
      content: 'Submit new tactical offer requests with client details, contact information, and booking period for The Anvaya Beach Resort Bali.'
    }
  ]
})

const { ensureSession } = useSession()
const sessionStore = useSessionStore()

const marketOptions = [
  { value: 'WW', label: 'Worldwide' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Domestic', label: 'Domestic' }
]

const titleOptions = [
  { value: 'Mr.', label: 'Mr.' },
  { value: 'Ms.', label: 'Ms.' },
  { value: 'Bapak', label: 'Bapak' },
  { value: 'Ibu', label: 'Ibu' }
]

const form = ref<TacticalOfferForm>({
  market: 'WW',
  subject: '',
  company: '',
  title: 'Mr.',
  fullName: '',
  designation: '',
  addressLine1: '',
  addressLine2: '',
  email: '',
  phone: '',
  bookingPeriodStart: '',
  bookingPeriodEnd: '',
  travelPeriodStart: '',
  travelPeriodEnd: '',
  notifyMe: [],
  emailToNotify: ''
})

const isSubmitting = ref(false)
const errorMessage = ref('')
const isApprovalModalOpen = ref(false)
const showDatePicker = ref(false)
const activeDatePicker = ref<'booking' | 'travel'>('booking')

// Simple validation
const isFormValid = computed(() => {
  return form.value.company && form.value.fullName && form.value.email &&
         form.value.bookingPeriodStart && form.value.bookingPeriodEnd &&
         form.value.travelPeriodStart && form.value.travelPeriodEnd
})

const formatDate = (dateString: string) => {
  const d = new Date(dateString)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const openDatePicker = (type: 'booking' | 'travel') => {
  activeDatePicker.value = type
  showDatePicker.value = true
}

const handleDateRangeSelect = (dates: { start: string; end: string }) => {
  if (activeDatePicker.value === 'booking') {
    form.value.bookingPeriodStart = dates.start
    form.value.bookingPeriodEnd = dates.end
  } else {
    form.value.travelPeriodStart = dates.start
    form.value.travelPeriodEnd = dates.end
  }
  showDatePicker.value = false
}

const handleSubmit = async () => {
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const sessionId = ensureSession()

    // Get sales user details from session store
    const salesUser = sessionStore.currentUser

    await postTacticalOffer({
      ...form.value,
      sessionId,
      salesName: salesUser?.name || '',
      salesEmail: salesUser?.email || '',
      salesPosition: salesUser?.position || '',
      salesPhone: salesUser?.phone || ''
    })
    isApprovalModalOpen.value = true
  } catch (e: any) {
    errorMessage.value = e.message || 'Failed to submit'
  } finally {
    isSubmitting.value = false
  }
}

const closeModal = () => {
  isApprovalModalOpen.value = false
  resetForm()
}

const resetForm = () => {
  form.value = {
    market: 'WW',
    subject: '',
    company: '',
    title: 'Mr.',
    fullName: '',
    designation: '',
    addressLine1: '',
    addressLine2: '',
    email: '',
    phone: '',
    bookingPeriodStart: '',
    bookingPeriodEnd: '',
    travelPeriodStart: '',
    travelPeriodEnd: '',
    notifyMe: [],
    emailToNotify: ''
  }
}
</script>
