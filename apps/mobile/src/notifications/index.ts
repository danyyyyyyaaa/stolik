import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const API              = process.env.EXPO_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'
const NOTIFICATIONS_KEY = 'stolik_notifications'

// Show notifications even when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
})

// ─── Android channel ──────────────────────────────────────────────────────────

async function setupAndroidChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('stolik', {
    name:             'Stolik',
    importance:       Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       '#238636',
    sound:            'default',
  })
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false // simulator / web — skip

  const { status: current } = await Notifications.getPermissionsAsync()
  if (current === 'granted') { await setupAndroidChannel(); return true }

  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return false

  await setupAndroidChannel()
  return true
}

// ─── Push token registration ──────────────────────────────────────────────────

export async function getAndRegisterPushToken(authToken: string): Promise<void> {
  if (!Device.isDevice) return
  try {
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync()
    await fetch(`${API}/api/users/push-token`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: pushToken, platform: Platform.OS }),
    })
  } catch {
    // Best-effort — endpoint may not exist yet on the backend
  }
}

// ─── Preference helpers ───────────────────────────────────────────────────────

export async function isEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(NOTIFICATIONS_KEY)
    return val !== '0' // default ON
  } catch {
    return true
  }
}

export async function setEnabled(on: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(NOTIFICATIONS_KEY, on ? '1' : '0')
  } catch {}
  if (!on) {
    // Cancel all pending reminders when the user turns off notifications
    await Notifications.cancelAllScheduledNotificationsAsync()
  }
}

// ─── Booking confirmed ────────────────────────────────────────────────────────

export async function notifyBookingConfirmed(params: {
  restaurantName: string
  date:           string
  time:           string
}): Promise<void> {
  if (!(await isEnabled())) return
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your table is booked! 🎉',
        body:  `${params.restaurantName} on ${params.date} at ${params.time}`,
        sound: true,
      },
      trigger: null,  // fire immediately
    })
  } catch {}
}

// ─── 2-hour reminder ─────────────────────────────────────────────────────────

export async function scheduleReminder(params: {
  bookingId:      string
  restaurantName: string
  date:           string  // "2024-03-20"
  time:           string  // "19:00"
}): Promise<void> {
  if (!(await isEnabled())) return
  try {
    const [year, month, day] = params.date.split('-').map(Number)
    const [h, m]             = params.time.split(':').map(Number)
    const bookingMs   = new Date(year, month - 1, day, h, m).getTime()
    const seconds     = Math.floor((bookingMs - 2 * 3600 * 1000 - Date.now()) / 1000)
    if (seconds <= 0) return // reminder would be in the past

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Booking reminder',
        body:  `Your table at ${params.restaurantName} in 2 hours`,
        sound: true,
        data:  { bookingId: params.bookingId },
      },
      trigger: { seconds },
    })

    // Persist identifier so we can cancel if the booking is cancelled
    await SecureStore.setItemAsync(`stolik_reminder_${params.bookingId}`, id)
  } catch {}
}

// ─── Cancel a scheduled reminder ─────────────────────────────────────────────

export async function cancelReminder(bookingId: string): Promise<void> {
  try {
    const id = await SecureStore.getItemAsync(`stolik_reminder_${bookingId}`)
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id)
      await SecureStore.deleteItemAsync(`stolik_reminder_${bookingId}`)
    }
  } catch {}
}

// ─── Booking cancelled ────────────────────────────────────────────────────────

export async function notifyBookingCancelled(params: {
  restaurantName: string
  date:           string
}): Promise<void> {
  if (!(await isEnabled())) return
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Booking cancelled ❌',
        body:  `${params.restaurantName} on ${params.date}`,
        sound: true,
      },
      trigger: null,
    })
  } catch {}
}
