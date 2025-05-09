/**
 * @file Defines Effect Schemas for Persona definitions.
 * @module services/capabilities/persona/schema
 */

import { Description, Metadata, Name, Version } from "@/schema.js";
import { Schema as S } from "effect";

// Define allowed values for enum-like fields
const AllowedTones = Schema.Literal(
	"formal",
	"casual",
	"professional",
	"witty",
	"empathetic",
);
const AllowedVerbosity = Schema.Literal("concise", "normal", "verbose");
const AllowedOutputFormat = Schema.Literal("text", "markdown", "json");

/**
 * Schema.Class for a single example dialogue pair
 */
export class ExampleDialogue extends S.Class<ExampleDialogue>("ExampleDialogue")({
	request: Schema.String,
	response: Schema.String,
}) { }

/**
 * Schema.Class for the core definition of a Persona.
 * Used both for static files and potentially dynamic entities (minus base fields).
 */
export class Persona extends S.Class<Persona>("Persona")({
	/** Unique identifier for the persona. */
	name: Schema.String.pipe(Schema.minLength(1)),
	/** Optional user-friendly description. */
	description: Schema.String.pipe(S.optional),
	/** Core instructions defining the persona's behavior and style. */
	instructions: Schema.String.pipe(Schema.minLength(1)),
	/** Optional tone specification. */
	tone: AllowedTones.pipe(S.optional),
	/** Optional verbosity specification. */
	verbosity: AllowedVerbosity.pipe(S.optional),
	/** Optional output format specification. */
	outputFormat: AllowedOutputFormat.pipe(S.optional),
	/** Optional few-shot examples. */
	exampleDialogues: Schema.Array(ExampleDialogue).pipe(S.optional),
}) { }

/**
 * Schema.Class for the static configuration file (e.g., personas.json).
 * Contains an array of persona definitions.
 */
export class PersonasFile extends S.Class<PersonasFile>("PersonasFile")({
	name: Name,
	description: Description.pipe(S.optional),
	personas: Schema.Array(Persona).pipe(Schema.minItems(1)),
	/** Optional metadata for the configuration file. */
	metadata: Metadata.pipe(S.optional),
	/** Optional versioning information for the configuration file. */
	version: Version.pipe(S.optional),
}) { }