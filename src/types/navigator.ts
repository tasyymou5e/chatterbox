/**
 * Browser API type extensions for WebAudio and Performance
 */

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }

  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

export {};
