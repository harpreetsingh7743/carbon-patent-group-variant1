import { useEffect, useRef } from 'react'

import './styles.css'

const PARTICLE_GRID_GAP = 25
const PARTICLE_REPEL_RADIUS = 130
const PARTICLE_PULL_STRENGTH = 0.018
const PARTICLE_DAMPING = 0.92
const PARTICLE_GLOW_COLOR = 'rgba(98, 185, 255, 0.16)'
const PARTICLE_FILL_COLOR = 'rgba(120, 205, 255, 0.96)'
const PARTICLE_IDLE_VELOCITY_THRESHOLD = 0.02
const PARTICLE_IDLE_OFFSET_THRESHOLD = 0.02

class IntroBackgroundParticle {
  x: number
  y: number
  baseX: number
  baseY: number
  size: number
  opacity: number
  velocityX: number
  velocityY: number

  constructor({ x, y, size, opacity }: IntroParticleSeed) {
    this.baseX = x
    this.baseY = y
    this.x = x
    this.y = y
    this.size = size
    this.opacity = opacity
    this.velocityX = 0
    this.velocityY = 0
  }

  update(mouseState: IntroParticleMouseState) {
    if (mouseState.active) {
      const deltaX = this.x - mouseState.x
      const deltaY = this.y - mouseState.y
      const distance = Math.hypot(deltaX, deltaY) || 1

      if (distance < PARTICLE_REPEL_RADIUS) {
        const repelForce = (PARTICLE_REPEL_RADIUS - distance) / PARTICLE_REPEL_RADIUS

        this.velocityX += (deltaX / distance) * repelForce * 1.45
        this.velocityY += (deltaY / distance) * repelForce * 1.45
      }
    }

    this.velocityX += (this.baseX - this.x) * PARTICLE_PULL_STRENGTH
    this.velocityY += (this.baseY - this.y) * PARTICLE_PULL_STRENGTH
    this.velocityX *= PARTICLE_DAMPING
    this.velocityY *= PARTICLE_DAMPING
    this.x += this.velocityX
    this.y += this.velocityY
  }

  draw(context: CanvasRenderingContext2D) {
    context.globalAlpha = this.opacity
    context.fillRect(
      Math.round(this.x - this.size / 2),
      Math.round(this.y - this.size / 2),
      this.size,
      this.size,
    )
  }

  isMoving() {
    const offsetX = Math.abs(this.baseX - this.x)
    const offsetY = Math.abs(this.baseY - this.y)
    const velocity = Math.abs(this.velocityX) + Math.abs(this.velocityY)

    return (
      velocity > PARTICLE_IDLE_VELOCITY_THRESHOLD ||
      offsetX > PARTICLE_IDLE_OFFSET_THRESHOLD ||
      offsetY > PARTICLE_IDLE_OFFSET_THRESHOLD
    )
  }
}

function createParticleSeeds(canvasWidth: number, canvasHeight: number) {
  const particleSeeds: IntroParticleSeed[] = []
  const startX = PARTICLE_GRID_GAP / 2
  const startY = PARTICLE_GRID_GAP / 2

  for (let y = startY; y < canvasHeight; y += PARTICLE_GRID_GAP) {
    for (let x = startX; x < canvasWidth; x += PARTICLE_GRID_GAP) {
      const normalizedX = x / Math.max(canvasWidth, 1)
      const normalizedY = y / Math.max(canvasHeight, 1)
      const waveOffset = Math.sin(normalizedX * Math.PI * 4) + Math.cos(normalizedY * Math.PI * 3)

      particleSeeds.push({
        x,
        y,
        size: 1.35 + ((waveOffset + 2) / 4) * 0.85,
        opacity: 0.34 + ((waveOffset + 2) / 4) * 0.28,
      })
    }
  }

  return particleSeeds
}

function createParticles(canvasWidth: number, canvasHeight: number) {
  return createParticleSeeds(canvasWidth, canvasHeight).map(
    (particleSeed) => new IntroBackgroundParticle(particleSeed),
  )
}

const defaultParagraphs = [
  "Strong patents don't happen by accident. They're built through precise drafting, experienced prosecution, and advice that connects technical detail to commercial reality.",
  'Carbon Patents does one thing; we secure and manage patent rights in Canada. Our team works across life sciences, pharmaceuticals, chemistry, medical devices, software, electrical, mechanical, and emerging technologies. We have the depth of experience to handle complex subject matter and the focus to get it right.',
]

function IntroSection({
  title = 'Intro',
  paragraphs = defaultParagraphs,
  imageAlt = 'Faceted blue maple leaf illustration',
}: IntroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const contentParagraphs = paragraphs.length > 0 ? paragraphs : defaultParagraphs

  useEffect(() => {
    const sectionElement = sectionRef.current
    const canvasElement = particleCanvasRef.current

    if (!sectionElement || !canvasElement) {
      return
    }

    const context = canvasElement.getContext('2d', { alpha: true })

    if (!context) {
      return
    }

    const mouseState: IntroParticleMouseState = { x: 0, y: 0, active: false }
    let animationFrameId = 0
    let canvasWidth = 0
    let canvasHeight = 0
    let isSectionVisible = true
    let isAnimationRunning = false
    let particles: IntroBackgroundParticle[] = []

    const setupCanvasDimensions = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

      canvasWidth = Math.max(1, Math.floor(sectionElement.clientWidth))
      canvasHeight = Math.max(1, Math.floor(sectionElement.clientHeight))

      canvasElement.width = Math.floor(canvasWidth * pixelRatio)
      canvasElement.height = Math.floor(canvasHeight * pixelRatio)
      canvasElement.style.width = `${canvasWidth}px`
      canvasElement.style.height = `${canvasHeight}px`

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const drawParticleField = () => {
      let hasActiveMotion = mouseState.active

      context.clearRect(0, 0, canvasWidth, canvasHeight)
      context.fillStyle = PARTICLE_FILL_COLOR
      context.shadowColor = PARTICLE_GLOW_COLOR
      context.shadowBlur = mouseState.active ? 4 : 0

      for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
        particles[particleIndex].update(mouseState)
        particles[particleIndex].draw(context)

        if (!hasActiveMotion && particles[particleIndex].isMoving()) {
          hasActiveMotion = true
        }
      }

      context.globalAlpha = 1
      context.shadowBlur = 0

      return hasActiveMotion
    }

    const rebuildParticleField = () => {
      setupCanvasDimensions()
      particles = createParticles(canvasWidth, canvasHeight)
      drawParticleField()
    }

    const animateParticleField = () => {
      if (!isSectionVisible) {
        isAnimationRunning = false
        return
      }

      const hasActiveMotion = drawParticleField()

      if (!hasActiveMotion) {
        isAnimationRunning = false
        return
      }

      animationFrameId = window.requestAnimationFrame(animateParticleField)
    }

    const startParticleAnimation = () => {
      if (isAnimationRunning || !particles.length || !isSectionVisible) {
        return
      }

      isAnimationRunning = true
      animationFrameId = window.requestAnimationFrame(animateParticleField)
    }

    const stopParticleAnimation = () => {
      window.cancelAnimationFrame(animationFrameId)
      isAnimationRunning = false
    }

    const handlePointerMove = (event: PointerEvent) => {
      const sectionBounds = sectionElement.getBoundingClientRect()

      mouseState.x = event.clientX - sectionBounds.left
      mouseState.y = event.clientY - sectionBounds.top
      mouseState.active = true
      startParticleAnimation()
    }

    const handlePointerLeave = () => {
      mouseState.active = false
      startParticleAnimation()
    }

    const handleResize = () => {
      rebuildParticleField()
      startParticleAnimation()
    }

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isSectionVisible = entry.isIntersecting

          if (entry.isIntersecting) {
            startParticleAnimation()
          } else {
            stopParticleAnimation()
          }
        })
      },
      { threshold: 0.16 },
    )

    visibilityObserver.observe(sectionElement)
    rebuildParticleField()
    startParticleAnimation()

    window.addEventListener('resize', handleResize)
    sectionElement.addEventListener('pointermove', handlePointerMove)
    sectionElement.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      stopParticleAnimation()
      window.removeEventListener('resize', handleResize)
      sectionElement.removeEventListener('pointermove', handlePointerMove)
      sectionElement.removeEventListener('pointerleave', handlePointerLeave)
      visibilityObserver.disconnect()
    }
  }, [])

  return (
    <section ref={sectionRef} className="intro-section" aria-labelledby="intro-section-title">
      <canvas
        ref={particleCanvasRef}
        className="intro-section__particle-canvas"
        aria-hidden="true"
      />

      <div className="intro-section__background-overlay" aria-hidden="true" />

      <div className="intro-section__container">
        <div className="intro-section__visual-shell">
          <div className="intro-section__visual-card" data-motion-target="intro-card">
            <span className="intro-section__visual-highlight" aria-hidden="true" />

            <img
              className="intro-section__visual-image"
              src="/leaf_three.png"
              alt={imageAlt}
              loading="lazy"
            />
          </div>
        </div>

        <div className="intro-section__content" data-motion-target="intro-copy">
          <h2 id="intro-section-title" className="intro-section__title">
            {title}
          </h2>

          <div className="intro-section__copy">
            {contentParagraphs.map((paragraph, paragraphIndex) => (
              <p key={`${paragraphIndex}-${paragraph.slice(0, 18)}`} className="intro-section__paragraph">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default IntroSection
