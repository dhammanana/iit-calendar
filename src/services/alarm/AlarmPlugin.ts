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
  private channelsCreated = false;
  private webTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

  public async requestPermission(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
          // Request all needed permissions including sound and precise alerts
          await LocalNotifications.requestPermissions();
        }

        // On Android 12+, check for exact alarm permission
        if (Capacitor.getPlatform() === 'android') {
          await this.ensureExactAlarmPermission();
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

  public async ensureExactAlarmPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const exactStatus = await LocalNotifications.checkExactNotificationSetting();
        if (exactStatus.exact_alarm !== 'granted') {
          console.warn("AlarmPlugin: Exact alarm permission not granted. Requesting setting change.");
          await LocalNotifications.changeExactNotificationSetting();
          return false;
        }
        return true;
      } catch (e) {
        console.error("AlarmPlugin: check/change exact alarm error", e);
      }
    }
    return true;
  }

  public async schedule(items: AlarmItem[]): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        if (Capacitor.getPlatform() === 'android') {
          await this.createChannels();
        }
        await LocalNotifications.schedule({
          notifications: items.map(item => {
            let sound = item.sound;
            if (Capacitor.getPlatform() === 'android' && sound.endsWith('.wav')) {
              sound = sound.replace(/\.wav$/, '');
            }
            
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
        // Clear any existing timeout for this ID before re-scheduling (#9)
        const existingTimeout = this.webTimeouts.get(item.id);
        if (existingTimeout !== undefined) {
          clearTimeout(existingTimeout);
        }
        const delay = item.at.getTime() - Date.now();
        if (delay > 0) {
          const timeoutId = setTimeout(() => {
            this.webTimeouts.delete(item.id);
            this.showWebNotification(item.title, item.body, item.sound);
          }, delay);
          this.webTimeouts.set(item.id, timeoutId);
        } else {
          this.webTimeouts.delete(item.id);
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
    } else {
      // Clear tracked web timeouts (#9)
      ids.forEach(id => {
        const timeoutId = this.webTimeouts.get(id);
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
          this.webTimeouts.delete(id);
        }
      });
    }
  }

  public async createChannels(): Promise<void> {
    if (this.channelsCreated) return;
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const isAndroid = Capacitor.getPlatform() === 'android';
        const baseChannels: { id: string, name: string, importance: Importance, sound?: string, visibility: Visibility, vibration?: boolean }[] = [
          { id: 'meditation_v11', name: 'Meditation', importance: 5, sound: isAndroid ? 'bell' : 'bell.wav', visibility: 1, vibration: true },
          { id: 'solar_noon_v9', name: 'Solar Noon', importance: 5, sound: isAndroid ? 'bell' : 'bell.wav', visibility: 1, vibration: true },
          { id: 'dawn_v9',       name: 'Dawn',       importance: 5, sound: isAndroid ? 'bell' : 'bell.wav', visibility: 1, vibration: true },
          { id: 'study_v9',      name: 'Study',      importance: 5, sound: isAndroid ? 'bell' : 'bell.wav', visibility: 1, vibration: true }
        ];

        // Create specific channels for meditation bell sound types (Sound + Vibrate)
        const bellTypes = ['bowl', 'gong', 'chime', 'tibetan', 'woodblock', 'bell'];
        const meditationChannels = bellTypes.map(type => ({
          id: `meditation_${type}_v11`,
          name: `Meditation (${type.charAt(0).toUpperCase() + type.slice(1)})`,
          importance: 5 as Importance,
          sound: isAndroid ? `bell_${type}` : `bell_${type}.wav`,
          vibration: true,
          visibility: 1 as Visibility
        }));

        // Create specific channels for sound-only meditation (no vibration)
        const meditationNoVibChannels = bellTypes.map(type => ({
          id: `meditation_${type}_novib_v11`,
          name: `Meditation (${type.charAt(0).toUpperCase() + type.slice(1)} - Sound Only)`,
          importance: 5 as Importance,
          sound: isAndroid ? `bell_${type}` : `bell_${type}.wav`,
          vibration: false,
          visibility: 1 as Visibility
        }));

        const vibrateOnlyMeditationChannel = {
          id: 'meditation_vibrate_only_v11',
          name: 'Meditation (Vibrate Only)',
          importance: 4 as Importance,
          sound: isAndroid ? 'silent' : 'silent.wav',
          vibration: true,
          visibility: 1 as Visibility
        };

        const silentMeditationChannel = {
          id: 'meditation_silent_v11',
          name: 'Meditation (Silent)',
          importance: 3 as Importance,
          sound: isAndroid ? 'silent' : 'silent.wav',
          vibration: false,
          visibility: 1 as Visibility
        };

        // Create specific channels for solar noon countdown voices
        const voiceChannels = [5, 4, 3, 2, 1, 0].map(m => ({
          id: `solar_noon_v9_${m}`,
          name: `Solar Noon ${m}m`,
          importance: 5 as Importance,
          sound: isAndroid ? `noon_${m}` : `noon_${m}.wav`,
          visibility: 1 as Visibility
        }));

        const allChannels = [...baseChannels, ...meditationChannels, ...meditationNoVibChannels, vibrateOnlyMeditationChannel, silentMeditationChannel, ...voiceChannels];

        for (const channel of allChannels) {
          await LocalNotifications.createChannel({
            ...channel,
            description: `${channel.name} alerts`
          });
        }
        this.channelsCreated = true;
      } catch (e) {
        console.error("AlarmPlugin: Channel creation error", e);
      }
    }
  }
}

export const alarmPlugin = new AlarmPlugin();
