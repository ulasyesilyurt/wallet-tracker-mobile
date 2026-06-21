package com.wallettrackerapp

import android.app.Application
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

private const val DEFAULT_NOTIFICATION_CHANNEL_ID = "fcm_fallback_notification_channel"
private const val DEFAULT_NOTIFICATION_CHANNEL_NAME = "Wallet activity"
private const val DEFAULT_NOTIFICATION_CHANNEL_DESCRIPTION = "Notifications for tracked wallet activity"

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createNotificationChannelSafely()
  }

  private fun createNotificationChannelSafely() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    try {
      val notificationManager = getSystemService(NotificationManager::class.java) ?: return
      val existingChannel = notificationManager.getNotificationChannel(DEFAULT_NOTIFICATION_CHANNEL_ID)

      if (existingChannel != null) {
        return
      }

      val channel = NotificationChannel(
        DEFAULT_NOTIFICATION_CHANNEL_ID,
        DEFAULT_NOTIFICATION_CHANNEL_NAME,
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = DEFAULT_NOTIFICATION_CHANNEL_DESCRIPTION
        enableLights(true)
        enableVibration(true)
        setShowBadge(true)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }

      notificationManager.createNotificationChannel(channel)
    } catch (_: Throwable) {
      // Never let notification setup block React Native app startup.
    }
  }
}