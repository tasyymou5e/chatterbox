/**
 * Illustrations - Centralized illustration system
 * 
 * Exports:
 * - KidsIllustration: Open Doodles style for Kids Portal
 * - ProfessionalIllustration: unDraw style for Parent/Admin
 * - WaveBackground: Haikei-style wave backgrounds
 * - EmptyStateWithIllustration: Reusable empty states
 */

export { 
  IllustrationWrapper, 
  IllustrationSkeleton,
  createLazyIllustration,
  type IllustrationSize,
  type IllustrationAnimation,
} from './IllustrationWrapper';

export { 
  KidsIllustration,
  type KidsIllustrationVariant,
} from './KidsIllustration';

export {
  ProfessionalIllustration,
  type ProfessionalIllustrationVariant,
} from './ProfessionalIllustration';

export { 
  WaveBackground,
  WaveDivider,
  type WaveVariant,
  type WavePosition,
} from './WaveBackground';

export {
  EmptyStateWithIllustration,
  KidsEmptyState,
  KidsLoadingState,
  KidsBreakState,
} from './EmptyStateWithIllustration';
