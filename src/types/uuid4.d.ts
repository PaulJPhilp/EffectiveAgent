/**
 * Type definitions for uuid4 2.0.3
 */

declare module "uuid4" {
    /**
     * Generates a version 4 UUID
     * @returns A randomly generated UUID string
     */
    function uuid4(): string;

    export = uuid4;
}
