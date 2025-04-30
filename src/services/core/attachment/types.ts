/**
 * @file Defines the types for the Attachment service.
 */

import type { AttachmentLinkEntityData } from "@core/attachment/schema.js";
import type { AttachmentServiceApi } from "@core/attachment/api.js";

/**
 * Input type for creating a link (omitting system fields)
 */

export type CreateAttachmentLinkInput = Omit<
    AttachmentLinkEntityData,
    "linkType" // Make linkType optional here too if schema allows
> & { linkType?: string }; // Explicitly allow optional linkType

// Export the API for backwards compatibility
export type { AttachmentServiceApi };

// Default export is not needed as we already export the interface above
