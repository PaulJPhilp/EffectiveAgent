/**
 * @file PDF parsing tool implementation
 * @module services/tools/implementations/pdf
 */

import * as fs from "node:fs/promises";
import { Effect, Schema as S } from "effect";
import * as pdfParse from "pdf-parse";

// --- Input Schema ---

export const PdfOperation = {
    EXTRACT_TEXT: "EXTRACT_TEXT",
    GET_METADATA: "GET_METADATA",
    GET_PAGES: "GET_PAGES"
} as const;

export class PdfInput extends S.Class<PdfInput>("PdfInput")({
    operation: S.Union(
        S.Literal(PdfOperation.EXTRACT_TEXT),
        S.Literal(PdfOperation.GET_METADATA),
        S.Literal(PdfOperation.GET_PAGES)
    ),
    filePath: S.String,
    pages: S.optional(S.Array(S.Number)),
    includeMetadata: S.optional(S.Boolean),
    startPage: S.optional(S.Number),
    endPage: S.optional(S.Number)
}) { }

// --- Output Schema ---

export class PdfMetadata extends S.Class<PdfMetadata>("PdfMetadata")({
    title: S.optional(S.String),
    author: S.optional(S.String),
    subject: S.optional(S.String),
    keywords: S.optional(S.String),
    creator: S.optional(S.String),
    producer: S.optional(S.String),
    creationDate: S.optional(S.String),
    modificationDate: S.optional(S.String),
    pageCount: S.Number
}) { }

export class PdfPage extends S.Class<PdfPage>("PdfPage")({
    pageNumber: S.Number,
    content: S.String
}) { }

export class PdfContent extends S.Class<PdfContent>("PdfContent")({
    metadata: PdfMetadata,
    pages: S.Array(PdfPage)
}) { }

export class PdfOutput extends S.Class<PdfOutput>("PdfOutput")({
    content: PdfContent,
    summary: S.String
}) { }

// --- Helper Functions ---

function readPdfFile(filePath: string): Effect.Effect<Buffer, Error> {
    return Effect.tryPromise({
        try: () => fs.readFile(filePath),
        catch: error => new Error(`Failed to read PDF file: ${filePath}`, { cause: error })
    });
}

function parsePdf(buffer: Buffer, options?: pdfParse.Options): Effect.Effect<pdfParse.Result, Error> {
    return Effect.tryPromise({
        try: () => pdfParse.default(buffer, options),
        catch: error => new Error("Failed to parse PDF", { cause: error })
    });
}

function extractPageText(data: pdfParse.Result, pageNum: number): Effect.Effect<string, Error> {
    return Effect.try({
        try: () => {
            // pdf-parse provides text for all pages, we need to split and get specific page
            const pages = data.text.split('\n\n');  // Basic page separation
            return pages[pageNum - 1] || "";
        },
        catch: error => new Error(`Failed to extract page ${pageNum}`, { cause: error })
    });
}

// --- Implementation ---

export const pdfImpl = (input: unknown): Effect.Effect<PdfOutput, Error> =>
    Effect.gen(function* () {
        const data = yield* Effect.succeed(input).pipe(
            Effect.flatMap(i => S.decodeUnknown(PdfInput)(i)),
            Effect.mapError((e): Error => new Error(`Invalid input: ${String(e)}`))
        );

        const buffer = yield* readPdfFile(data.filePath);
        const pdf = yield* parsePdf(buffer);

        const metadata: PdfMetadata = {
            title: pdf.info?.Title,
            author: pdf.info?.Author,
            subject: pdf.info?.Subject,
            keywords: pdf.info?.Keywords,
            creator: pdf.info?.Creator,
            producer: pdf.info?.Producer,
            creationDate: pdf.info?.CreationDate,
            modificationDate: pdf.info?.ModDate,
            pageCount: pdf.numpages
        };

        switch (data.operation) {
            case PdfOperation.EXTRACT_TEXT: {
                return {
                    content: {
                        metadata,
                        pages: [{
                            pageNumber: 1,
                            content: pdf.text
                        }]
                    },
                    summary: `Extracted ${pdf.numpages} pages of text from PDF`
                };
            }

            case PdfOperation.GET_METADATA: {
                return {
                    content: {
                        metadata,
                        pages: []
                    },
                    summary: `Retrieved metadata from PDF with ${pdf.numpages} pages`
                };
            }

            case PdfOperation.GET_PAGES: {
                if (!data.pages?.length) {
                    return yield* Effect.fail(new Error("No pages specified for GET_PAGES operation"));
                }

                const pages = yield* Effect.forEach(data.pages, pageNum =>
                    Effect.gen(function* () {
                        const content = yield* extractPageText(pdf, pageNum);
                        return {
                            pageNumber: pageNum,
                            content
                        };
                    })
                );

                return {
                    content: {
                        metadata,
                        pages
                    },
                    summary: `Retrieved ${pages.length} pages from PDF`
                };
            }

            default: {
                // This should never happen due to the schema validation
                return yield* Effect.fail(new Error(`Unsupported operation`));
            }
        }
    }); 