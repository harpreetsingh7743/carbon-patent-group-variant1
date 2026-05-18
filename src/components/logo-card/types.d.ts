import type { MotionStyle } from 'framer-motion'
import type { Ref } from 'react'

interface LogoCardProps {
  imageAlt?: string
  className?: string
  style?: MotionStyle
  clipPath?: MotionStyle['clipPath']
  cardRef?: Ref<HTMLDivElement>
  isHidden?: boolean
}

interface LogoCardRect {
  top: number
  left: number
  width: number
  height: number
}
