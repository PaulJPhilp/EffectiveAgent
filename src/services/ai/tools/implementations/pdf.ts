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

export const PdfInputSchema = S.Union(
    // EXTRACT_TEXT operation
    S.Struct({
        operation: S.Literal(PdfOperation.EXTRACT_TEXT),
        filePath: S.String
    }),
    // GET_METADATA operation
    S.Struct({
        operation: S.Literal(PdfOperation.GET_METADATA),
        filePath: S.String
    }),
    // GET_PAGES operation
    S.Struct({
        operation: S.Literal(PdfOperation.GET_PAGES),
        filePath: S.String,
        pages: S.Array(S.Number),
        includeMetadata: S.optional(S.Boolean)
    })
);

export type PdfInput = S.Schema.Type<typeof PdfInputSchema>;

// --- Output Schema ---

export const PdfMetadataSchema = S.Struct({
    title: S.optional(S.String),
    author: S.optional(S.String),
    subject: S.optional(S.String),
    keywords: S.optional(S.String),
    creator: S.optional(S.String),
    producer: S.optional(S.String),
    creationDate: S.optional(S.String),
    modificationDate: S.optional(S.String),
    pageCount: S.Number
});

export const PdfPageSchema = S.Struct({
    pageNumber: S.Number,
    content: S.String
});

export const PdfOutputSchema = S.Struct({
    text: S.optional(S.String),
    metadata: S.optional(PdfMetadataSchema),
    pages: S.optional(S.Array(PdfPageSchema))
});

export type PdfOutput = S.Schema.Type<typeof PdfOutputSchema>;

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

function extractPageText(data: pdfParse.Result, pageNum: number): string {
    // pdf-parse doesn't provide direct page access, so we use a custom render function
    const pageTexts: string[] = [];
    let currentPage = 1;

    const renderOptions: pdfParse.Options = {
        pagerender: (pageData: any) => {
            if (currentPage === pageNum) {
                pageTexts.push(pageData.getTextContent());
            }
            currentPage++;
            return "";
        }
    };

    return pageTexts[0] || "";
}

// --- Implementation ---

export const pdfImpl = (input: unknown): Effect.Effect<PdfOutput, Error> =>
    Effect.gen(function* () {
        const data = yield* Effect.succeed(input).pipe(
            Effect.flatMap(i => S.decodeUnknown(PdfInputSchema)(i)),
            Effect.mapError((e): Error => new Error(`Invalid input: ${String(e)}`)),
            Effect.map(d => d as PdfInput)
        );

        const buffer = yield* readPdfFile(data.filePath);

        switch (data.operation) {
            case PdfOperation.EXTRACT_TEXT: {
                const pdf = yield* parsePdf(buffer);
                return yield* Effect.succeed({
                    text: pdf.text
                });
            }

            case PdfOperation.GET_METADATA: {
                const pdf = yield* parsePdf(buffer);
                return yield* Effect.succeed({
                    metadata: {
                        title: pdf.info?.Title,
                        author: pdf.info?.Author,
                        subject: pdf.info?.Subject,
                        keywords: pdf.info?.Keywords,
                        creator: pdf.info?.Creator,
                        producer: pdf.info?.Producer,
                        creationDate: pdf.info?.CreationDate,
                        modificationDate: pdf.info?.ModDate,
                        pageCount: pdf.numpages
                    }
                });
            }

            case PdfOperation.GET_PAGES: {
                const pdf = yield* parsePdf(buffer);
                const pages = yield* Effect.forEach(data.pages, pageNum =>
                    Effect.try({
                        try: () => ({
                            pageNumber: pageNum,
                            content: extractPageText(pdf, pageNum)
                        }),
                        catch: error => new Error(`Failed to extract page ${pageNum}`, { cause: error })
                    })
                );

                let result: PdfOutput = { pages };
                if (data.includeMetadata) {
                    const metadata = {
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
                    result = { ...result, metadata };
                }

                return yield* Effect.succeed(result);
            }

            default: {
                // This should never happen due to the schema validation
                return yield* Effect.fail(new Error(`Unsupported operation`));
            }
        }
    }); 