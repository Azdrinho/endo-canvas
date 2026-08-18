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
        >
          <EndoCanvasLogo className="h-14 md:h-16 w-auto fill-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.25)]" />

          {/* Anchored to the bottom-right corner of the Endocanvas logo, not
              centered as a separate block below it. */}
          <div className="absolute right-0 top-full translate-y-3 flex items-center gap-2">
            <span className="text-white/75 text-xs font-normal uppercase tracking-[0.15em] whitespace-nowrap">Powered by:</span>
            <SalsaLogo variant="light" className="h-6 w-20 shrink-0" />
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
