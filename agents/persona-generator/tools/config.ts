import z from 'zod'

const STAGES = ["Init", "Load", "Cluster", "Eloborate", "Evaluate", "Summarize", "Finalize"] as const;

// Schema for validating merged profile
export const MergedProfileSchema = z.object({
    name: z.string(),
    title: z.string(),
    location: z.string().nullable(),
    key_skills: z.array(z.string()),
})