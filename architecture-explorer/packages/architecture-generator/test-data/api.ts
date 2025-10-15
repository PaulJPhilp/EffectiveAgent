import { DatabaseService } from './database';
import { SampleComponent } from './sample';

/**
 * @architectureComponent
 * @c4 SystemContext
 * @description An API service that coordinates between components and database.
 * @tag api
 * @groupByLayer Service
 * @color #ffcc00
 */
export class ApiService {
    constructor(
        private readonly database: DatabaseService,
        private readonly sample: SampleComponent
    ) {}

    /**
     * Process data through the pipeline
     */
    public async processData(): Promise<void> {
        const result = await this.sample.doSomething();
        this.database.storeData(result);
    }
}
