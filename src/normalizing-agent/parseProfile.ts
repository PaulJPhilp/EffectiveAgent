import type { AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { DataCleaningModel, type ProfileData } from "./types";
import { loadChatModel } from "./utils";

// Map of well-known certification issuers
const KNOWN_CERTIFICATION_ISSUERS = new Map([
    ["SCRUM Master", "Scrum Alliance"],
    ["SCRUM", "Scrum Alliance"],
    ["CSM", "Scrum Alliance"],
    ["PSM", "Scrum.org"],
    ["PMP", "Project Management Institute"],
    ["CAPM", "Project Management Institute"],
    ["AWS", "Amazon Web Services"],
    ["CISSP", "ISC2"],
    ["CISM", "ISACA"],
]);

// Helper function to determine certification issuer
function determineCertificationIssuer(certName: string): string {
    // First check for exact matches in known issuers
    for (const [key, issuer] of KNOWN_CERTIFICATION_ISSUERS.entries()) {
        if (certName.toUpperCase().includes(key.toUpperCase())) {
            return issuer;
        }
    }

    // Then check for common patterns
    const patterns = [
        // Pattern: "2023 Best of District V Awards" -> "District V"
        {
            regex: /(\d{4}\s+)?Best of (.*?) Awards?/i,
            transform: (match: RegExpMatchArray) => match[2].trim(),
        },
        // Pattern: "Launch Event Coordinator Exam" -> "Launch"
        {
            regex: /(.*?)\s+(?:Event|Assistant|Coordinator)\s+Exam/i,
            transform: (match: RegExpMatchArray) => match[1].trim(),
        },
        // Pattern: "Wedding Assistant Exam" -> "Wedding Industry Association"
        {
            regex: /Wedding\s+.*?\s+Exam/i,
            transform: () => "Wedding Industry Association",
        },
    ];

    for (const pattern of patterns) {
        const match = certName.match(pattern.regex);
        if (match) {
            return pattern.transform(match);
        }
    }

    // If no patterns match, extract meaningful parts
    const words = certName.split(" ");
    if (words[0].match(/^\d{4}$/)) {
        // If starts with year, use the organization name that follows
        return words.slice(1).join(" ");
    }

    // Default to first word + "Organization" if nothing else matches
    return `${words[0]} Organization`;
}

// Helper function to determine certification issuer using LLM
async function determineCertificationIssuerWithLLM(
    certName: string,
): Promise<string> {
    const prompt = `Given the certificate/award name "${certName}", determine the most likely issuing organization.
Rules:
1. For well-known certifications (e.g. SCRUM Master, PMP), use the official certifying body
2. For awards (e.g. "2023 Best of District V Awards"), extract the awarding organization
3. For exams/courses, determine the likely institution
4. If uncertain, use a reasonable organization name based on the certificate subject matter
5. Return ONLY the organization name, nothing else

Examples:
"SCRUM Master" -> "Scrum Alliance"
"2023 Best of District V Awards" -> "District V"
"Launch Event Coordinator Exam" -> "Launch Events Institute"
"Wedding Assistant Exam" -> "Wedding Industry Association"

Certificate name: "${certName}"
Issuing organization:`;

    try {
        const promptModel = await loadChatModel(DataCleaningModel);
        const messages = [{ role: "user", content: prompt }];
        const response: AIMessage = await promptModel.invoke(messages);
        return response.content.toString().trim();
    } catch (error) {
        // Fallback to our static mapping if LLM fails
        return determineCertificationIssuer(certName);
    }
}

// Define Zod schemas for validation
export const DurationSchema = z.object({
    start_date: z.string(),
    end_date: z.string().nullable(),
    date_range: z.string(),
});

export const ContactInformationSchema = z.object({
    linkedin: z.string().nullable(),
    email: z.string().nullable(),
    company_website: z.string().nullable(),
});

export const ExperienceSchema = z.object({
    company: z.preprocess((val) => {
        if (val === null || val === undefined) {
            return "Independent/Freelance"
        }
        return val
    }, z.string()),
    title: z.preprocess((val) => {
        if (val === null) {
            const parent = this as unknown as { company: string }
            return parent.company.toLowerCase().includes('freelance')
                ? `${parent.company} Professional`
                : parent.company
        }
        return val
    }, z.string()),
    duration: z.string(),
    location: z.string().nullable(),
    description: z.array(z.string()).default([]),
    company_url: z.string().nullable()
});

export const CertificateSchema = z.object({
    name: z.string(),
    issuing_organization: z.preprocess(async (val) => {
        if (val === null) {
            return "Unknown Issuer"
        }
        return val
    }, z.string()),
    issue_date: z.string().nullable(),
    expiration_date: z.string().nullable(),
    credential_id: z.string().nullable(),
    status: z.enum(["Active", "Expired", "In Progress"]).default("Active")
});

export const ProfileDataSchema = z.object({
    name: z.string(),
    title: z.string(),
    location: z.string().nullable(),
    key_skills: z.array(z.string()),
    contact: ContactInformationSchema,
    certificates: z.array(CertificateSchema),
    experience: z.array(ExperienceSchema),
});

export class ProfileDataParseError extends Error {
    constructor(
        message: string,
        public readonly data: unknown,
    ) {
        super(message);
        this.name = "ProfileDataParseError";
    }
}

// Parse function to handle async transforms
export async function parseProfileData(input: string): Promise<ProfileData> {
    try {
        const parsed = JSON.parse(input);
        try {
            return await ProfileDataSchema.parseAsync(parsed);
        } catch (validationError) {
            if (validationError instanceof z.ZodError) {
                throw new ProfileDataParseError(
                    `Invalid profile data structure: ${validationError.message}`,
                    { parsed, zodErrors: validationError.format() },
                );
            }
            throw validationError;
        }
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new ProfileDataParseError("Invalid JSON format", input);
        }
        throw error;
    }
}
