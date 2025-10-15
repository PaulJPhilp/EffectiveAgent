/**
 * @architectureComponent
 * @c4 Component
 * @color #66cc99
 * @c4 Database
 * @description A database service that stores user data.
 * @tag database
 * @groupByLayer Data
 */
export class DatabaseService {
    /**
     * Store user data in the database
     */
    public storeData(data: unknown): void {
        console.log("Storing data...", data);
    }
}
