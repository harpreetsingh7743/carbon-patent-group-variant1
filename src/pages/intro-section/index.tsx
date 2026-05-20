import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

import './styles.css'

const PARTICLE_GRID_GAP = 25
const PARTICLE_REPEL_RADIUS = 130
const PARTICLE_PULL_STRENGTH = 0.018
const PARTICLE_DAMPING = 0.92
const PARTICLE_GLOW_COLOR = 'rgba(149, 149, 149, 0.16)'
const PARTICLE_FILL_COLOR = 'rgba(134, 134, 134, 0.96)'
const PARTICLE_IDLE_VELOCITY_THRESHOLD = 0.02
const PARTICLE_IDLE_OFFSET_THRESHOLD = 0.02
const VISUAL_CARD_ZOOM_SCROLL_MULTIPLIER = 1
const FULLSCREEN_PANEL_SCROLL_MULTIPLIER = 1
const FULLSCREEN_PANEL_REVEAL_DELAY = 0.08

const VISUAL_CARD_CLIP_START: readonly [number, number][] = [
  [0, 0],
  [100, 0],
  [100, 10],
  [96.5, 12],
  [96.5, 46],
  [100, 48],
  [100, 100],
  [0, 100],
]

const VISUAL_CARD_CLIP_END: readonly [number, number][] = [
  [0, 0],
  [100, 0],
  [100, 52],
  [96.5, 54],
  [96.5, 86],
  [100, 88],
  [100, 100],
  [0, 100],
]

const VISUAL_CARD_CLIP_FULL: readonly [number, number][] = [
  [0, 0],
  [100, 0],
  [100, 0],
  [100, 0],
  [100, 100],
  [100, 100],
  [100, 100],
  [0, 100],
]

const VISUAL_CARD_BORDER_RADIUS_REM = 1.8

function getVisualCardClipPath(progress: number) {
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const points = VISUAL_CARD_CLIP_START.map((startPoint, pointIndex) => {
    const endPoint = VISUAL_CARD_CLIP_END[pointIndex]
    const x = startPoint[0] + (endPoint[0] - startPoint[0]) * clampedProgress
    const y = startPoint[1] + (endPoint[1] - startPoint[1]) * clampedProgress

    return `${x}% ${y}%`
  })

  return `polygon(${points.join(', ')})`
}

function getVisualCardZoomClipPath(progress: number) {
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const points = VISUAL_CARD_CLIP_END.map((startPoint, pointIndex) => {
    const endPoint = VISUAL_CARD_CLIP_FULL[pointIndex]
    const x = startPoint[0] + (endPoint[0] - startPoint[0]) * clampedProgress
    const y = startPoint[1] + (endPoint[1] - startPoint[1]) * clampedProgress

    return `${x}% ${y}%`
  })

  return `polygon(${points.join(', ')})`
}

function readVisualCardRect(element: HTMLElement): IntroVisualCardRect {
  const bounds = element.getBoundingClientRect()

  return {
    top: bounds.top,
    left: bounds.left,
    width: bounds.width,
    height: bounds.height,
  }
}

function getFullscreenTargetRect(): IntroVisualCardRect {
  return {
    top: 0,
    left: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function getCopyScrollProgress(overallProgress: number, copyPhaseEndRatio: number) {
  if (copyPhaseEndRatio <= 0) {
    return 0
  }

  return Math.min(1, overallProgress / copyPhaseEndRatio)
}

function getVisualCardZoomProgress(
  overallProgress: number,
  copyPhaseEndRatio: number,
  zoomPhaseEndRatio: number,
) {
  if (copyPhaseEndRatio >= 1 || zoomPhaseEndRatio <= copyPhaseEndRatio) {
    return 0
  }

  if (overallProgress <= copyPhaseEndRatio) {
    return 0
  }

  return Math.min(1, (overallProgress - copyPhaseEndRatio) / (zoomPhaseEndRatio - copyPhaseEndRatio))
}

function getFullscreenPanelProgress(overallProgress: number, zoomPhaseEndRatio: number) {
  if (zoomPhaseEndRatio >= 1 || overallProgress <= zoomPhaseEndRatio) {
    return 0
  }

  return Math.min(1, (overallProgress - zoomPhaseEndRatio) / (1 - zoomPhaseEndRatio))
}

function getVisibleFullscreenPanelProgress(panelProgress: number) {
  if (panelProgress <= FULLSCREEN_PANEL_REVEAL_DELAY) {
    return 0
  }

  return Math.min(1, (panelProgress - FULLSCREEN_PANEL_REVEAL_DELAY) / (1 - FULLSCREEN_PANEL_REVEAL_DELAY))
}

function applyVisualCardZoom(
  visualCardElement: HTMLElement,
  fromRect: IntroVisualCardRect,
  zoomProgress: number,
) {
  const clampedProgress = Math.min(1, Math.max(0, zoomProgress))
  const toRect = getFullscreenTargetRect()
  const top = fromRect.top + (toRect.top - fromRect.top) * clampedProgress
  const left = fromRect.left + (toRect.left - fromRect.left) * clampedProgress
  const width = fromRect.width + (toRect.width - fromRect.width) * clampedProgress
  const height = fromRect.height + (toRect.height - fromRect.height) * clampedProgress
  const borderRadius = VISUAL_CARD_BORDER_RADIUS_REM * (1 - clampedProgress)

  visualCardElement.style.position = 'fixed'
  visualCardElement.style.top = `${top}px`
  visualCardElement.style.left = `${left}px`
  visualCardElement.style.width = `${width}px`
  visualCardElement.style.height = `${height}px`
  visualCardElement.style.margin = '0'
  visualCardElement.style.maxWidth = 'none'
  visualCardElement.style.borderRadius = `${borderRadius}rem`
  visualCardElement.style.clipPath = getVisualCardZoomClipPath(clampedProgress)
  visualCardElement.style.zIndex = '80'
  visualCardElement.style.setProperty('--visual-card-zoom-progress', String(clampedProgress))
  visualCardElement.dataset.zoomActive = 'true'
}

function clearVisualCardZoom(visualCardElement: HTMLElement) {
  visualCardElement.style.removeProperty('position')
  visualCardElement.style.removeProperty('top')
  visualCardElement.style.removeProperty('left')
  visualCardElement.style.removeProperty('width')
  visualCardElement.style.removeProperty('height')
  visualCardElement.style.removeProperty('margin')
  visualCardElement.style.removeProperty('max-width')
  visualCardElement.style.removeProperty('border-radius')
  visualCardElement.style.removeProperty('clip-path')
  visualCardElement.style.removeProperty('z-index')
  visualCardElement.style.removeProperty('--visual-card-zoom-progress')
  visualCardElement.dataset.zoomActive = 'false'
}

function applyFullscreenPanelProgress(panelStackElement: HTMLElement, panelProgress: number) {
  const clampedProgress = getVisibleFullscreenPanelProgress(panelProgress)

  panelStackElement.style.transform = `translate3d(0, ${clampedProgress * -50}%, 0)`
  panelStackElement.style.setProperty('--fullscreen-panel-progress', String(clampedProgress))
}

function clearFullscreenPanelProgress(panelStackElement: HTMLElement) {
  panelStackElement.style.removeProperty('transform')
  panelStackElement.style.removeProperty('--fullscreen-panel-progress')
}

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
  `Strong patents don't happen by accident. They're built through precise drafting, experienced prosecution, and advice that connects technical detail to commercial reality.`,
  `Carbon Patents does one thing; we secure and manage patent rights in Canada. Our team works across life sciences, pharmaceuticals, chemistry, medical devices, software, electrical, mechanical, and emerging technologies. We have the depth of experience to handle complex subject matter and the focus to get it right. Eiusmod occaecat in elit qui. Ad duis nisi laboris est irure et commodo qui. Non eu eu cillum culpa amet labore ipsum aute laborum qui.`,

  `Sit sunt occaecat ex adipisicing reprehenderit voluptate in labore proident. Est Lorem nostrud deserunt esse deserunt veniam nisi duis qui veniam sunt. Do ullamco est consectetur sunt laboris commodo qui dolore enim laborum. Cupidatat et in aliquip incididunt esse occaecat aliqua amet dolor aliquip sint ipsum amet. Id aute sunt quis dolor pariatur nulla non. Velit sint do in amet eu non.`,

  `Amet incididunt pariatur reprehenderit fugiat magna tempor mollit tempor laboris eiusmod occaecat quis non. Laborum cupidatat ea laborum nulla id officia qui minim ea nostrud ut sit deserunt irure. Amet fugiat et dolor eu fugiat nisi reprehenderit ea. Veniam fugiat cillum minim voluptate cillum aliquip velit laboris exercitation Lorem ad culpa dolor. Excepteur laborum tempor qui cupidatat labore. Est ut consequat nulla esse minim Lorem excepteur cupidatat proident laborum non.`,

  `Duis cupidatat duis eiusmod exercitation nisi esse enim enim. Labore velit commodo mollit laborum excepteur reprehenderit esse sit. Ea labore consequat culpa nostrud et ea enim dolor exercitation elit occaecat ipsum. Fugiat non magna mollit sunt irure laborum enim ullamco velit. Sunt mollit do proident deserunt sit. Mollit excepteur laborum in velit reprehenderit id dolore commodo voluptate. Sunt consectetur aliquip in occaecat.`,

  `Id tempor excepteur laboris enim exercitation id in dolore deserunt consectetur. Ullamco aliquip duis et magna ea irure pariatur consectetur nisi. Elit aliquip aliquip officia sit duis duis dolor elit eiusmod pariatur. Sunt amet ipsum occaecat anim aliqua laboris veniam labore culpa consectetur duis irure Lorem ut. Eu enim laborum excepteur excepteur proident dolor veniam incididunt culpa in Lorem. Duis aliquip quis sit sit laboris labore labore id duis nulla.`,

  `Fugiat in reprehenderit mollit sit. Velit nostrud in non voluptate ullamco cupidatat. Adipisicing fugiat laborum fugiat fugiat elit commodo reprehenderit tempor ea. Magna est non ea cupidatat. Irure ut tempor cupidatat veniam occaecat et minim do.`,

  `Et qui irure voluptate sit aliquip aliqua voluptate labore culpa est labore ea. Commodo sunt officia duis eiusmod proident ad mollit qui labore sit. Non eu non ullamco ullamco ad qui laborum dolor do ex dolor velit eiusmod. Tempor in dolor ea nulla cillum nisi nulla labore esse veniam in. Nulla velit voluptate excepteur culpa laborum aute nisi. Sunt fugiat elit qui incididunt.`,

  `Sit labore sint ipsum et aliqua nisi ea culpa aliqua duis labore. Consectetur eu reprehenderit cillum ea ipsum aliqua reprehenderit aliqua ex. Id laboris esse velit consequat exercitation amet excepteur tempor. Ea reprehenderit elit anim fugiat occaecat officia pariatur pariatur mollit duis ullamco eiusmod. Ullamco ipsum duis ad est sit deserunt duis mollit velit mollit pariatur. Exercitation elit esse velit cupidatat excepteur. Id eu magna officia velit.`,

  `Velit anim dolor sint et ea. Eu in laborum eu occaecat. Laborum in ullamco voluptate consectetur ut commodo ad voluptate cupidatat Lorem eu et duis labore. Anim consequat reprehenderit sit aliquip minim. Cillum incididunt veniam eu irure aute anim cillum ad. Veniam nisi do duis ad nisi proident minim. Cillum non ut pariatur aliquip cillum dolor.`
]

function IntroSection({
  title = 'Intro',
  paragraphs = defaultParagraphs,
  imageAlt = 'Faceted blue maple leaf illustration',
}: IntroSectionProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const sectionRef = useRef<HTMLElement | null>(null)
  const copyRef = useRef<HTMLDivElement | null>(null)
  const visualCardRef = useRef<HTMLDivElement | null>(null)
  const visualCardFloaterRef = useRef<HTMLDivElement | null>(null)
  const fullscreenPanelStackRef = useRef<HTMLDivElement | null>(null)
  const isScrollGatedRef = useRef(false)
  const copyPhaseEndRatioRef = useRef(1)
  const zoomPhaseEndRatioRef = useRef(1)
  const zoomFromRectRef = useRef<IntroVisualCardRect | null>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const contentParagraphs = paragraphs.length > 0 ? paragraphs : defaultParagraphs

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })

  const contentOpacity = useTransform(scrollYProgress, (latestProgress) => {
    if (prefersReducedMotion || !isScrollGatedRef.current) {
      return 1
    }

    const zoomProgress = getVisualCardZoomProgress(
      latestProgress,
      copyPhaseEndRatioRef.current,
      zoomPhaseEndRatioRef.current,
    )

    return 1 - zoomProgress * 0.92
  })

  const syncIntroScrollState = useCallback(
    (latestProgress: number) => {
      if (prefersReducedMotion) {
        return
      }

      const copyElement = copyRef.current
      const visualCardElement = visualCardRef.current
      const visualCardFloaterElement = visualCardFloaterRef.current
      const fullscreenPanelStackElement = fullscreenPanelStackRef.current
      const sectionElement = sectionRef.current
      const copyPhaseEndRatio = copyPhaseEndRatioRef.current
      const zoomPhaseEndRatio = zoomPhaseEndRatioRef.current
      const copyScrollProgress = getCopyScrollProgress(latestProgress, copyPhaseEndRatio)
      const zoomProgress = getVisualCardZoomProgress(
        latestProgress,
        copyPhaseEndRatio,
        zoomPhaseEndRatio,
      )
      const fullscreenPanelProgress = getFullscreenPanelProgress(latestProgress, zoomPhaseEndRatio)
      const visibleFullscreenPanelProgress = getVisibleFullscreenPanelProgress(fullscreenPanelProgress)

      if (copyElement && copyElement.dataset.scrollGated === 'true') {
        const maxScrollTop = copyElement.scrollHeight - copyElement.clientHeight

        if (maxScrollTop > 0) {
          copyElement.scrollTop = copyScrollProgress * maxScrollTop
        }
      }

      if (!visualCardElement || !visualCardFloaterElement || !fullscreenPanelStackElement) {
        return
      }

      if (zoomProgress > 0) {
        if (!zoomFromRectRef.current) {
          zoomFromRectRef.current = readVisualCardRect(visualCardElement)
        }

        visualCardElement.style.opacity = '0'
        visualCardElement.style.visibility = 'hidden'
        visualCardFloaterElement.style.opacity = '1'
        visualCardFloaterElement.style.visibility = 'visible'
        visualCardFloaterElement.dataset.panelAttached =
          visibleFullscreenPanelProgress > 0 ? 'true' : 'false'
        applyVisualCardZoom(visualCardFloaterElement, zoomFromRectRef.current, zoomProgress)
        applyFullscreenPanelProgress(fullscreenPanelStackElement, fullscreenPanelProgress)
        sectionElement?.setAttribute('data-zoom-active', 'true')
        return
      }

      if (zoomFromRectRef.current) {
        clearVisualCardZoom(visualCardFloaterElement)
        clearFullscreenPanelProgress(fullscreenPanelStackElement)
        zoomFromRectRef.current = null
      }

      visualCardElement.style.removeProperty('opacity')
      visualCardElement.style.removeProperty('visibility')
      visualCardFloaterElement.style.opacity = '0'
      visualCardFloaterElement.style.visibility = 'hidden'
      visualCardFloaterElement.dataset.panelAttached = 'false'
      sectionElement?.setAttribute('data-zoom-active', 'false')

      if (isScrollGatedRef.current) {
        visualCardElement.style.clipPath = getVisualCardClipPath(copyScrollProgress)
      }
    },
    [prefersReducedMotion],
  )

  useLayoutEffect(() => {
    const trackElement = trackRef.current
    const copyElement = copyRef.current

    if (!trackElement || !copyElement || prefersReducedMotion) {
      return
    }

    const updateScrollTrackHeight = () => {
      const copyOverflow = Math.max(0, copyElement.scrollHeight - copyElement.clientHeight)
      const hasScrollableCopy = copyOverflow > 0
      const zoomScrollDistance = window.innerHeight * VISUAL_CARD_ZOOM_SCROLL_MULTIPLIER
      const fullscreenPanelScrollDistance = window.innerHeight * FULLSCREEN_PANEL_SCROLL_MULTIPLIER
      const animatedScrollDistance = copyOverflow + zoomScrollDistance + fullscreenPanelScrollDistance
      const hasZoomPhase = hasScrollableCopy

      trackElement.style.height = hasScrollableCopy
        ? `${window.innerHeight + animatedScrollDistance}px`
        : ''
      isScrollGatedRef.current = hasScrollableCopy
      copyPhaseEndRatioRef.current = hasZoomPhase
        ? copyOverflow / animatedScrollDistance
        : 1
      zoomPhaseEndRatioRef.current = hasZoomPhase
        ? (copyOverflow + zoomScrollDistance) / animatedScrollDistance
        : 1
      trackElement.dataset.scrollGated = hasScrollableCopy ? 'true' : 'false'
      trackElement.dataset.zoomEnabled = hasZoomPhase ? 'true' : 'false'
      copyElement.dataset.scrollGated = hasScrollableCopy ? 'true' : 'false'
    }

    const refreshScrollMetrics = () => {
      updateScrollTrackHeight()
      syncIntroScrollState(scrollYProgress.get())
    }

    refreshScrollMetrics()

    const resizeObserver = new ResizeObserver(refreshScrollMetrics)
    resizeObserver.observe(copyElement)

    const handleResize = () => {
      refreshScrollMetrics()
    }

    window.addEventListener('resize', handleResize)
    document.fonts?.ready.then(refreshScrollMetrics).catch(() => undefined)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [contentParagraphs.length, prefersReducedMotion, scrollYProgress, syncIntroScrollState])

  useEffect(() => {
    const trackElement = trackRef.current

    if (!trackElement || prefersReducedMotion) {
      return
    }

    const resetVisualCardZoom = () => {
      const visualCardElement = visualCardRef.current
      const visualCardFloaterElement = visualCardFloaterRef.current
      const fullscreenPanelStackElement = fullscreenPanelStackRef.current

      if (!visualCardFloaterElement || visualCardFloaterElement.dataset.zoomActive !== 'true') {
        return
      }

      clearVisualCardZoom(visualCardFloaterElement)
      if (fullscreenPanelStackElement) {
        clearFullscreenPanelProgress(fullscreenPanelStackElement)
      }
      zoomFromRectRef.current = null
      visualCardElement?.style.removeProperty('opacity')
      visualCardElement?.style.removeProperty('visibility')
      visualCardFloaterElement.style.opacity = '0'
      visualCardFloaterElement.style.visibility = 'hidden'
      visualCardFloaterElement.dataset.panelAttached = 'false'
      sectionRef.current?.setAttribute('data-zoom-active', 'false')
    }

    const trackVisibilityObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          resetVisualCardZoom()
        }
      },
      { threshold: 0 },
    )

    trackVisibilityObserver.observe(trackElement)

    return () => {
      trackVisibilityObserver.disconnect()
    }
  }, [prefersReducedMotion])

  useMotionValueEvent(scrollYProgress, 'change', syncIntroScrollState)

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
    <motion.div ref={trackRef} className="intro-section__track">
      <motion.section
        ref={sectionRef}
        className="intro-section"
        aria-labelledby="intro-section-title"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ amount: 0.35, once: true }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <canvas
          ref={particleCanvasRef}
          className="intro-section__particle-canvas"
          aria-hidden="true"
        />

        <div className="intro-section__background-overlay" aria-hidden="true" />

        <div className="intro-section__container">
          <div className="intro-section__visual-shell">
            <motion.div
              ref={visualCardRef}
              className="intro-section__visual-card"
              data-motion-target="intro-card"
              data-zoom-active="false"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ amount: 0.45, once: true }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="intro-section__visual-highlight" aria-hidden="true" />

              <img
                className="intro-section__visual-image"
                src="/leaf_three.png"
                alt={imageAlt}
                loading="lazy"
              />
            </motion.div>
          </div>

          <motion.div
            className="intro-section__content"
            data-motion-target="intro-copy"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.45, once: true }}
            transition={{ duration: 0.65, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div className="intro-section__content-inner" style={{ opacity: contentOpacity }}>
              <h2 id="intro-section-title" className="intro-section__title">
                {title}
              </h2>

              <motion.div
                ref={copyRef}
                className="intro-section__copy"
                data-prefers-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
              >
                {contentParagraphs.map((paragraph, paragraphIndex) => (
                  <p key={`${paragraphIndex}-${paragraph.slice(0, 18)}`} className="intro-section__paragraph">
                    {paragraph}
                  </p>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      <div
        ref={visualCardFloaterRef}
        className="intro-section__visual-card intro-section__visual-card--floater"
        data-motion-target="intro-card-floater"
        data-zoom-active="false"
        data-panel-attached="false"
      >
        <div className="intro-section__zoom-panel-visual">
          <span className="intro-section__visual-highlight" aria-hidden="true" />

          <img
            className="intro-section__visual-image"
            src="/leaf_three.png"
            alt=""
            loading="lazy"
          />
        </div>

        <div ref={fullscreenPanelStackRef} className="intro-section__fullscreen-panel-stack">
          <div className="intro-section__fullscreen-panel intro-section__fullscreen-panel--visual">
            <span className="intro-section__visual-highlight" aria-hidden="true" />

            <img
              className="intro-section__visual-image intro-section__fullscreen-visual-image"
              src="/leaf_three.png"
              alt=""
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default IntroSection
