import { ApiService } from './api';

/**
 * @architectureComponent
 * @c4 Container
 * @color #99ccff
 * @description A dashboard component that displays user data.
 * @tag ui
 * @groupByLayer UI
 */
export class DashboardComponent {
    constructor(private readonly api: ApiService) {}

    /**
     * Fetch and display data in the dashboard
     */
    public async refreshDashboard(): Promise<void> {
        await this.api.processData();
        console.log("Dashboard refreshed");
    }
}
