'use client'
import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export const fadeInUp = {
  initial:    { opacity: 0, y: 12 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: 'easeOut' },
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
}

export const staggerItem = {
  initial:    { opacity: 0, y: 8 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.18, ease: 'easeOut' },
}
