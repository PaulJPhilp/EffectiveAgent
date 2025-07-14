import { SampleComponent } from './sample';

/**
 * @architectureComponent
 * @c4 Container
 * @description An importer component that depends on SampleComponent.
 * @tag importer
 * @groupByLayer AI
 */
export class ImporterComponent {
    private sample: SampleComponent;

    constructor() {
        this.sample = new SampleComponent();
    }

    public useDependency(): void {
        this.sample.doSomething();
    }
}
