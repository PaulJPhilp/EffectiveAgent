/**
 * Test script for profile name normalization
 */
import { normalizeProfileName } from "./utils";

// Test data with various name formats
const testNames = [
    // Basic names
    "john smith",
    "JANE DOE",
    "robert JONES",

    // Names with extra spaces
    "  Alex   Rodriguez  ",

    // Names with suffixes
    "James Smith, PhD",
    "Emily Johnson, MBA",
    "David Brown, md",

    // Names with middle initials
    "Sarah J. Williams",
    "Michael T Wilson",

    // Hyphenated names
    "Mary-Ann Taylor",
    "Jean-Claude smith",

    // Names in Last, First format
    "Garcia, Carlos",
    "Miller, Susan",

    // Edge cases
    "O'Connor, Patrick",
    "von Neumann, John",
    "Dr. Jane Smith",
    "Katie Proctor, MBA, RDN",
    "Jennifer Wisinger, PMP",
];

function runTest() {
    console.log("Name Normalization Test");
    console.log("=======================\n");

    let passCount = 0;
    const totalTests = testNames.length;

    for (const name of testNames) {
        const normalized = normalizeProfileName(name);
        console.log(`Original: "${name}"`);
        console.log(`Normalized: "${normalized}"`);

        // Debug logging
        if (name.includes('MBA')) {
            console.log('Debug info:');
            const words = normalized.split(' ');
            words.forEach((word, i) => {
                console.log(`Word ${i}: "${word}" - Uppercase: "${word.toUpperCase()}"`);
            });

            if (normalized.includes(',')) {
                console.log('Comma-separated parts:');
                const parts = normalized.split(',').map(p => p.trim());
                parts.forEach((part, i) => {
                    console.log(`Part ${i}: "${part}"`);
                });
            }
        }

        // Simple validation - just check that we have a non-empty result
        // and that capitalization looks correct (first letter of each word is uppercase)
        const words = normalized.split(" ");
        const isValid = words.every(
            (word) =>
                word.length > 0 &&
                (word[0] === word[0].toUpperCase() ||
                    word.includes(".") ||
                    word === "von" ||
                    word === "van" ||
                    word === "de"),
        );

        if (isValid) {
            console.log("✅ Valid normalization");
            passCount++;
        } else {
            console.log("❌ Invalid normalization");
        }

        console.log("-------------------");
    }

    console.log(`\nResults: ${passCount}/${totalTests} tests passed`);
}

runTest();
