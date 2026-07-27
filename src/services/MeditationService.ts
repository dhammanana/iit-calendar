import { meditationDbService } from './MeditationDbService';

class MeditationService {
  public async getSessions() {
    return meditationDbService.getSessions();
  }

  public async addSession(durationMin: number, customDate?: string) {
    return meditationDbService.addSession(durationMin, customDate);
  }
}

export const meditationService = new MeditationService();
