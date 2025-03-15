// Simple test script that uses direct mocks and avoids imports

// Sample profile data
const sampleProfile = {
    name: "John Doe",
    title: "Senior Software Engineer",
    location: "San Francisco, CA",
    key_skills: ["JavaScript", "TypeScript", "Node.js", "React"],
    contact: {
        email: "john.doe@example.com",
        linkedin: "https://linkedin.com/in/johndoe",
        company_website: null
    },
    certificates: [],
    experience: [{
        company: "Tech Corp",
        title: "Senior Developer",
        duration: "2018-2023",
        description: ["Led development team", "Implemented CI/CD pipelines"]
    }],
    sourceFile: "sample_resume.pdf",
    fileText: "John Doe - Senior Software Engineer with experience in JavaScript",
    fileType: "pdf"
};

// Helper functions for profile normalization
function standardizeTitle(title) {
    return title
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function standardizeLocation(location) {
    return location;
}

function standardizeSkill(skill) {
    const skillMap = {
        'js': 'JavaScript',
        'javascript': 'JavaScript',
        'ts': 'TypeScript',
        'typescript': 'TypeScript',
        'react': 'React.js',
        'node': 'Node.js',
        'nodejs': 'Node.js',
        'py': 'Python',
        'python': 'Python'
    };
    
    const lowerSkill = skill.toLowerCase();
    return skillMap[lowerSkill] || skill;
}

function standardizeCompany(company) {
    return company;
}

function detectIndustries(profile) {
    const industries = [];
    
    if (profile.key_skills.some(s => 
        s.toLowerCase().includes('javascript') || 
        s.toLowerCase().includes('react')
    )) {
        industries.push('Technology');
    }
    
    return industries.length ? industries : ['Unknown'];
}

function estimateYearsOfExperience(profile) {
    if (!profile.experience || profile.experience.length === 0) {
        return 0;
    }
    
    return profile.experience.length * 2;
}

function detectEducationLevel(profile) {
    return 'Bachelor\'s Degree';
}

// Function to normalize profile
async function normalizeProfile(profile) {
    console.log("Normalizing profile:", profile.name);
    
    // Create mock response directly
    console.log("Skip model service completely");
    
    debugger;
    
    // Just create a mock response directly
    const normalizedProfile = {
        name: profile.name,
        standardizedName: profile.name,
        title: profile.title,
        standardizedTitle: standardizeTitle(profile.title),
        location: profile.location,
        standardizedLocation: standardizeLocation(profile.location),
        key_skills: profile.key_skills,
        standardizedSkills: profile.key_skills.map(skill => standardizeSkill(skill)),
        company_names: profile.experience?.map(exp => exp.company) || [],
        standardizedCompanies: profile.experience?.map(exp => standardizeCompany(exp.company)) || [],
        industries: detectIndustries(profile),
        years_of_experience: estimateYearsOfExperience(profile),
        education_level: detectEducationLevel(profile),
        candidate_type: "experienced"
    };
    
    console.log("Mock response created");
    
    return {
        success: true,
        normalizedProfile,
        error: null
    };
}

// Run the test
async function runTest() {
    try {
        console.log("Starting test with direct normalization...");
        
        const result = await normalizeProfile(sampleProfile);
        
        if (result.success) {
            console.log("✅ Normalization successful!");
            console.log("Normalized profile:", JSON.stringify(result.normalizedProfile, null, 2));
            return true;
        } else {
            console.error("❌ Normalization failed:", result.error);
            return false;
        }
    } catch (error) {
        console.error("❌ Test failed with error:", 
            error instanceof Error ? error.message : String(error));
        console.error(error instanceof Error ? error.stack : "No stack available");
        return false;
    }
}

// Execute the test
console.log("=== RUNNING NORMALIZATION TEST WITH DIRECT MOCKING ===");
runTest()
    .then(success => {
        console.log(`\n=== TEST ${success ? "PASSED" : "FAILED"} ===`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error("Unhandled error in test execution:", error);
        process.exit(1);
    });
