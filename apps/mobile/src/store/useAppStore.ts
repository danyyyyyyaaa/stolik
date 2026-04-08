import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { TOKEN_KEY } from '../api/client'

export interface User {
  id:        string
  email:     string
  firstName: string
  lastName:  string
  avatarUrl?: string | null
  phone?:    string | null
}

export interface PendingBooking {
  restaurantId: string
  date:         string
  time:         string | null
  guests:       number
}

export interface Restaurant {
  id:         string
  name:       string
  slug:       string
  cuisine:    string
  district:   string
  city:       string
  address:    string
  phone:      string
  priceRange: string
  rating?:    number
  openUntil?: string
  emoji?:     string
  color?:     string
  desc?:      string
}

export interface Booking {
  id:          string
  bookingRef:  string
  restaurantId:string
  restaurant?: Restaurant
  date:        string
  time:        string
  guestCount:  number
  guestName:   string
  guestPhone:  string
  status:      'pending' | 'confirmed' | 'cancelled' | 'completed'
  source:      string
}

interface AppState {
  token:              string | null
  user:               User | null
  restaurants:        Restaurant[]
  myBookings:         Booking[]
  lastBooking:        Booking | null
  pendingBooking:     PendingBooking | null
  favoriteIds:        string[]

  setToken:           (token: string | null) => Promise<void>
  setUser:            (user: User | null) => void
  setRestaurants:     (restaurants: Restaurant[]) => void
  setMyBookings:      (bookings: Booking[]) => void
  setLastBooking:     (booking: Booking | null) => void
  setPendingBooking:  (booking: PendingBooking | null) => void
  setFavoriteIds:     (ids: string[]) => void
  toggleFavoriteId:   (id: string) => void
  logout:             () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  token:              null,
  user:               null,
  restaurants:        [],
  myBookings:         [],
  lastBooking:        null,
  pendingBooking:     null,
  favoriteIds:        [],

  setToken: async (token) => {
    try {
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token)
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY)
      }
    } catch {
      // SecureStore unavailable (web) — ignore
    }
    set({ token })
  },

  setUser: (user) => set({ user }),

  setRestaurants: (restaurants) => set({ restaurants }),

  setMyBookings: (myBookings) => set({ myBookings }),

  setLastBooking: (lastBooking) => set({ lastBooking }),

  setPendingBooking: (pendingBooking) => set({ pendingBooking }),

  setFavoriteIds: (favoriteIds) => set({ favoriteIds }),

  toggleFavoriteId: (id) => set(state => ({
    favoriteIds: state.favoriteIds.includes(id)
      ? state.favoriteIds.filter(f => f !== id)
      : [...state.favoriteIds, id],
  })),

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
    } catch {
      // ignore
    }
    set({ token: null, user: null, myBookings: [], favoriteIds: [] })
  },
}))
