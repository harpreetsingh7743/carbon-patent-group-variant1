import { motion } from 'framer-motion'
import { useEffect } from 'react'

const introTitleEnterEase = [0.16, 1, 0.3, 1] as const
const introTitleEnterDuration = 0.65
const introTitleExitDuration = 0.55

function WhyCarbonIntroTitle({
  phase,
  prefersReducedMotion,
  onExitComplete,
}: WhyCarbonIntroTitleProps) {
  const isExiting = phase === 'exiting'

  useEffect(() => {
    if (prefersReducedMotion && isExiting) {
      onExitComplete()
    }
  }, [isExiting, onExitComplete, prefersReducedMotion])

  if (prefersReducedMotion) {
    if (isExiting) {
      return null
    }

    return (
      <div className="intro-section__why-carbon-intro" aria-hidden={false}>
        <h2 className="intro-section__why-carbon-intro-title">Why Carbon</h2>
      </div>
    )
  }

  return (
    <div className="intro-section__why-carbon-intro" aria-hidden={false}>
      <motion.h2
        className="intro-section__why-carbon-intro-title"
        initial={{ opacity: 0, y: 48, scale: 0.985 }}
        animate={
          isExiting
            ? {
                opacity: 0,
                y: -72,
                scale: 0.968,
                filter: 'blur(4px)',
              }
            : {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'blur(0px)',
              }
        }
        transition={
          isExiting
            ? { duration: introTitleExitDuration, ease: introTitleEnterEase }
            : { duration: introTitleEnterDuration, ease: introTitleEnterEase }
        }
        onAnimationComplete={() => {
          if (isExiting) {
            onExitComplete()
          }
        }}
      >
        Why Carbon
      </motion.h2>
    </div>
  )
}

export default WhyCarbonIntroTitle
