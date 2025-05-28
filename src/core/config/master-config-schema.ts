import { Schema } from 'effect';

export const RuntimeSettingsSchema = Schema.Struct({
  fileSystemImplementation: Schema.Literal('node').pipe(
    Schema.annotations({ description: 'File system implementation to use: "node".' })
  ),
});
export type RuntimeSettings = Schema.Schema.Type<typeof RuntimeSettingsSchema>;

export const LoggingSettingsSchema = Schema.Struct({
  level: Schema.String, // Consider Schema.Literal for specific levels e.g. "info", "debug", "error"
  filePath: Schema.String
});
export type LoggingSettings = Schema.Schema.Type<typeof LoggingSettingsSchema>;

export const ConfigPathsSchema = Schema.Struct({
  providers: Schema.String,
  models: Schema.String,
  policy: Schema.String
});
export type ConfigPaths = Schema.Schema.Type<typeof ConfigPathsSchema>;

export const MasterConfigSchema = Schema.Struct({
  version: Schema.String,
  runtimeSettings: RuntimeSettingsSchema, // Reference the schema constant
  logging: LoggingSettingsSchema,       // Reference the schema constant
  configPaths: ConfigPathsSchema        // Reference the schema constant
});
export type MasterConfigData = Schema.Schema.Type<typeof MasterConfigSchema>;

