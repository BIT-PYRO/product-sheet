'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Preloader({ onComplete }) {
  const [phase, setPhase] = useState('full'); // 'full', 'collapse', 'done'

  useEffect(() => {
    // Phase 1: show full "JANKI" for 1.5s
    const t1 = setTimeout(() => {
      setPhase('collapse');
    }, 1500);

    // Phase 2: Collapse takes about 0.8s
    const t2 = setTimeout(() => {
      setPhase('done');
      if (onComplete) onComplete();
    }, 2300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50 dark:bg-[#0A192F]"
        >
          <div className="flex items-center text-7xl md:text-9xl font-bold tracking-tight text-slate-900 dark:text-white overflow-hidden">
            <motion.div layoutId="logo-j" className="z-10">
              J
            </motion.div>
            <AnimatePresence>
              {phase === 'full' && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
                  className="origin-left"
                >
                  ANKI
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
