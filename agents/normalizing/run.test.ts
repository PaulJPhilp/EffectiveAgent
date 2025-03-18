import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { join } from 'path';
import { runNormalizingAgent, type RunOptions } from './run';
import { NormalizingAgent } from './agent';
import type { NormalizationState } from './state';

/**
 * Mock interfaces following Fred's testing guidelines
 */
interface MockPdfParseResult {
  readonly numpages: number;
  readonly numrender: number;
  readonly text: string;
  readonly version: string;
}

interface MockFs {
  readonly readFile: Mock<[path: string], Promise<Buffer>>;
  readonly readdir: Mock<[path: string], Promise<string[]>>;
}

interface MockDependencies {
  readonly fs: MockFs;
  readonly pdfParse: Mock<[buffer: Buffer], Promise<MockPdfParseResult>>;
  readonly dotenv: { readonly config: Mock<[], void> };
}

type MockState = Pick<NormalizationState, 'summary'> & {
  readonly summary: {
    readonly totalProfiles: number;
    readonly successfulNormalizations: number;
    readonly failedNormalizations: number;
    readonly totalDuration: number;
    readonly totalTokensUsed: number;
    readonly averageConfidence: number;
  };
};

interface TestContext {
  readonly mockState: MockState;
  readonly agent: NormalizingAgent;
  readonly deps: MockDependencies;
}

// Create strongly-typed mocks
const createMockFs = (): MockFs => ({
  readFile: vi.fn<[string], Promise<Buffer>>()
    .mockResolvedValue(Buffer.from('mock pdf content')),
  readdir: vi.fn<[string], Promise<string[]>>()
    .mockResolvedValue(['test.pdf']),
});

const createMockPdfParse = (): Mock<[Buffer], Promise<MockPdfParseResult>> =>
  vi.fn<[Buffer], Promise<MockPdfParseResult>>()
    .mockResolvedValue({
      numpages: 1,
      numrender: 1,
      text: 'Sample PDF content',
      version: '1.10.100',
    });

const createMockDotenv = () => ({
  config: vi.fn<[], void>(),
});

// Mock external dependencies with proper types
vi.mock('fs/promises', () => createMockFs());
vi.mock('pdf-parse', () => ({ default: createMockPdfParse() }));
vi.mock('dotenv', () => createMockDotenv());
vi.mock('./agent');

const createTestContext = (): TestContext => {
  const mockState: MockState = {
    summary: {
      totalProfiles: 1,
      successfulNormalizations: 1,
      failedNormalizations: 0,
      totalDuration: 1000,
      totalTokensUsed: 100,
      averageConfidence: 0.95,
    },
  };
  
  const agent = new NormalizingAgent({ configPath: './config/config.json' });
  //vi.mocked(agent.run).mockResolvedValue(mockState as NormalizationState);
  
  const deps = {
    fs: createMockFs(),
    pdfParse: createMockPdfParse(),
    dotenv: createMockDotenv(),
  };
  
  return { mockState, agent, deps };
};

describe('runNormalizingAgent', () => {
  let context: TestContext;
  
  beforeEach(() => {
    context = createTestContext();
    vi.mocked(NormalizingAgent).mockImplementation(() => context.agent);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should run with default output directory', async () => {
    const inputDir = '/test/input';
    const expectedOutputDir = join(process.cwd(), 'output');
    await runNormalizingAgent({ inputDir });
    expect(context.agent.run).toHaveBeenCalledWith(inputDir, expectedOutputDir);
  });

  it('should run with custom output directory', async () => {
    const inputDir = '/test/input';
    const customOutputDir = '/custom/output';
    await runNormalizingAgent({ inputDir, outputDir: customOutputDir });
    expect(context.agent.run).toHaveBeenCalledWith(inputDir, customOutputDir);
  });

  it('should handle errors gracefully', async () => {
    const inputDir = '/test/input';
    const error = new Error('Test error');
    vi.mocked(context.agent.run).mockRejectedValue(error);
    const mockExit = vi.spyOn(process, 'exit')
      .mockImplementation(() => { throw new Error('process.exit'); });
    
    await expect(runNormalizingAgent({ inputDir }))
      .rejects
      .toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
