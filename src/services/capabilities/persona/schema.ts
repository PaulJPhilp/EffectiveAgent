/**
 * @file Defines Effect Schemas for Persona definitions.
 * @module services/capabilities/persona/schema
 */

import { Description, Metadata, Name, Version } from "@/schema.js";
import { Schema } from "effect";

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
export class ExampleDialogue extends Schema.Class<ExampleDialogue>("ExampleDialogue")({
	request: Schema.String,
	response: Schema.String,
}) { }

/**
 * Schema.Class for the core definition of a Persona.
 * Used both for static files and potentially dynamic entities (minus base fields).
 */
export class Persona extends Schema.Class<Persona>("Persona")({
	/** Unique identifier for the persona. */
	name: Schema.String.pipe(Schema.minLength(1)),
	/** Optional user-friendly description. */
	description: Schema.String.pipe(Schema.optional),
	/** Core instructions defining the persona's behavior and style. */
	instructions: Schema.String.pipe(Schema.minLength(1)),
	/** Optional tone specification. */
	tone: AllowedTones.pipe(Schema.optional),
	/** Optional verbosity specification. */
	verbosity: AllowedVerbosity.pipe(Schema.optional),
	/** Optional output format specification. */
	outputFormat: AllowedOutputFormat.pipe(Schema.optional),
	/** Optional few-shot examples. */
	exampleDialogues: Schema.Array(ExampleDialogue).pipe(Schema.optional),
}) { }

/**
 * Schema.Class for the static configuration file (e.g., personas.json).
 * Contains an array of persona definitions.
 */
export class PersonasFile extends Schema.Class<PersonasFile>("PersonasFile")({
	name: Name,
	description: Description.pipe(Schema.optional),
	personas: Schema.Array(Persona).pipe(Schema.minItems(1)),
	/** Optional metadata for the configuration file. */
	metadata: Metadata.pipe(Schema.optional),
	/** Optional versioning information for the configuration file. */
	version: Version.pipe(Schema.optional),
}) { }