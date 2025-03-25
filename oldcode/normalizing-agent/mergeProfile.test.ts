import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from "vitest"
import { mockMergeProfiles } from './testUtils'
import type { ProfileData } from './types'

describe('Profile Merging', () => {
    it('should return single source profile when only one exists', async () => {
        const pdfProfile: ProfileData = {
            name: "Test User",
            title: "Test Title",
            location: "Test Location",
            key_skills: ["Skill 1", "Skill 2"],
            contact: {
                linkedin: null,
                email: null,
                company_website: null
            },
            certificates: [],
            experience: []
        }

        const result = mockMergeProfiles(pdfProfile)
        expect(result).toEqual(pdfProfile)
    })

    it('should merge Ali Parker profiles and save the result', async () => {
        // Load the profiles from the clean directory
        const cleanDir = path.join(process.cwd(), 'data', 'clean', 'Ali Parker')
        const pdfProfilePath = path.join(cleanDir, 'Ali Parker.pdf.txt')
        const txtProfilePath = path.join(cleanDir, 'Ali Parker.txt.txt')

        // Read and parse both profiles
        const pdfProfile: ProfileData = JSON.parse(fs.readFileSync(pdfProfilePath, 'utf-8'))
        const txtProfile: ProfileData = JSON.parse(fs.readFileSync(txtProfilePath, 'utf-8'))

        // Merge the profiles directly using our mock implementation
        const mergedProfile = mockMergeProfiles(pdfProfile, txtProfile)

        // Verify the merged profile has necessary data
        expect(mergedProfile.name).toBe('Ali Parker')
        expect(mergedProfile.key_skills.length).toBeGreaterThan(0)
        expect(mergedProfile.experience.length).toBeGreaterThan(0)

        // Create the merged directory if it doesn't exist
        const mergedDir = path.join(process.cwd(), 'data', 'merged')
        if (!fs.existsSync(mergedDir)) {
            fs.mkdirSync(mergedDir, { recursive: true })
        }

        // Write the merged profile to a file
        const outputPath = path.join(mergedDir, 'Ali Parker.json')
        fs.writeFileSync(outputPath, JSON.stringify(mergedProfile, null, 2))

        // Verify the file was created
        expect(fs.existsSync(outputPath)).toBe(true)

        // Read the file back and verify it's valid JSON and contains the expected data
        const savedProfile: ProfileData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
        expect(savedProfile.name).toBe('Ali Parker')
        expect(savedProfile).toEqual(mergedProfile)
    })

    it('should merge two profiles without duplicates', async () => {
        // Create two test profiles with overlapping data
        const profile1: ProfileData = {
            name: "Test User",
            title: "Software Engineer",
            location: "New York",
            key_skills: ["JavaScript", "TypeScript", "React"],
            contact: {
                linkedin: "https://linkedin.com/test",
                email: null,
                company_website: null
            },
            certificates: [],
            experience: [
                {
                    company: "Company A",
                    title: "Software Engineer",
                    duration: "2020-01 - Present",
                    description: ["Developed web applications"]
                }
            ]
        }

        const profile2: ProfileData = {
            name: "Test User",
            title: "Senior Software Engineer",
            location: "New York",
            key_skills: ["TypeScript", "React", "Node.js"],
            contact: {
                linkedin: null,
                email: "test@example.com",
                company_website: null
            },
            certificates: [],
            experience: [
                {
                    company: "Company A",
                    title: "Software Engineer",
                    duration: "2020-01 - Present",
                    description: ["Developed web applications using React", "Additional description"]
                }
            ]
        }

        const merged = mockMergeProfiles(profile1, profile2)

        // Check that skills were deduplicated
        expect(merged.key_skills).toContain("JavaScript")
        expect(merged.key_skills).toContain("TypeScript")
        expect(merged.key_skills).toContain("React")
        expect(merged.key_skills).toContain("Node.js")
        expect(merged.key_skills.length).toBe(4) // No duplicates

        // Check that contact information was merged
        expect(merged.contact.linkedin).toBe("https://linkedin.com/test")
        expect(merged.contact.email).toBe("test@example.com")

        // Check that experiences were properly merged
        expect(merged.experience.length).toBe(1) // Only one unique experience
        // The merged experience should use the description from profile2 because it has more items
        expect(merged.experience[0].description[0]).toBe("Developed web applications using React")
        expect(merged.experience[0].description.length).toBe(2)
    })

    it('should prefer more detailed descriptions', () => {
        // Test with conflicting data
        const briefProfile: ProfileData = {
            name: "Test User",
            title: "Developer",
            location: "Test Location",
            key_skills: ["JavaScript"],
            contact: {
                linkedin: null,
                email: null,
                company_website: null
            },
            certificates: [],
            experience: [
                {
                    company: "Company X",
                    title: "Developer",
                    duration: "2020-01 - Present",
                    description: ["Built software"]
                }
            ]
        }

        const detailedProfile: ProfileData = {
            name: "Test User",
            title: "Software Developer",
            location: "Test Location",
            key_skills: ["JavaScript"],
            contact: {
                linkedin: null,
                email: null,
                company_website: null
            },
            certificates: [],
            experience: [
                {
                    company: "Company X",
                    title: "Developer",
                    duration: "2020-01 - Present",
                    description: ["Built enterprise software using modern technologies", "Implemented CI/CD pipelines", "Led team of 3 developers"]
                }
            ]
        }

        const merged = mockMergeProfiles(briefProfile, detailedProfile)

        // Should prefer the more detailed descriptions
        expect(merged.experience[0].description.length).toBe(3)
        expect(merged.experience[0].description).toContain("Built enterprise software using modern technologies")
    })

    it('should process all profiles in the clean directory', async () => {
        // Get all person directories
        const cleanDir = path.join(process.cwd(), 'data', 'clean')
        const personDirs = fs.readdirSync(cleanDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)

        // Create the merged directory if it doesn't exist
        const mergedDir = path.join(process.cwd(), 'data', 'merged')
        if (!fs.existsSync(mergedDir)) {
            fs.mkdirSync(mergedDir, { recursive: true })
        }

        // Process each person
        expect(personDirs.length).toBeGreaterThan(0)

        let successCount = 0
        for (const person of personDirs) {
            try {
                const personDir = path.join(cleanDir, person)
                const files = fs.readdirSync(personDir)

                let pdfProfile: ProfileData | undefined
                let txtProfile: ProfileData | undefined

                // Load PDF profile if it exists
                const pdfFile = files.find(f => f.includes('.pdf.txt'))
                if (pdfFile) {
                    const pdfPath = path.join(personDir, pdfFile)
                    pdfProfile = JSON.parse(fs.readFileSync(pdfPath, 'utf-8'))
                }

                // Load TXT profile if it exists
                const txtFile = files.find(f => f.includes('.txt.txt') && !f.includes('.pdf.txt'))
                if (txtFile) {
                    const txtPath = path.join(personDir, txtFile)
                    txtProfile = JSON.parse(fs.readFileSync(txtPath, 'utf-8'))
                }

                // Skip if no profiles found
                if (!pdfProfile && !txtProfile) {
                    console.log(`No profiles found for ${person}`)
                    continue
                }

                // Merge profiles
                const mergedProfile = mockMergeProfiles(pdfProfile, txtProfile)

                // Save merged profile
                const outputPath = path.join(mergedDir, `${person}.json`)
                fs.writeFileSync(outputPath, JSON.stringify(mergedProfile, null, 2))

                successCount++
            } catch (error) {
                console.error(`Error processing ${person}:`, error)
            }
        }

        console.log(`Successfully processed ${successCount} out of ${personDirs.length} profiles`)
        expect(successCount).toBeGreaterThan(0)
    })
})