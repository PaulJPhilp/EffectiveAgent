import { FilePart } from "@/services/ai/input/schema.js";
import { EffectiveInput } from "@/services/ai/input/service.js";
import { Effect } from "effect";
import * as Chunk from "effect/Chunk";
import { NoAudioFileError } from "../errors.js";

