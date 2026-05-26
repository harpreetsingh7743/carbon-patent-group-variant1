import { motion, useInView } from 'framer-motion'
import { Fragment, useRef } from 'react'

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

function AnimatedWordsText({
  text,
  className = '',
  scrollRootRef,
  prefersReducedMotion = false,
}: AnimatedWordsTextProps) {
  const paragraphRef = useRef<HTMLParagraphElement>(null)
  const isParagraphInView = useInView(paragraphRef, {
    root: scrollRootRef,
    amount: 0.2,
    once: true,
  })
  const words = splitTextIntoWords(text)

  if (prefersReducedMotion) {
    return <p className={className}>{text}</p>
  }

  return (
    <motion.p
      ref={paragraphRef}
      className={className}
      data-animate="words"
      data-animated={isParagraphInView ? '' : undefined}
      initial="hidden"
      animate={isParagraphInView ? 'visible' : 'hidden'}
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
}

export default AnimatedWordsText
