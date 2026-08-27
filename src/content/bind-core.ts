import * as LearningPlatformCore from "@learning-platform/core";

const root = globalThis as { LearningPlatformCore?: typeof LearningPlatformCore };
if (!root.LearningPlatformCore) {
  root.LearningPlatformCore = LearningPlatformCore;
}
