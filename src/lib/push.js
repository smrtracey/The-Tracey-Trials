import { fetchVapidPublicKey, savePushSubscription } from './api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Request push notification permission and register a push subscription.
 * Silently does nothing if push is not supported or permission is denied.
 */
export async function subscribeToPushNotifications(token) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()

    if (existing) {
      // Already subscribed — save it to server in case it wasn't stored yet
      await savePushSubscription(token, existing.toJSON())
      return
    }

    const permission = await Notification.requestPermission()

    if (permission !== 'granted') {
      return
    }

    const { vapidPublicKey } = await fetchVapidPublicKey()
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })

    await savePushSubscription(token, subscription.toJSON())
  } catch {
    // Push subscription is best-effort — never crash the app
  }
}
