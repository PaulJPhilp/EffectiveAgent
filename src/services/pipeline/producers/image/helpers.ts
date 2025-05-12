/**
 * @file Helper functions for working with image generation
 * @module services/pipeline/producers/image/helpers
 */

/**
 * Enhances a basic image prompt with additional details
 * @param basePrompt The base content prompt
 * @param options Additional details to enhance the prompt
 * @returns Enhanced prompt with consistent formatting
 */
export function enhancePrompt(
    basePrompt: string,
    options?: {
        style?: string;
        lighting?: string;
        perspective?: string;
        mood?: string;
        detail?: string;
        format?: string;
    }
): string {
    const parts = [basePrompt];

    if (options?.style) {
        parts.push(`Style: ${options.style}`);
    }

    if (options?.lighting) {
        parts.push(`Lighting: ${options.lighting}`);
    }

    if (options?.perspective) {
        parts.push(`Perspective: ${options.perspective}`);
    }

    if (options?.mood) {
        parts.push(`Mood: ${options.mood}`);
    }

    if (options?.detail) {
        parts.push(`Detail: ${options.detail}`);
    }

    if (options?.format) {
        parts.push(`Format: ${options.format}`);
    }

    return parts.join(", ");
}

/**
 * Creates a negative prompt to exclude common image generation issues
 * @param additionalExclusions Additional elements to exclude
 * @returns Formatted negative prompt string
 */
export function createNegativePrompt(additionalExclusions: string[] = []): string {
    const commonExclusions = [
        "blurry",
        "distorted",
        "low quality",
        "deformed",
        "poorly drawn",
        "extra limbs",
        "duplicate",
        "watermark",
        "signature",
        "cropped",
        "out of frame"
    ];

    return [...commonExclusions, ...additionalExclusions].join(", ");
}

/**
 * Generates an image description for a product
 * @param productName The name of the product
 * @param category The product category
 * @param features Key features to highlight
 * @returns Formatted product image prompt
 */
export function createProductImagePrompt(
    productName: string,
    category: string,
    features: string[]
): string {
    const basePrompt = `Professional product photography of a ${productName}, ${category}`;
    const featuresList = features.length > 0 ? `, highlighting ${features.join(", ")}` : "";

    return enhancePrompt(
        `${basePrompt}${featuresList}`,
        {
            style: "product photography",
            lighting: "studio lighting",
            perspective: "front view, 3/4 angle",
            detail: "high detail",
            format: "clean white background"
        }
    );
}

/**
 * Formats an image URL for display or download
 * @param url The raw image URL
 * @param format Optional format (thumbnail, preview, full)
 * @returns Formatted image URL
 */
export function formatImageUrl(url: string, format: "thumbnail" | "preview" | "full" = "full"): string {
    // This is a placeholder implementation - in a real application, this would
    // reformat the URL based on CDN patterns or add query parameters
    if (!url) return "";

    if (format === "thumbnail") {
        return url.includes("?") ? `${url}&width=100` : `${url}?width=100`;
    }

    if (format === "preview") {
        return url.includes("?") ? `${url}&width=512` : `${url}?width=512`;
    }

    return url;
}

/**
 * Creates an image prompt for content/blog post illustrations
 * @param topic The main topic of the content
 * @param context Additional context about the content
 * @param style Visual style for the image
 * @returns Enhanced prompt suitable for content illustrations
 */
export function createContentImagePrompt(
    topic: string,
    context?: string,
    style: "digital" | "photographic" | "artistic" | "minimalist" = "photographic"
): {
    prompt: string;
    negativePrompt: string;
} {
    // Build base prompt based on topic and context
    let basePrompt = `A compelling visual representation of ${topic}`;
    if (context) {
        basePrompt += ` showing ${context}`;
    }

    // Define style-specific settings
    const styleSettings: Record<string, {
        style: string;
        lighting: string;
        detail: string;
        mood: string;
        format?: string;
    }> = {
        digital: {
            style: "digital art, 3D render, vibrant colors",
            lighting: "soft ambient light, clean shadows",
            detail: "high detail, sharp edges",
            mood: "modern, professional",
            format: "16:9 aspect ratio"
        },
        photographic: {
            style: "professional photography, realistic",
            lighting: "natural lighting, soft shadows",
            detail: "high detail, shallow depth of field",
            mood: "authentic, compelling",
            format: "16:9 aspect ratio"
        },
        artistic: {
            style: "artistic illustration, painterly style",
            lighting: "dramatic lighting, high contrast",
            detail: "brushstroke texture, fine details",
            mood: "expressive, emotional",
            format: "16:9 aspect ratio"
        },
        minimalist: {
            style: "minimalist design, limited color palette",
            lighting: "flat lighting, subtle gradients",
            detail: "clean lines, simple shapes",
            mood: "calm, focused",
            format: "16:9 aspect ratio"
        }
    };

    // Get settings for requested style (we know this exists since style is a literal union type)
    const settings = styleSettings[style];
    
    // Generate prompt using enhancePrompt with safe access
    const prompt = enhancePrompt(basePrompt, {
        style: settings?.style ?? "professional",
        lighting: settings?.lighting ?? "natural lighting",
        detail: settings?.detail ?? "high detail",
        mood: settings?.mood ?? "neutral",
        format: settings?.format
    });

    // Create specific negative prompts for content images
    const negativePrompt = createNegativePrompt([
        "text",
        "words",
        "letters",
        "typography",
        "UI elements",
        "buttons",
        "logos",
        "borders"
    ]);

    return { prompt, negativePrompt };
}
