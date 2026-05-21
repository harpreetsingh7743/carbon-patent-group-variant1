interface IntroSectionProps {
  title?: string
  paragraphs?: string[]
  imageAlt?: string
}

interface IntroParticleMouseState {
  x: number
  y: number
  active: boolean
}

interface IntroParticleSeed {
  x: number
  y: number
  size: number
  opacity: number
}

interface IntroVisualCardRect {
  top: number
  left: number
  width: number
  height: number
}

interface WhyCarbonStep {
  title: string
  description: string
}

interface WhyCarbonOverlayProps {
  activeStepIndex: number
  slideDirection: number
  prefersReducedMotion: boolean
}
