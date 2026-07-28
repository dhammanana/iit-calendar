import { LocalNotifications, Importance, Visibility } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface AlarmItem {
  id: number;
  title: string;
  body: string;
  at: Date;
  sound: string;
  channelId: string;
  allowWhileIdle: boolean;
  exact: boolean;
}

class AlarmPlugin {
  public async requestPermission(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
          // Request all needed permissions including sound and precise alerts
          await LocalNotifications.requestPermissions();
        }

        // On Android 12+, we may need to check for exact alarm permission
        if (Capacitor.getPlatform() === 'android') {
          const exactStatus = await LocalNotifications.checkExactNotificationSetting();
          if (exactStatus.exact_alarm !== 'granted') {
            console.warn("AlarmPlugin: Exact alarm permission not granted. Alarms may be delayed.");
            // We could call changeExactNotificationSetting() here, but it's better
            // to do it when the user explicitly enables an alarm or via a UI hint.
            // For now, let's just log it.
          }
        }
      } catch (e) {
        console.error("AlarmPlugin: Permission error", e);
      }
    } else if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.warn("Notification requestPermission skipped or denied", e);
      }
    }
  }

  public async schedule(items: AlarmItem[]): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      try {
        await LocalNotifications.schedule({
          notifications: items.map(item => {
            let sound = item.sound;
            
            return {
              id: item.id,
              title: item.title,
              body: item.body,
              schedule: {
                at: item.at,
                allowWhileIdle: true,
              },
              sound: sound,
              channelId: item.channelId,
              // Use timeSensitive for iOS to ensure delivery in Focus modes
              interruptionLevel: 'timeSensitive'
            };
          })
        });
      } catch (e) {
        console.error("AlarmPlugin: Schedule error", e);
      }
    } else {
      items.forEach(item => {
        const delay = item.at.getTime() - Date.now();
        if (delay > 0) {
          setTimeout(() => {
            this.showWebNotification(item.title, item.body, item.sound);
          }, delay);
        }
      });
    }
  }

  private showWebNotification(title: string, body: string, soundFile: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    try {
      const audio = new Audio(`/sounds/${soundFile}`);
      audio.play().catch(e => console.warn("Web audio playback failed", e));
    } catch (e) {
      console.warn("Web audio initialization failed", e);
    }
  }

  public async cancel(ids: number[]): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
      } catch (e) {
        console.error("AlarmPlugin: Cancel error", e);
      }
    }
  }

  public async createChannels(): Promise<void> {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const baseChannels: { id: string, name: string, importance: Importance, sound: string, visibility: Visibility }[] = [
          { id: 'meditation_v7', name: 'Meditation', importance: 4, sound: 'bell.wav', visibility: 1 },
          { id: 'solar_noon_v7', name: 'Solar Noon', importance: 4, sound: 'bell.wav', visibility: 1 },
          { id: 'dawn_v7',       name: 'Dawn',       importance: 4, sound: 'bell.wav', visibility: 1 },
          { id: 'study_v7',      name: 'Study',      importance: 4, sound: 'bell.wav', visibility: 1 }
        ];

        // Create specific channels for solar noon countdown voices
        const voiceChannels = [5, 4, 3, 2, 1, 0].map(m => ({
          id: `solar_noon_v7_${m}`,
          name: `Solar Noon ${m}m`,
          importance: 4 as Importance,
          sound: `noon_${m}.wav`,
          visibility: 1 as Visibility
        }));

        const allChannels = [...baseChannels, ...voiceChannels];

        for (const channel of allChannels) {
          await LocalNotifications.createChannel({
            ...channel,
            description: `${channel.name} alerts`
          });
        }
      } catch (e) {
        console.error("AlarmPlugin: Channel creation error", e);
      }
    }
  }
}

export const alarmPlugin = new AlarmPlugin();
