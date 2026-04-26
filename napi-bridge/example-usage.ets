// Placeholder example for future HarmonyOS integration.
// The native module name and import path will need to match the final HAP setup.

export interface TypesettingLayoutSummary {
  pageCount: number;
  totalBlocks: number;
  warningCount: number;
}

export interface TypesettingNativeModule {
  createTypesettingEngine(): object;
  destroyTypesettingEngine(handle: object): void;
  layoutHtml(
    handle: object,
    html: string,
    chapterId: string,
    width: number,
    height: number,
    fontSize?: number,
  ): TypesettingLayoutSummary;
}
