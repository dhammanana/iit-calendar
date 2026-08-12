import { Haptics } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

class VibrationService {
  /**
   * Triggers device vibration for meditation alerts.
   * @param type 'short' for interval alerts (~200ms), 'long' for start/end session alerts (~800ms)
   */
  public async vibrate(type: 'short' | 'long' = 'short'): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        if (type === 'short') {
          await Haptics.vibrate({ duration: 250 });
        } else {
          await Haptics.vibrate({ duration: 800 });
        }
      } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        if (type === 'short') {
          navigator.vibrate(200);
        } else {
          navigator.vibrate([400, 100, 400]);
        }
      }
    } catch (e) {
      console.warn('Vibration failed:', e);
    }
  }
}

export const vibrationService = new VibrationService();
