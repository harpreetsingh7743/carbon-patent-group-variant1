import { motion } from 'framer-motion'
import { forwardRef, Fragment } from 'react'

import type { AnimatedWordsTextProps } from './types'
import './styles.css'

const wordRevealEase = [0.22, 1, 0.36, 1] as const

const animatedWordsContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.06,
    },
  },
}

const animatedWordVariants = {
  hidden: {
    y: '110%',
  },
  visible: {
    y: 0,
    transition: {
      duration: 0.55,
      ease: wordRevealEase,
    },
  },
}

function splitTextIntoWords(text: string) {
  return text.split(/\s+/).filter(Boolean)
}

const AnimatedWordsText = forwardRef<HTMLParagraphElement, AnimatedWordsTextProps>(
  function AnimatedWordsText(
    { text, className = '', prefersReducedMotion = false, shouldAnimate = false },
    ref,
  ) {
    const words = splitTextIntoWords(text)

    if (prefersReducedMotion) {
      return (
        <p ref={ref} className={className}>
          {text}
        </p>
      )
    }

    return (
      <motion.p
        ref={ref}
        className={className}
        data-animate="words"
        data-animated={shouldAnimate ? '' : undefined}
        initial="hidden"
        animate={shouldAnimate ? 'visible' : 'hidden'}
        variants={animatedWordsContainerVariants}
      >
        {words.map((word, wordIndex) => (
          <Fragment key={`${wordIndex}-${word}`}>
            {wordIndex > 0 ? ' ' : null}
            <span className="animated-words-text__word-mask" aria-hidden={false}>
              <motion.span
                className="animated-words-text__word"
                variants={animatedWordVariants}
              >
                {word}
              </motion.span>
            </span>
          </Fragment>
        ))}
      </motion.p>
    )
  },
)

export default AnimatedWordsText
