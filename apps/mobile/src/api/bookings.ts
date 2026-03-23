import client from './client'
import type { Booking } from '../store/useAppStore'

export interface CreateBookingPayload {
  restaurantId: string
  date:         string   // "YYYY-MM-DD"
  time:         string   // "HH:MM"
  guestCount:   number
  guestName:    string
  guestPhone:   string
  guestEmail?:  string
  notes?:       string
  source?:      string
}

export interface CreateBookingResponse {
  success: boolean
  booking: Booking
}

export async function createBooking(
  payload: CreateBookingPayload
): Promise<CreateBookingResponse> {
  const { data } = await client.post<CreateBookingResponse>('/api/bookings', {
    ...payload,
    source: payload.source ?? 'app',
  })
  return data
}

export async function getMyBookings(): Promise<Booking[]> {
  const { data } = await client.get<Booking[]>('/api/bookings/my')
  return Array.isArray(data) ? data : []
}

export async function cancelBooking(id: string): Promise<Booking> {
  const { data } = await client.patch<Booking>(`/api/bookings/${id}/status`, {
    status: 'cancelled',
  })
  return data
}
