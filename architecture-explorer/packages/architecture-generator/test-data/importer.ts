import { SampleComponent } from './sample';

/**
 * @architectureComponent
 * @c4 Code
 * @color #ff9966
 * @c4 Container
 * @description An importer component that depends on SampleComponent.
 * @tag importer
 * @groupByLayer UI
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
