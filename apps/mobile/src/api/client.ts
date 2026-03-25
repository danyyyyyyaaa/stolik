import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

export const TOKEN_KEY = 'stolik_token'

const client = axios.create({
  baseURL: 'https://stolik-production.up.railway.app',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // SecureStore unavailable (e.g. web preview) — skip
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Axios timeout: code is 'ECONNABORTED', message contains 'timeout'
    const isTimeout =
      error.code === 'ECONNABORTED' ||
      (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'))

    const msg = isTimeout
      ? 'Connection is slow, please try again'
      : error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Something went wrong'

    return Promise.reject(new Error(msg))
  }
)

export default client
