import { Platform } from 'react-native';

const IS_DEV = __DEV__;

class PerfLogger {
  private marks: Record<string, number> = {};

  mark(name: string) {
    if (!IS_DEV) return;
    this.marks[name] = performance.now();
  }

  measure(name: string, startMark: string) {
    if (!IS_DEV) return;
    const start = this.marks[startMark];
    if (!start) return;
    const duration = performance.now() - start;
    console.log(`⏱️ [PERF] ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  logRender(componentName: string) {
    if (!IS_DEV) return;
    console.log(`🔄 [RENDER] ${componentName}`);
  }

  logQuery(queryName: string, durationMs: number) {
    if (!IS_DEV) return;
    const icon = durationMs > 500 ? '⚠️' : '⚡';
    console.log(`${icon} [QUERY] ${queryName} took ${durationMs.toFixed(2)}ms`);
  }
}

export const perf = new PerfLogger();
