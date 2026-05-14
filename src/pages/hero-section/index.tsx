import { useEffect, useRef } from 'react'

import './styles.css'

const PARTICLE_IMAGE_SOURCE = '/leafparticles.png'
const PARTICLE_SAMPLE_STEP = 5
const PARTICLE_MAX_COUNT = 12000
const REVERTED_PARTICLE_SAMPLE_STEP = 3
const REVERTED_PARTICLE_MAX_COUNT = 14000
const PARTICLE_REPEL_RADIUS = 120
const PARTICLE_PULL_STRENGTH = 0.028
const PARTICLE_DAMPING = 0.9
const PARTICLE_GLOW_COLOR = 'rgba(99, 213, 255, 0.8)'
const PARTICLE_FILL_COLOR = 'rgba(99, 213, 255, 1)'
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
  driftSeed: number

  constructor({ x, y, size, opacity }: HeroParticlePoint, canvasWidth: number, canvasHeight: number) {
    this.baseX = x
    this.baseY = y
    this.x = Math.random() * canvasWidth
    this.y = Math.random() * canvasHeight
    this.size = size
    this.opacity = opacity
    this.velocityX = 0
    this.velocityY = 0
    this.driftSeed = Math.random() * Math.PI * 2
  }

  update(mouseState: HeroParticleMouseState, tick: number) {
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

    const driftX = Math.cos(tick * 0.017 + this.driftSeed) * 1.8
    const driftY = Math.sin(tick * 0.015 + this.driftSeed) * 1.8

    this.velocityX += (this.baseX + driftX - this.x) * PARTICLE_PULL_STRENGTH
    this.velocityY += (this.baseY + driftY - this.y) * PARTICLE_PULL_STRENGTH
    this.velocityX *= PARTICLE_DAMPING
    this.velocityY *= PARTICLE_DAMPING
    this.x += this.velocityX
    this.y += this.velocityY
  }

  draw(context: CanvasRenderingContext2D) {
    context.globalAlpha = this.opacity
    context.fillRect(this.x, this.y, this.size, this.size)
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

function getParticleSampleStep(
  canvasWidth: number,
  canvasHeight: number,
  isRevertedMode: boolean,
) {
  if (!isRevertedMode) {
    return PARTICLE_SAMPLE_STEP
  }

  const canvasArea = canvasWidth * canvasHeight
  const revertedSampleStep = Math.ceil(
    Math.sqrt(canvasArea / REVERTED_PARTICLE_MAX_COUNT),
  )

  return Math.max(REVERTED_PARTICLE_SAMPLE_STEP, revertedSampleStep)
}

function getParticleMaxCount(isRevertedMode: boolean) {
  return isRevertedMode ? REVERTED_PARTICLE_MAX_COUNT : PARTICLE_MAX_COUNT
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

    const particleImage = new Image()
    const mouseState: HeroParticleMouseState = { x: 0, y: 0, active: false }
    let animationFrameId = 0
    let animationTick = 0
    let canvasWidth = 0
    let canvasHeight = 0
    let isSectionVisible = true
    let isAnimationRunning = false
    let particles: HeroParticle[] = []

    const setupCanvas = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

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

      offscreenCanvas.width = canvasWidth
      offscreenCanvas.height = canvasHeight

      const maxDrawWidth = canvasWidth * 0.82
      const maxDrawHeight = canvasHeight * 0.74
      const imageScale = Math.min(
        maxDrawWidth / particleImage.naturalWidth,
        maxDrawHeight / particleImage.naturalHeight,
      )
      const drawWidth = Math.max(1, Math.floor(particleImage.naturalWidth * imageScale))
      const drawHeight = Math.max(1, Math.floor(particleImage.naturalHeight * imageScale))
      const offsetX = Math.floor((canvasWidth - drawWidth) / 2)
      const centeredOffsetY = Math.floor((canvasHeight - drawHeight) / 2)
      const offsetY = Math.max(0, centeredOffsetY + Math.floor(canvasHeight * 0.12))

      offscreenContext.clearRect(0, 0, canvasWidth, canvasHeight)
      offscreenContext.drawImage(particleImage, offsetX, offsetY, drawWidth, drawHeight)

      const { data } = offscreenContext.getImageData(0, 0, canvasWidth, canvasHeight)
      const nextParticles: HeroParticle[] = []
      const particleSampleStep = getParticleSampleStep(canvasWidth, canvasHeight, isReverted)
      const particleMaxCount = getParticleMaxCount(isReverted)

      for (let y = 0; y < canvasHeight; y += particleSampleStep) {
        for (let x = 0; x < canvasWidth; x += particleSampleStep) {
          const pixelIndex = (y * canvasWidth + x) * 4
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
            nextParticles.push(
              new HeroParticle(
                {
                  x,
                  y,
                  size: isReverted
                    ? getRevertedParticleSize(x, y)
                    : getParticleSize(brightness),
                  opacity: isReverted
                    ? getRevertedParticleOpacity(x, y)
                    : getParticleOpacity(brightness, alpha),
                },
                canvasWidth,
                canvasHeight,
              ),
            )
          }

          if (nextParticles.length >= particleMaxCount) {
            particles = nextParticles
            return
          }
        }
      }

      particles = nextParticles
    }

    const drawParticles = () => {
      context.clearRect(0, 0, canvasWidth, canvasHeight)
      context.fillStyle = PARTICLE_FILL_COLOR
      context.shadowColor = PARTICLE_GLOW_COLOR
      context.shadowBlur = 14

      for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
        particles[particleIndex].update(mouseState, animationTick)
        particles[particleIndex].draw(context)
      }

      context.globalAlpha = 1
    }

    const animateParticles = () => {
      if (!isSectionVisible) {
        isAnimationRunning = false
        return
      }

      animationTick += 1
      drawParticles()
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
    }

    const handlePointerLeave = () => {
      mouseState.active = false
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
      startAnimation()
    }
    particleImage.src = PARTICLE_IMAGE_SOURCE

    window.addEventListener('resize', handleResize)
    sectionElement.addEventListener('pointermove', handlePointerMove)
    sectionElement.addEventListener('pointerleave', handlePointerLeave)

    if (particleImage.complete) {
      rebuildParticleCanvas()
      startAnimation()
    }

    return () => {
      stopAnimation()
      window.removeEventListener('resize', handleResize)
      sectionElement.removeEventListener('pointermove', handlePointerMove)
      sectionElement.removeEventListener('pointerleave', handlePointerLeave)
      visibilityObserver.disconnect()
    }
  }, [])

  return (
    <section ref={sectionRef} className="hero-section">
      <canvas
        ref={particleCanvasRef}
        className="hero-section__particle-canvas"
        aria-hidden="true"
      />

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
