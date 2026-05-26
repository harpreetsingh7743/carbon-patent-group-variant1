import type { RefObject } from 'react'

export interface AnimatedWordsTextProps {
  text: string
  className?: string
  scrollRootRef?: RefObject<HTMLElement | null>
  prefersReducedMotion?: boolean
}
