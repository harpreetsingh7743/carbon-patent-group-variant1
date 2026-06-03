import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'

import './styles.css'

const PARTICLE_IMAGE_SOURCE = '/leafparticles.png'
const PARTICLE_SAMPLE_STEP = 6
const PARTICLE_MAX_COUNT = 4500
const PARTICLE_MOBILE_SAMPLE_STEP = 8
const PARTICLE_MOBILE_MAX_COUNT = 2200
const REVERTED_PARTICLE_SAMPLE_STEP = 6
const REVERTED_PARTICLE_MAX_COUNT = 4000
const PARTICLE_SAMPLE_MAX_WIDTH = 960
const PARTICLE_REPEL_RADIUS = 120
const PARTICLE_PULL_STRENGTH = 0.028
const PARTICLE_DAMPING = 0.9
const PARTICLE_FILL_COLOR = 'rgba(99, 213, 255, 1)'
const PARTICLE_IDLE_VELOCITY_THRESHOLD = 0.02
const PARTICLE_IDLE_OFFSET_THRESHOLD = 0.02
const PARTICLE_THRESHOLD_ALPHA = 120
const PARTICLE_THRESHOLD_BRIGHTNESS = 48
// Toggle between the original leaf mask and the inverted leaf cutout mode.
const isReverted = false

class HeroParticle {
  x: number
  y: number
  baseX: number
  baseY: number
  size: number
  opacity: number
  velocityX: number
  velocityY: number

  constructor({ x, y, size, opacity }: HeroParticlePoint) {
    this.baseX = x
    this.baseY = y
    this.x = x
    this.y = y
    this.size = size
    this.opacity = opacity
    this.velocityX = 0
    this.velocityY = 0
  }

  update(mouseState: HeroParticleMouseState) {
    if (mouseState.active) {
      const deltaX = this.x - mouseState.x
      const deltaY = this.y - mouseState.y
      const distance = Math.hypot(deltaX, deltaY) || 1

      if (distance < PARTICLE_REPEL_RADIUS) {
        const repelForce = (PARTICLE_REPEL_RADIUS - distance) / PARTICLE_REPEL_RADIUS
        this.velocityX += (deltaX / distance) * repelForce * 1.8
        this.velocityY += (deltaY / distance) * repelForce * 1.8
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
    context.fillRect(this.x, this.y, this.size, this.size)
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

function getParticleSize(brightness: number) {
  return 0.8 + (brightness / 255) * 2
}

function getParticleOpacity(brightness: number, alpha: number) {
  const normalizedBrightness = brightness / 255
  const normalizedAlpha = alpha / 255

  return Math.min(1, 0.28 + normalizedBrightness * 0.72) * normalizedAlpha
}

function isMobileViewport() {
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.innerWidth < 768
  )
}

function getCanvasPixelRatio() {
  return isMobileViewport() ? 1 : Math.min(window.devicePixelRatio || 1, 2)
}

function getParticleSampleStep(
  canvasWidth: number,
  canvasHeight: number,
  isRevertedMode: boolean,
) {
  if (!isRevertedMode) {
    return isMobileViewport() ? PARTICLE_MOBILE_SAMPLE_STEP : PARTICLE_SAMPLE_STEP
  }

  const canvasArea = canvasWidth * canvasHeight
  const revertedSampleStep = Math.ceil(
    Math.sqrt(canvasArea / REVERTED_PARTICLE_MAX_COUNT),
  )

  return Math.max(REVERTED_PARTICLE_SAMPLE_STEP, revertedSampleStep)
}

function getParticleMaxCount(isRevertedMode: boolean) {
  if (isRevertedMode) {
    return REVERTED_PARTICLE_MAX_COUNT
  }

  return isMobileViewport() ? PARTICLE_MOBILE_MAX_COUNT : PARTICLE_MAX_COUNT
}

function getRevertedParticleSize(x: number, y: number) {
  const sizeSeed = (x * 13 + y * 7) % 11

  return 0.75 + sizeSeed * 0.06
}

function getRevertedParticleOpacity(x: number, y: number) {
  const opacitySeed = (x * 5 + y * 3) % 9

  return 0.34 + opacitySeed * 0.045
}

function HeroSection({
  description = 'Carbon Patents is a tier-1 Canadian patent prosecution boutique trusted by innovative companies, research institutions, and foreign law firms worldwide.',
  actionLabel = 'For Foreign Agents',
  actionHref = '#foreign-agents',
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      return
    }

    const sectionElement = sectionRef.current
    const canvasElement = particleCanvasRef.current

    if (!sectionElement || !canvasElement) {
      return
    }

    const context = canvasElement.getContext('2d', { alpha: true })

    if (!context) {
      return
    }

    const particleImage = new Image()
    const mouseState: HeroParticleMouseState = { x: 0, y: 0, active: false }
    let animationFrameId = 0
    let canvasWidth = 0
    let canvasHeight = 0
    let isSectionVisible = true
    let isAnimationRunning = false
    let particles: HeroParticle[] = []

    const setupCanvas = () => {
      const pixelRatio = getCanvasPixelRatio()

      canvasWidth = Math.max(1, Math.floor(sectionElement.clientWidth))
      canvasHeight = Math.max(1, Math.floor(sectionElement.clientHeight))

      canvasElement.width = Math.floor(canvasWidth * pixelRatio)
      canvasElement.height = Math.floor(canvasHeight * pixelRatio)
      canvasElement.style.width = `${canvasWidth}px`
      canvasElement.style.height = `${canvasHeight}px`

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.imageSmoothingEnabled = true
    }

    const buildParticlePoints = () => {
      if (!particleImage.naturalWidth || !particleImage.naturalHeight) {
        particles = []
        return
      }

      const offscreenCanvas = document.createElement('canvas')
      const offscreenContext = offscreenCanvas.getContext('2d', { willReadFrequently: true })

      if (!offscreenContext) {
        particles = []
        return
      }

      const sampleScale = Math.min(1, PARTICLE_SAMPLE_MAX_WIDTH / canvasWidth)
      const sampleWidth = Math.max(1, Math.floor(canvasWidth * sampleScale))
      const sampleHeight = Math.max(1, Math.floor(canvasHeight * sampleScale))

      offscreenCanvas.width = sampleWidth
      offscreenCanvas.height = sampleHeight

      const maxDrawWidth = sampleWidth * 0.82
      const maxDrawHeight = sampleHeight * 0.74
      const imageScale = Math.min(
        maxDrawWidth / particleImage.naturalWidth,
        maxDrawHeight / particleImage.naturalHeight,
      )
      const drawWidth = Math.max(1, Math.floor(particleImage.naturalWidth * imageScale))
      const drawHeight = Math.max(1, Math.floor(particleImage.naturalHeight * imageScale))
      const offsetX = Math.floor((sampleWidth - drawWidth) / 2)
      const centeredOffsetY = Math.floor((sampleHeight - drawHeight) / 2)
      const offsetY = Math.max(0, centeredOffsetY + Math.floor(sampleHeight * 0.12))

      offscreenContext.clearRect(0, 0, sampleWidth, sampleHeight)
      offscreenContext.drawImage(particleImage, offsetX, offsetY, drawWidth, drawHeight)

      const { data } = offscreenContext.getImageData(0, 0, sampleWidth, sampleHeight)
      const candidatePoints: HeroParticlePoint[] = []
      const particleSampleStep = Math.max(
        1,
        Math.round(getParticleSampleStep(canvasWidth, canvasHeight, isReverted) * sampleScale),
      )
      const particleMaxCount = getParticleMaxCount(isReverted)
      const scanStartX = offsetX
      const scanStartY = offsetY
      const scanEndX = offsetX + drawWidth
      const scanEndY = offsetY + drawHeight

      for (let y = scanStartY; y < scanEndY; y += particleSampleStep) {
        for (let x = scanStartX; x < scanEndX; x += particleSampleStep) {
          const pixelIndex = (y * sampleWidth + x) * 4
          const red = data[pixelIndex]
          const green = data[pixelIndex + 1]
          const blue = data[pixelIndex + 2]
          const alpha = data[pixelIndex + 3]
          const brightness = (red + green + blue) / 3
          const isLeafSilhouettePixel = alpha >= PARTICLE_THRESHOLD_ALPHA
          const isLeafParticlePixel =
            isLeafSilhouettePixel && brightness >= PARTICLE_THRESHOLD_BRIGHTNESS
          const shouldCreateParticle = isReverted
            ? !isLeafSilhouettePixel
            : isLeafParticlePixel

          if (shouldCreateParticle) {
            candidatePoints.push({
              x: x / sampleScale,
              y: y / sampleScale,
              size: isReverted
                ? getRevertedParticleSize(x, y)
                : getParticleSize(brightness),
              opacity: isReverted
                ? getRevertedParticleOpacity(x, y)
                : getParticleOpacity(brightness, alpha),
            })
          }
        }
      }

      const nextParticles: HeroParticle[] = []
      const candidateCount = candidatePoints.length

      if (candidateCount === 0) {
        particles = nextParticles
        return
      }

      const subsampleStride =
        candidateCount > particleMaxCount ? candidateCount / particleMaxCount : 1

      for (
        let candidateIndex = 0;
        candidateIndex < candidateCount && nextParticles.length < particleMaxCount;
        candidateIndex += subsampleStride
      ) {
        nextParticles.push(
          new HeroParticle(candidatePoints[Math.floor(candidateIndex)]),
        )
      }

      particles = nextParticles
    }

    const drawParticles = () => {
      let hasActiveMotion = mouseState.active

      context.clearRect(0, 0, canvasWidth, canvasHeight)
      context.fillStyle = PARTICLE_FILL_COLOR

      for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
        particles[particleIndex].update(mouseState)
        particles[particleIndex].draw(context)

        if (!hasActiveMotion && particles[particleIndex].isMoving()) {
          hasActiveMotion = true
        }
      }

      context.globalAlpha = 1

      return hasActiveMotion
    }

    const animateParticles = () => {
      if (!isSectionVisible) {
        isAnimationRunning = false
        return
      }

      const hasActiveMotion = drawParticles()

      if (!hasActiveMotion) {
        isAnimationRunning = false
        return
      }

      animationFrameId = window.requestAnimationFrame(animateParticles)
    }

    const startAnimation = () => {
      if (isAnimationRunning || !particles.length || !isSectionVisible) {
        return
      }

      isAnimationRunning = true
      animationFrameId = window.requestAnimationFrame(animateParticles)
    }

    const stopAnimation = () => {
      window.cancelAnimationFrame(animationFrameId)
      isAnimationRunning = false
    }

    const rebuildParticleCanvas = () => {
      setupCanvas()
      buildParticlePoints()
      drawParticles()
    }

    const handlePointerMove = (event: PointerEvent) => {
      const sectionBounds = sectionElement.getBoundingClientRect()

      mouseState.x = event.clientX - sectionBounds.left
      mouseState.y = event.clientY - sectionBounds.top
      mouseState.active = true
      startAnimation()
    }

    const handlePointerLeave = () => {
      mouseState.active = false
      startAnimation()
    }

    const handleResize = () => {
      rebuildParticleCanvas()
      startAnimation()
    }

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isSectionVisible = entry.isIntersecting

          if (entry.isIntersecting) {
            startAnimation()
          } else {
            stopAnimation()
          }
        })
      },
      { threshold: 0.2 },
    )

    visibilityObserver.observe(sectionElement)

    particleImage.onload = () => {
      rebuildParticleCanvas()
    }
    particleImage.src = PARTICLE_IMAGE_SOURCE

    window.addEventListener('resize', handleResize)
    sectionElement.addEventListener('pointermove', handlePointerMove)
    sectionElement.addEventListener('pointerleave', handlePointerLeave)

    if (particleImage.complete) {
      rebuildParticleCanvas()
    }

    return () => {
      stopAnimation()
      window.removeEventListener('resize', handleResize)
      sectionElement.removeEventListener('pointermove', handlePointerMove)
      sectionElement.removeEventListener('pointerleave', handlePointerLeave)
      visibilityObserver.disconnect()
    }
  }, [prefersReducedMotion])

  return (
    <section ref={sectionRef} className="hero-section">
      {!prefersReducedMotion ? (
        <canvas
          ref={particleCanvasRef}
          className="hero-section__particle-canvas"
          aria-hidden="true"
        />
      ) : null}

      <div className="hero-section__particle-overlay" aria-hidden="true" />

      <div className="hero-section__content">
        <h1 className="hero-section__title">
          Pure patent <span className="hero-section__title-accent">prosecution,</span>
          <br />
          <span className="hero-section__title-accent">trusted</span> worldwide.
        </h1>

        <p className="hero-section__description">{description}</p>

        <a className="hero-section__action glow-on-hover" href={actionHref}>
          <span>{actionLabel}</span>
          <span className="hero-section__action-icon" aria-hidden="true">
            &gt;
          </span>
        </a>
      </div>
    </section>
  )
}

export default HeroSection
