interface HeroSectionProps {
  description?: string
  actionLabel?: string
  actionHref?: string
}

interface HeroParticleMouseState {
  x: number
  y: number
  active: boolean
}

interface HeroParticlePoint {
  x: number
  y: number
  size: number
  opacity: number
}
