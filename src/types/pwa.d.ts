/**
 * PWA-related TypeScript definitions
 * @description Type definitions for Progressive Web App features including install prompt events
 */

/**
 * BeforeInstallPromptEvent is fired when the browser detects the app can be installed
 */
interface BeforeInstallPromptEvent extends Event {
  /**
   * Array of platforms the app can be installed on
   */
  readonly platforms: string[];
  
  /**
   * Promise that resolves when the user makes a choice about installing
   */
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  
  /**
   * Shows the install prompt to the user
   */
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export {};
