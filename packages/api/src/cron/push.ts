let expo: any = null

async function getExpo() {
  if (!expo) {
    const { Expo } = await import('expo-server-sdk')
    expo = new Expo()
  }
  return expo
}

export async function sendPush(pushToken: string, title: string, body: string, data: Record<string, any> = {}) {
  try {
    const { Expo } = await import('expo-server-sdk')
    if (!Expo.isExpoPushToken(pushToken)) return
    const expoClient = await getExpo()
    await expoClient.sendPushNotificationsAsync([{ to: pushToken, title, body, data, sound: 'default' }])
  } catch (err) {
    console.error('[Push] Failed to send:', err)
  }
}
