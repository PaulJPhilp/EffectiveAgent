/**
 * @file Defines the types for the Attachment service.
 */

import type { AttachmentServiceApi } from "./api.js";

/**
 * Input type for creating a link (omitting system fields)
 */
export type CreateAttachmentLinkInput = {
    entityA_id: string;
    entityA_type: string;
    entityB_id: string;
    entityB_type: string;
    linkType?: string;
    metadata?: Record<string, unknown>;
    createdBy?: string;
    expiresAt?: number;
};

// Export the API for backwards compatibility
export type { AttachmentServiceApi };

// Default export is not needed as we already export the interface above
