'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import InteractiveText from './InteractiveText';

export default function SmartStatCard({ icon, title, desc, metrics, index }) {
  const [isHovered, setIsHovered] = useState(false);

  // Assuming a 3-column grid. Indices 0, 1, 2 are top row. 3, 4, 5 are bottom row.
  const isTopRow = index < 3;
  
  // Top row expands upwards -> origin is bottom
  // Bottom row expands downwards -> origin is top
  const transformOrigin = isTopRow ? 'bottom center' : 'top center';

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ transformOrigin }}
      animate={{
        scale: isHovered ? 1.08 : 1,
        zIndex: isHovered ? 20 : 1, // bring to front
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative w-full backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 rounded-[24px] p-6 shadow-lg dark:shadow-none transition-colors overflow-hidden"
    >
      <div className="flex flex-col h-full">
        <InteractiveText Component="h3" text={title} className="text-slate-900 dark:text-white text-xl font-medium mb-2" />
        <InteractiveText Component="p" text={desc} className="text-slate-600 dark:text-white/75 text-sm mb-4" />

        {/* Expandable Section */}
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: isHovered ? 'auto' : 0,
            opacity: isHovered ? 1 : 0,
            marginTop: isHovered ? 16 : 0,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            {metrics.map((metric, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  {metric.label}
                </span>
                <span className="text-sm text-slate-900 dark:text-white font-medium mt-1">
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
