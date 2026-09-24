import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SalsaLogo } from './SalsaLogo';
import { EndoCanvasLogo } from './EndoCanvasLogo';
import { FluidGradientCanvas } from './FluidGradientCanvas';

interface LoadingScreenProps {
  show: boolean;
}

// Full-screen splash shown while the app boots. The background is a real
// per-frame animated aurora (see FluidGradientCanvas) — several soft color
// masses in the header's exact cyan/purple/darker-cyan pair, each moving on
// its own sine/cosine path and additively blended, rather than a single CSS
// gradient shape being nudged around. When `show` flips false, the whole
// screen (gradient + logo, as one unit) rises off-screen on a custom bezier,
// revealing the app underneath.
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ show }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        key="loading-screen"
        initial={{ y: 0 }}
        exit={{ y: '-100%' }}
        transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
      >
        <FluidGradientCanvas />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 inline-block"
          // Two stacked shadows — a tight dark halo plus a wider soft one —
          // because the pale lagoon end of the gradient is light enough that a
          // white wordmark on a single downward shadow loses its edges.
          style={{ filter: 'drop-shadow(0 1px 2px rgba(20,16,40,0.45)) drop-shadow(0 6px 28px rgba(20,16,40,0.35))' }}
        >
          <EndoCanvasLogo className="h-14 md:h-16 w-auto fill-white" />

          {/* Anchored to the bottom-right corner of the Endocanvas logo, not
              centered as a separate block below it. */}
          <div className="absolute right-0 top-full translate-y-3 flex items-center gap-2">
            <span className="text-white/90 text-xs font-normal uppercase tracking-[0.15em] whitespace-nowrap">Powered by:</span>
            <SalsaLogo variant="light" className="h-6 w-20 shrink-0" />
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
