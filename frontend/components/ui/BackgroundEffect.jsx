'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function BackgroundEffect() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate 30 random particles
  const particles = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100, // random start horizontal position (%)
    y: Math.random() * 100, // random start vertical position (%)
    size: Math.random() * 3 + 1, // random size between 1px and 4px
    duration: Math.random() * 20 + 10, // random animation duration
    delay: Math.random() * 5, // random delay
  }));

  if (!mounted) return null; // Avoid hydration mismatch on random values

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Grid Overlay Removed */}

      {/* 2. Three Massive Floating Orbs */}
      <motion.div
        animate={{
          x: ['-10%', '20%', '-10%'],
          y: ['-10%', '30%', '-10%'],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/20 dark:bg-blue-600/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen"
      />
      <motion.div
        animate={{
          x: ['20%', '-20%', '20%'],
          y: ['20%', '-10%', '20%'],
          scale: [1.2, 1, 1.2],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/20 dark:bg-indigo-600/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen"
      />
      <motion.div
        animate={{
          x: ['-10%', '30%', '-10%'],
          y: ['30%', '-20%', '30%'],
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-violet-400/20 dark:bg-violet-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen"
      />

      {/* 3. Floating Particles System */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ 
            opacity: 0, 
            y: `${particle.y}vh`, 
            x: `${particle.x}vw` 
          }}
          animate={{ 
            opacity: [0, 0.8, 0], 
            y: [`${particle.y}vh`, `${particle.y - 40}vh`],
            x: [`${particle.x}vw`, `${particle.x + (Math.random() * 10 - 5)}vw`]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "linear"
          }}
          className="absolute rounded-full bg-blue-500/40 dark:bg-blue-300/60 shadow-[0_0_10px_rgba(59,130,246,0.8)] dark:shadow-[0_0_10px_rgba(147,197,253,0.8)]"
          style={{
            width: particle.size,
            height: particle.size,
          }}
        />
      ))}
      
      {/* Light Gradient overlay to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/40 dark:from-black/40 dark:via-transparent dark:to-black/40" />
    </div>
  );
}
