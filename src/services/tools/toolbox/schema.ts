import { Description, Name } from "@/schema.js";
import { Effect, Ref } from "effect";
import * as S from "effect/Schema";

export class Tool extends S.Class<Tool>("Tool")({
	"description": S.optionalWith(S.String, { nullable: true }),
	"name": Name,
	"input_schema": S.Struct({
		"type": S.Literal("object"),
		"properties": S.optionalWith(S.Union(S.Record({ key: S.String, value: S.Unknown }), S.Null), { nullable: true })
	}),
	"output_schema": S.Struct({
		"type": S.Literal("object"),
		"properties": S.optionalWith(S.Union(S.Record({ key: S.String, value: S.Unknown }), S.Null), { nullable: true })
	}),
	"cache_control": S.optionalWith(S.Union(S.Literal("ephemeral"), S.Null), { nullable: true })
}) { }

export class Toolbox extends S.Class<Toolbox>("ToolboxSchema")({
	"description": S.optionalWith(S.String, { nullable: true }),
	"name": Name,
	"tools": S.Array(Tool)
}) { }

export class WorkbenchFile extends S.Class<WorkbenchFile>("WorkbenchFile")({
	"description": Description,
	"name": Name,
	"toolboxes": S.Array(Toolbox)
}) { }