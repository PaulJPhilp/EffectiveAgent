import { Command, Options, Prompt } from "@effect/cli";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Console, Effect, Option } from "effect";

interface MasterConfig {
    logging?: {
        filePath?: string;
    };
}

const getLogFilePath = Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const pathSvc = yield* _(Path.Path);

    const masterConfigPathFromEnv = process.env.MASTER_CONFIG_PATH;
    if (!masterConfigPathFromEnv) {
        return yield* _(Effect.fail("MASTER_CONFIG_PATH environment variable is not set."));
    }

    const masterConfigExists = yield* _(fs.exists(masterConfigPathFromEnv));
    if (!masterConfigExists) {
        return yield* _(Effect.fail(`Master config file not found at: ${masterConfigPathFromEnv}`));
    }

    let masterConfig: MasterConfig;
    try {
        const masterConfigContent = yield* _(fs.readFileString(masterConfigPathFromEnv, "utf-8"));
        masterConfig = JSON.parse(masterConfigContent);
    } catch (e: any) {
        return yield* _(Effect.fail(`Failed to parse master config file: ${masterConfigPathFromEnv}. Error: ${e.message}`));
    }

    const logFilePathRelative = masterConfig.logging?.filePath;
    if (!logFilePathRelative) {
        return yield* _(Effect.fail("Log file path not found in master config (logging.filePath)."));
    }

    const projectRoot = process.cwd();
    const absoluteLogFilePath = pathSvc.resolve(projectRoot, logFilePathRelative);
    return absoluteLogFilePath;
});

const viewCommand = Command.make(
    "view",
    {
        head: Options.integer("head").pipe(Options.optional),
        tail: Options.integer("tail").pipe(Options.optional),
    },
    ({ head, tail }) =>
        Effect.gen(function* (_) {
            if (Option.isSome(head) && Option.isSome(tail)) {
                yield* _(Console.error("Cannot use --head and --tail options simultaneously."));
                return yield* _(Effect.fail(new Error("Invalid options: Cannot use --head and --tail together.")));
            }

            const fs = yield* _(FileSystem.FileSystem);
            const logFilePath = yield* _(getLogFilePath);

            const logFileExists = yield* _(fs.exists(logFilePath));
            if (!logFileExists) {
                yield* _(Console.log(`Log file not found at: ${logFilePath}`));
                return;
            }

            const content = yield* _(fs.readFileString(logFilePath, "utf-8"));
            const lines = content.split("\n");

            if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
                yield* _(Console.log("Log file is empty."));
                return;
            }

            let linesToDisplay: string[];

            if (Option.isSome(head)) {
                linesToDisplay = lines.slice(0, Option.getOrThrow(head));
            } else if (Option.isSome(tail)) {
                linesToDisplay = lines.slice(-Option.getOrThrow(tail));
            } else {
                linesToDisplay = lines;
            }

            for (const line of linesToDisplay) {
                yield* _(Console.log(line));
            }
        })
);

const clearCommand = Command.make(
    "clear",
    {},
    () =>
        Effect.gen(function* (_) {
            const fs = yield* _(FileSystem.FileSystem);
            const logFilePath = yield* _(getLogFilePath);

            const confirmation = yield* _(
                Prompt.confirm({
                    message: `Are you sure you want to clear the log file at: ${logFilePath}?`,
                })
            );

            if (confirmation) {
                const logFileExists = yield* _(fs.exists(logFilePath));
                if (!logFileExists) {
                    // If user confirms deletion of a non-existent file, it's not an error, just inform.
                    yield* _(Console.log(`Log file not found at: ${logFilePath}. Nothing to clear.`));
                    return;
                }
                yield* _(fs.writeFileString(logFilePath, ""));
                yield* _(Console.log(`Log file cleared: ${logFilePath}`));
            } else {
                yield* _(Console.log("Log clear operation cancelled."));
            }
        })
);

export const logCommands = Command.make("log").pipe(
    Command.withSubcommands([viewCommand, clearCommand]),
    Command.provide(NodeContext.layer)
);