import { motion } from 'framer-motion'
import { forwardRef } from 'react'

import './styles.css'

const LogoCard = forwardRef<HTMLDivElement, LogoCardProps>(function LogoCard(
  {
    imageAlt = 'Faceted blue maple leaf illustration',
    className = '',
    style,
    clipPath,
    isHidden = false,
  },
  ref,
) {
  const classNames = ['logo-card', className, isHidden ? 'logo-card--hidden' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <motion.div
      ref={ref}
      className={classNames}
      data-transition-source="logo-card"
      style={{ ...style, clipPath }}
      aria-hidden={isHidden ? true : undefined}
    >
      <span className="logo-card__highlight" aria-hidden="true" />

      <img
        className="logo-card__image"
        src="/leaf_three.png"
        alt={imageAlt}
        loading="lazy"
      />
    </motion.div>
  )
})

export default LogoCard
