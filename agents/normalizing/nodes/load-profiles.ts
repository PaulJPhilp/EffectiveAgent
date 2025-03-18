import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import type { RunnableFunc } from '@langchain/core/runnables';
import type { NormalizationState } from '../state';
import type { ProfileData } from '../types';

/**
 * Loads profile data from PDF files in the input directory
 */
export class ProfileLoader {
  private readonly debug: boolean = false;
  /**
   * Reads and parses a PDF file into profile data
   * @param filePath Path to the PDF file
   * @returns Profile data object
   */
  private async loadProfileFromPdf(filePath: string): Promise<ProfileData> {
    try {
      const result = await new PDFLoader(filePath, { splitPages: true}).load();
      
      return {
        id: crypto.randomUUID(),
        content: result[0].pageContent.trim(),
        metadata: {
          sourceFile: filePath,
          loadedAt: new Date().toISOString(),
        },
        sourceFile: filePath,
      };
    } catch (error) {
      throw new Error(`Failed to load PDF file ${filePath}: ${error}`);
    }
  }

  /**
   * Loads all PDF files from a directory
   * @param inputDir Directory containing PDF files
   * @returns Array of profile data objects
   */
  public async loadProfiles(inputDir: string): Promise<ProfileData[]> {
    try {
      const files = await readdir(inputDir);
      if (this.debug) {
        console.log(`Found ${files.length} files in ${inputDir}`);
      }
      const pdfFiles = files.filter((file) => file.toLowerCase().endsWith('.pdf'));
      if (this.debug) {
        console.log(`Found ${pdfFiles.length} PDF files in ${inputDir}`);
      }

      if (pdfFiles.length === 0) {
        throw new Error(`No PDF files found in ${inputDir}`);
      }

      const profiles: ProfileData[] = [];
      for (const file of pdfFiles) {
        try {
          const profile = await this.loadProfileFromPdf(join(inputDir, file));
          profiles.push(profile);
        } catch (error) {
          if (this.debug) {
            console.error(`Failed to load ${file}: ${error}`);
          }
          // Continue loading other files even if one fails
        }
      }

      if (profiles.length === 0) {
        throw new Error('Failed to load any PDF files');
      }

      return profiles;
    } catch (error) {
      if (this.debug) {
        console.error(`Failed to load profiles from ${inputDir}: ${error}`);
      }
      throw new Error(`Failed to load profiles from ${inputDir}: ${error}`);
    }
  }
}

/**
 * Node handler for loading profiles from PDF files
 * @param state Current normalization state
 * @returns Updated state with loaded profiles
 */
export const loadProfilesNode: RunnableFunc<NormalizationState, NormalizationState> = async (
  state: NormalizationState
): Promise<NormalizationState> => {
  const loader = new ProfileLoader();
  const profiles = await loader.loadProfiles(state.runInfo.inputDir);

  return {
    ...state,
    status: 'normalizing',
    profiles,
    summary: {
      ...state.summary,
      totalProfiles: profiles.length,
    },
  };
};
