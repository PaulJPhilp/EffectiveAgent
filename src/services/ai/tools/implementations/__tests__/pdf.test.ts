import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Effect, Either } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PdfOperation, pdfImpl } from "../pdf.js";

describe("PDF Tool", () => {
    const testPdfPath = path.join(process.cwd(), "test-files", "test.pdf");
    const testPdfContent = `
%PDF-1.3
1 0 obj
<< /Title (Test PDF) /Author (Test Author) /Subject (Test Subject) /Keywords (test, pdf) >>
endobj
2 0 obj
<< /Type /Page /Contents 3 0 R >>
endobj
3 0 obj
<< /Length 68 >>
stream
BT
/F1 12 Tf
72 712 Td
(This is a test PDF document. Page 1.) Tj
ET
endstream
endobj
xref
0 4
0000000000 65535 f
0000000010 00000 n
0000000089 00000 n
0000000134 00000 n
trailer
<< /Size 4 /Root 2 0 R /Info 1 0 R >>
startxref
257
%%EOF`;

    beforeAll(async () => {
        await fs.mkdir(path.dirname(testPdfPath), { recursive: true });
        await fs.writeFile(testPdfPath, testPdfContent);
    });

    afterAll(async () => {
        await fs.unlink(testPdfPath);
    });

    describe("EXTRACT_TEXT operation", () => {
        it("should extract text from PDF", () => Effect.gen(function* () {
            const result = yield* pdfImpl({
                operation: PdfOperation.EXTRACT_TEXT,
                filePath: testPdfPath
            });

            expect(result.content.pages[0].content).toBeDefined();
            expect(result.content.pages[0].content).toContain("This is a test PDF document");
        }));

        it("should handle non-existent file", () => Effect.gen(function* () {
            const result = yield* Effect.either(pdfImpl({
                operation: PdfOperation.EXTRACT_TEXT,
                filePath: "nonexistent.pdf"
            }));

            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(Error);
                expect(result.left.message).toContain("Failed to read PDF file");
            }
        }));
    });

    describe("GET_METADATA operation", () => {
        it("should extract metadata from PDF", () => Effect.gen(function* () {
            const result = yield* pdfImpl({
                operation: PdfOperation.GET_METADATA,
                filePath: testPdfPath
            });

            expect(result.content.metadata).toBeDefined();
            expect(result.content.metadata?.title).toBe("Test PDF");
            expect(result.content.metadata?.author).toBe("Test Author");
            expect(result.content.metadata?.subject).toBe("Test Subject");
            expect(result.content.metadata?.keywords).toBe("test, pdf");
            expect(result.content.metadata?.pageCount).toBeGreaterThan(0);
        }));

        it("should handle invalid PDF", () => Effect.gen(function* () {
            const invalidPdfPath = path.join(process.cwd(), "test-files", "invalid.pdf");
            yield* Effect.promise(() => fs.writeFile(invalidPdfPath, "Not a PDF file"));

            const result = yield* Effect.either(pdfImpl({
                operation: PdfOperation.GET_METADATA,
                filePath: invalidPdfPath
            }));

            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(Error);
                expect(result.left.message).toContain("Failed to parse PDF");
            }

            yield* Effect.promise(() => fs.unlink(invalidPdfPath));
        }));
    });

    describe("GET_PAGES operation", () => {
        it("should extract specific pages", () => Effect.gen(function* () {
            const result = yield* pdfImpl({
                operation: PdfOperation.GET_PAGES,
                filePath: testPdfPath,
                pages: [1],
                includeMetadata: true
            });

            expect(result.content.pages).toBeDefined();
            expect(result.content.pages).toHaveLength(1);
            expect(result.content.pages?.[0].pageNumber).toBe(1);
            expect(result.content.pages?.[0].content).toContain("Page 1");
            expect(result.content.metadata).toBeDefined();
            expect(result.content.metadata?.title).toBe("Test PDF");
        }));

        it("should handle invalid page numbers", () => Effect.gen(function* () {
            const result = yield* pdfImpl({
                operation: PdfOperation.GET_PAGES,
                filePath: testPdfPath,
                pages: [999]
            });

            expect(result.content.pages).toBeDefined();
            expect(result.content.pages).toHaveLength(1);
            expect(result.content.pages?.[0].content).toBe("");
        }));
    });

    describe("Error handling", () => {
        it("should handle invalid input schema", () => Effect.gen(function* () {
            const result = yield* Effect.either(pdfImpl({
                operation: "INVALID" as any,
                filePath: testPdfPath
            }));

            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(Error);
                expect(result.left.message).toContain("Invalid input");
            }
        }));

        it("should handle missing required fields", () => Effect.gen(function* () {
            const result = yield* Effect.either(pdfImpl({
                operation: PdfOperation.EXTRACT_TEXT
            } as any));

            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(Error);
                expect(result.left.message).toContain("Invalid input");
            }
        }));
    });
});