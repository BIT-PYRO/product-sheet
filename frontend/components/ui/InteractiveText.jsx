'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const repelDistance = 100;
const repelForce = 50;

function AnimatedLetter({ children, mouseX, mouseY }) {
  const ref = useRef(null);

  const dx = useMotionValue(0);
  const dy = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 300, mass: 1 };
  const springX = useSpring(dx, springConfig);
  const springY = useSpring(dy, springConfig);

  useEffect(() => {
    const calculateDistance = () => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      // Center of the letter
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mX = mouseX.get();
      const mY = mouseY.get();

      // If mouse is not tracked (e.g. initial state), do nothing
      if (mX === -1000 || mY === -1000) return;

      const distX = centerX - mX;
      const distY = centerY - mY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      if (distance < repelDistance) {
        // Calculate repulsion strength (closer = stronger)
        const strength = (repelDistance - distance) / repelDistance;
        const angle = Math.atan2(distY, distX);

        dx.set(Math.cos(angle) * strength * repelForce);
        dy.set(Math.sin(angle) * strength * repelForce);
      } else {
        dx.set(0);
        dy.set(0);
      }
    };

    // Calculate immediately and also on mouse change
    calculateDistance();
    const unsubscribeX = mouseX.on("change", calculateDistance);
    const unsubscribeY = mouseY.on("change", calculateDistance);

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [mouseX, mouseY, dx, dy]);

  // Ensure normal spaces are respected. Provide a tiny margin if it's empty or space.
  if (children === ' ') {
    return <span className="inline-block w-[0.3em]">&nbsp;</span>;
  }

  return (
    <motion.span
      ref={ref}
      style={{ x: springX, y: springY }}
      className="inline-block relative"
    >
      {children}
    </motion.span>
  );
}

export default function InteractiveText({ text, className = "", Component = "span", ...props }) {
  // Avoid hydration error by ensuring the component only fully renders after mount,
  // but to prevent SEO loss or jank, we can render normal text first, then interactive.
  const [mounted, setMounted] = useState(false);
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  useEffect(() => {
    setMounted(true);

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    // Global listener so repulsion happens even if mouse is not exactly on the text
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Split text into words, then words into letters. 
  // We keep words together in their own inline-block to prevent bad line breaks.
  const words = text.split(' ');

  if (!mounted) {
    return <Component className={className} {...props}>{text}</Component>;
  }

  return (
    <Component className={`${className} flex flex-wrap`} style={{ display: 'inline-flex', columnGap: '0.3em' }} {...props}>
      {words.map((word, wordIndex) => (
        <span key={`word-${wordIndex}`} className="inline-flex whitespace-nowrap">
          {word.split('').map((char, charIndex) => (
            <AnimatedLetter 
              key={`char-${wordIndex}-${charIndex}`} 
              mouseX={mouseX} 
              mouseY={mouseY}
            >
              {char}
            </AnimatedLetter>
          ))}
        </span>
      ))}
    </Component>
  );
}
