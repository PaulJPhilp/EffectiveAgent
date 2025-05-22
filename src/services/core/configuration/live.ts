import { Layer } from "effect";
import {
  ConfigurationService,
  configurationServiceEffect
} from "./service.js"; // Assumes service.ts exports the Tag and the implementation Effect

/**
 * @category layers
 * @since 1.0.0
 */
export const ConfigurationServiceLiveLayer = Layer.effect(
  ConfigurationService,
  configurationServiceEffect
);
