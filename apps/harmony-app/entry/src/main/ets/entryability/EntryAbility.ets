import UIAbility from '@ohos.app.ability.UIAbility';
import window from '@ohos.window';
import { PreferencesManager } from '../persistence/PreferencesManager';
import { DatabaseManager } from '../persistence/DatabaseManager';

export default class EntryAbility extends UIAbility {
  async onCreate(): Promise<void> {
    try {
      await PreferencesManager.init(this.context);
      await DatabaseManager.init(this.context);
    } catch (err) {
      const e = err as Error;
      console.error(`init storage failed: ${e.message}`);
    }
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/Index', (error) => {
      if (error.code) {
        console.error(`Failed to load the content. Code: ${error.code}, message: ${error.message}`);
      }
    });
  }
}
