import { Effect } from "effect";
import { EffectiveInput } from "@/services/ai/input/service.js";
import { FilePart } from "@/services/ai/input/schema.js";
import * as Chunk from "effect/Chunk";
import { NoAudioFileError } from "../errors.js";

