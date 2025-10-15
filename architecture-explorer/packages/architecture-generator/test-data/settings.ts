import { ApiService } from './api';

/**
 * @architectureComponent
 * @c4 Component
 * @color #ff6699
 * @c4 Component
 * @description A settings panel for configuring user preferences.
 * @tag ui
 * @groupByLayer UI
 */
export class SettingsComponent {
    constructor(private readonly api: ApiService) {}

    /**
     * Save user settings
     */
    public async saveSettings(settings: unknown): Promise<void> {
        await this.api.processData();
        console.log("Settings saved:", settings);
    }
}
