import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import './styles.css'
import WhyCarbonIntroTitle from './why-carbon-intro-title'

const PARTICLE_GRID_GAP = 25
const PARTICLE_REPEL_RADIUS = 130
const PARTICLE_PULL_STRENGTH = 0.018
const PARTICLE_DAMPING = 0.92
const PARTICLE_GLOW_COLOR = 'rgba(149, 149, 149, 0.16)'
const PARTICLE_FILL_COLOR = 'rgba(134, 134, 134, 0.96)'
const PARTICLE_IDLE_VELOCITY_THRESHOLD = 0.02
const PARTICLE_IDLE_OFFSET_THRESHOLD = 0.02
const VISUAL_CARD_ZOOM_SCROLL_MULTIPLIER = 3
const POST_ZOOM_SCROLL_MULTIPLIER = 1
const WHY_CARBON_STEP_SCROLL_MULTIPLIER = 1
const ZOOM_STEP_WHEEL_COOLDOWN_MS = 700

const whyCarbonSteps: WhyCarbonStep[] = [
  {
    title: 'Prosecution is all we do',
    description:
      'Our team includes biotech and software PhDs, engineers, and specialists in plant varieties and cannabis.',
  },
  {
    title: 'Depth across complex fields',
    description:
      'We handle life sciences, chemistry, medical devices, software, and emerging technologies with focused expertise.',
  },
  {
    title: 'Advice tied to commercial reality',
    description:
      'We connect technical detail to business outcomes so your patent strategy supports real-world growth.',
  },
]

const whyCarbonSlideEase = [0.16, 1, 0.3, 1] as const

const whyCarbonTitleSlideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    y: 28,
    opacity: 0,
    filter: 'blur(8px)',
  }),
  center: {
    x: 0,
    y: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -28 : 28,
    y: -18,
    opacity: 0,
    filter: 'blur(6px)',
  }),
}

const whyCarbonDescriptionSlideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 32 : -32,
    y: 22,
    opacity: 0,
    filter: 'blur(6px)',
  }),
  center: {
    x: 0,
    y: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -24 : 24,
    y: -14,
    opacity: 0,
    filter: 'blur(4px)',
  }),
}

const whyCarbonCounterSlideVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    y: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

const ZOOM_PROGRESS_SEGMENTS: readonly { inputEnd: number; outputEnd: number }[] = [
  { inputEnd: 0.25, outputEnd: 0.2 },
  { inputEnd: 0.5, outputEnd: 0.7 },
  { inputEnd: 1, outputEnd: 1 },
]

const ZOOM_STEP_TARGETS = [0, 0.2, 0.7, 1] as const

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

function remapZoomProgress(linearProgress: number) {
  const clampedProgress = Math.min(1, Math.max(0, linearProgress))
  let previousInputEnd = 0
  let previousOutputEnd = 0

  for (const segment of ZOOM_PROGRESS_SEGMENTS) {
    if (clampedProgress <= segment.inputEnd) {
      const inputSpan = segment.inputEnd - previousInputEnd
      const outputSpan = segment.outputEnd - previousOutputEnd
      const segmentProgress = inputSpan > 0 ? (clampedProgress - previousInputEnd) / inputSpan : 0

      return previousOutputEnd + segmentProgress * outputSpan
    }

    previousInputEnd = segment.inputEnd
    previousOutputEnd = segment.outputEnd
  }

  return 1
}

function inverseRemapZoomProgress(remappedProgress: number) {
  const clampedProgress = Math.min(1, Math.max(0, remappedProgress))
  let previousInputEnd = 0
  let previousOutputEnd = 0

  for (const segment of ZOOM_PROGRESS_SEGMENTS) {
    if (clampedProgress <= segment.outputEnd) {
      const outputSpan = segment.outputEnd - previousOutputEnd
      const inputSpan = segment.inputEnd - previousInputEnd
      const segmentProgress =
        outputSpan > 0 ? (clampedProgress - previousOutputEnd) / outputSpan : 0

      return previousInputEnd + segmentProgress * inputSpan
    }

    previousInputEnd = segment.inputEnd
    previousOutputEnd = segment.outputEnd
  }

  return 1
}

function getOverallProgressForRemappedZoom(
  remappedProgress: number,
  copyPhaseEndRatio: number,
  zoomPhaseEndRatio: number,
) {
  const linearZoomProgress = inverseRemapZoomProgress(remappedProgress)

  return copyPhaseEndRatio + linearZoomProgress * (zoomPhaseEndRatio - copyPhaseEndRatio)
}

function getTargetScrollYForOverallProgress(
  trackElement: HTMLElement,
  currentScrollY: number,
  currentOverallProgress: number,
  targetOverallProgress: number,
) {
  const maxScroll = Math.max(0, trackElement.offsetHeight - window.innerHeight)
  const trackStartScrollY = currentScrollY - currentOverallProgress * maxScroll

  return trackStartScrollY + targetOverallProgress * maxScroll
}

function getNearestZoomStepIndex(remappedProgress: number) {
  let nearestIndex = 0
  let nearestDistance = Infinity

  ZOOM_STEP_TARGETS.forEach((target, index) => {
    const distance = Math.abs(target - remappedProgress)

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })

  return nearestIndex
}

function isInZoomScrollPhase(
  overallProgress: number,
  copyPhaseEndRatio: number,
  zoomPhaseEndRatio: number,
) {
  return overallProgress >= copyPhaseEndRatio && overallProgress <= zoomPhaseEndRatio
}

function getPostZoomReleaseProgress(overallProgress: number, zoomPhaseEndRatio: number) {
  if (zoomPhaseEndRatio >= 1 || overallProgress <= zoomPhaseEndRatio) {
    return 0
  }

  return Math.min(1, (overallProgress - zoomPhaseEndRatio) / (1 - zoomPhaseEndRatio))
}

function getLeafImageElements(visualCardElement: HTMLElement) {
  return Array.from(
    visualCardElement.querySelectorAll<HTMLElement>(
      '.intro-section__zoom-panel-visual .intro-section__visual-image',
    ),
  )
}

function pinReleaseLeafToViewport(
  visualCardElement: HTMLElement,
  leafImageElements: HTMLElement[],
) {
  if (!leafImageElements.length || visualCardElement.dataset.releasePinned === 'true') {
    return
  }

  const rect = leafImageElements[0].getBoundingClientRect()

  leafImageElements.forEach((leafImageElement) => {
    leafImageElement.style.position = 'fixed'
    leafImageElement.style.left = `${rect.left}px`
    leafImageElement.style.top = `${rect.top}px`
    leafImageElement.style.width = `${rect.width}px`
    leafImageElement.style.transform = 'none'
    leafImageElement.style.zIndex = '81'
  })
  visualCardElement.dataset.releasePinned = 'true'
}

function applyPostZoomRelease(visualCardElement: HTMLElement, _releaseProgress: number) {
  const leafImageElements = getLeafImageElements(visualCardElement)

  if (!leafImageElements.length) {
    return
  }

  visualCardElement.dataset.releaseActive = 'true'
  pinReleaseLeafToViewport(visualCardElement, leafImageElements)
}

function clearPostZoomRelease(visualCardElement: HTMLElement) {
  const leafImageElements = getLeafImageElements(visualCardElement)

  visualCardElement.dataset.releaseActive = 'false'
  visualCardElement.dataset.releasePinned = 'false'
  leafImageElements.forEach((leafImageElement) => {
    leafImageElement.style.removeProperty('position')
    leafImageElement.style.removeProperty('left')
    leafImageElement.style.removeProperty('top')
    leafImageElement.style.removeProperty('width')
    leafImageElement.style.removeProperty('transform')
    leafImageElement.style.removeProperty('z-index')
  })
}

function applyVisualCardZoom(
  visualCardElement: HTMLElement,
  fromRect: IntroVisualCardRect,
  zoomProgress: number,
) {
  const clampedProgress = Math.min(1, Math.max(0, zoomProgress))
  const toRect = getFullscreenTargetRect()
  const top = fromRect.top + (toRect.top - fromRect.top) * clampedProgress
  const height = fromRect.height + (toRect.height - fromRect.height) * clampedProgress
  // Keep the left edge anchored longer so the card grows rightward instead of drifting to center.
  const leftProgress = Math.pow(clampedProgress, 2.2)
  const left = fromRect.left + (toRect.left - fromRect.left) * leftProgress
  const width = fromRect.width + (toRect.width - fromRect.width) * clampedProgress
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
  visualCardElement.dataset.releaseActive = 'false'
  clearPostZoomRelease(visualCardElement)
  visualCardElement.dataset.zoomActive = 'false'
}

function getWhyCarbonContentProgress(releaseProgress: number, introSlideEndRatio: number) {
  if (introSlideEndRatio >= 1) {
    return 0
  }

  if (releaseProgress <= introSlideEndRatio) {
    return 0
  }

  return (releaseProgress - introSlideEndRatio) / (1 - introSlideEndRatio)
}

function getOverallProgressForReleaseProgress(
  releaseProgress: number,
  zoomPhaseEndRatio: number,
) {
  return zoomPhaseEndRatio + releaseProgress * (1 - zoomPhaseEndRatio)
}

function getReleaseStepIndexFromProgress(releaseProgress: number, stepCount: number) {
  if (stepCount <= 1) {
    return 0
  }

  const index = Math.round(releaseProgress * (stepCount - 1))

  return Math.min(stepCount - 1, Math.max(0, index))
}

function getOverallProgressForReleaseStep(
  stepIndex: number,
  stepCount: number,
  zoomPhaseEndRatio: number,
  introSlideEndRatio: number,
) {
  if (stepCount <= 1) {
    return getOverallProgressForReleaseProgress(introSlideEndRatio, zoomPhaseEndRatio)
  }

  const contentProgress = stepIndex / (stepCount - 1)
  const releaseProgress = introSlideEndRatio + contentProgress * (1 - introSlideEndRatio)

  return getOverallProgressForReleaseProgress(releaseProgress, zoomPhaseEndRatio)
}

function createWhyCarbonTextTransition(
  prefersReducedMotion: boolean,
  { delay = 0, duration = 0.72 }: { delay?: number; duration?: number } = {},
) {
  if (prefersReducedMotion) {
    return { duration: 0 }
  }

  return {
    duration,
    ease: whyCarbonSlideEase,
    delay,
    opacity: { duration: duration * 0.78, ease: whyCarbonSlideEase, delay },
    filter: { duration: duration * 0.84, ease: whyCarbonSlideEase, delay },
  }
}

function formatWhyCarbonCounter(stepIndex: number) {
  return String(stepIndex + 1).padStart(2, '0')
}

function WhyCarbonOverlay({
  activeStepIndex,
  slideDirection,
  prefersReducedMotion,
  isTransitionEnter,
}: WhyCarbonOverlayProps) {
  const activeStep = whyCarbonSteps[activeStepIndex]

  if (!activeStep) {
    return null
  }

  const counterLabel = formatWhyCarbonCounter(activeStepIndex)
  const counterTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.55, ease: whyCarbonSlideEase }
  const titleTransition = createWhyCarbonTextTransition(prefersReducedMotion)
  const descriptionTransition = createWhyCarbonTextTransition(prefersReducedMotion, {
    delay: 0.1,
    duration: 0.78,
  })

  return (
    <div className="intro-section__why-carbon" aria-live="polite">
      <motion.div
        className="intro-section__why-carbon-shell"
        initial={isTransitionEnter && !prefersReducedMotion ? { opacity: 0, y: 40 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={
          isTransitionEnter && !prefersReducedMotion
            ? { duration: 0.6, ease: whyCarbonSlideEase, delay: 0.08 }
            : { duration: 0 }
        }
      >
        <div className="intro-section__why-carbon-header">
          <div className="intro-section__why-carbon-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.75" />
              <path
                d="M12 2.5V5.5M12 18.5V21.5M4.6 4.6L6.7 6.7M17.3 17.3L19.4 19.4M2.5 12H5.5M18.5 12H21.5M4.6 19.4L6.7 17.3M17.3 6.7L19.4 4.6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="intro-section__why-carbon-counter" aria-hidden="true">
            <AnimatePresence mode="popLayout" custom={slideDirection} initial={false}>
              <motion.span
                key={counterLabel}
                className="intro-section__why-carbon-counter-value"
                custom={slideDirection}
                variants={whyCarbonCounterSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={counterTransition}
              >
                {counterLabel}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        <div className="intro-section__why-carbon-content">
          <div className="intro-section__why-carbon-title-wrap">
            <AnimatePresence mode="popLayout" custom={slideDirection} initial={false}>
              <motion.h3
                key={activeStep.title}
                className="intro-section__why-carbon-title"
                custom={slideDirection}
                variants={whyCarbonTitleSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={titleTransition}
              >
                {activeStep.title}
              </motion.h3>
            </AnimatePresence>
          </div>

          <div className="intro-section__why-carbon-description-wrap">
            <AnimatePresence mode="popLayout" custom={slideDirection} initial={false}>
              <motion.p
                key={activeStep.description}
                className="intro-section__why-carbon-description"
                custom={slideDirection}
                variants={whyCarbonDescriptionSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={descriptionTransition}
              >
                {activeStep.description}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
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
  const isScrollGatedRef = useRef(false)
  const copyPhaseEndRatioRef = useRef(1)
  const zoomPhaseEndRatioRef = useRef(1)
  const zoomFromRectRef = useRef<IntroVisualCardRect | null>(null)
  const zoomStepIndexRef = useRef(0)
  const isZoomStepScrollingRef = useRef(false)
  const whyCarbonStepIndexRef = useRef(0)
  const isReleaseStepScrollingRef = useRef(false)
  const introSlideEndRatioRef = useRef(0)
  const isWhyCarbonIntroVisibleRef = useRef(false)
  const isWhyCarbonOverlayVisibleRef = useRef(false)
  const whyCarbonIntroPhaseRef = useRef<WhyCarbonIntroPhase>('idle')
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const [whyCarbonStepIndex, setWhyCarbonStepIndex] = useState(0)
  const [whyCarbonSlideDirection, setWhyCarbonSlideDirection] = useState(1)
  const [whyCarbonIntroPhase, setWhyCarbonIntroPhase] = useState<WhyCarbonIntroPhase>('idle')
  const [introResetKey, setIntroResetKey] = useState(0)
  const [isWhyCarbonIntroVisible, setIsWhyCarbonIntroVisible] = useState(false)
  const [isWhyCarbonOverlayVisible, setIsWhyCarbonOverlayVisible] = useState(false)
  const contentParagraphs = paragraphs.length > 0 ? paragraphs : defaultParagraphs

  const updateWhyCarbonStep = useCallback((nextStepIndex: number) => {
    const clampedStepIndex = Math.min(
      whyCarbonSteps.length - 1,
      Math.max(0, nextStepIndex),
    )

    if (clampedStepIndex === whyCarbonStepIndexRef.current) {
      return
    }

    const slideDirection = clampedStepIndex > whyCarbonStepIndexRef.current ? 1 : -1

    whyCarbonStepIndexRef.current = clampedStepIndex
    setWhyCarbonStepIndex(clampedStepIndex)
    setWhyCarbonSlideDirection(slideDirection)
  }, [])

  const handleIntroExitComplete = useCallback(() => {
    if (whyCarbonIntroPhaseRef.current === 'complete') {
      return
    }

    whyCarbonIntroPhaseRef.current = 'complete'
    setWhyCarbonIntroPhase('complete')
    isWhyCarbonIntroVisibleRef.current = false
    setIsWhyCarbonIntroVisible(false)
    isWhyCarbonOverlayVisibleRef.current = true
    setIsWhyCarbonOverlayVisible(true)
  }, [])

  const triggerIntroExit = useCallback(() => {
    if (whyCarbonIntroPhaseRef.current !== 'entered') {
      return
    }

    whyCarbonIntroPhaseRef.current = 'exiting'
    setWhyCarbonIntroPhase('exiting')
    isWhyCarbonIntroVisibleRef.current = true
    setIsWhyCarbonIntroVisible(true)
    isWhyCarbonOverlayVisibleRef.current = true
    setIsWhyCarbonOverlayVisible(true)

    if (prefersReducedMotion) {
      handleIntroExitComplete()
    }
  }, [handleIntroExitComplete, prefersReducedMotion])

  const resetIntroToEntered = useCallback(() => {
    whyCarbonIntroPhaseRef.current = 'entered'
    setWhyCarbonIntroPhase('entered')
    isWhyCarbonIntroVisibleRef.current = true
    setIsWhyCarbonIntroVisible(true)
    isWhyCarbonOverlayVisibleRef.current = false
    setIsWhyCarbonOverlayVisible(false)
    whyCarbonStepIndexRef.current = 0
    setWhyCarbonStepIndex(0)
    setWhyCarbonSlideDirection(1)
    setIntroResetKey((currentKey) => currentKey + 1)
  }, [])

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })

  const contentOpacity = useTransform(scrollYProgress, (latestProgress) => {
    if (prefersReducedMotion || !isScrollGatedRef.current) {
      return 1
    }

    const zoomProgress = remapZoomProgress(
      getVisualCardZoomProgress(
        latestProgress,
        copyPhaseEndRatioRef.current,
        zoomPhaseEndRatioRef.current,
      ),
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
      const sectionElement = sectionRef.current
      const copyPhaseEndRatio = copyPhaseEndRatioRef.current
      const zoomPhaseEndRatio = zoomPhaseEndRatioRef.current
      const copyScrollProgress = getCopyScrollProgress(latestProgress, copyPhaseEndRatio)
      const linearZoomProgress = getVisualCardZoomProgress(
        latestProgress,
        copyPhaseEndRatio,
        zoomPhaseEndRatio,
      )
      const zoomProgress = remapZoomProgress(linearZoomProgress)
      const releaseProgress = getPostZoomReleaseProgress(latestProgress, zoomPhaseEndRatio)
      const introSlideEndRatio = introSlideEndRatioRef.current
      const introPhase = whyCarbonIntroPhaseRef.current
      const activeZoomProgress = releaseProgress > 0 ? 1 : zoomProgress

      if (
        !isZoomStepScrollingRef.current &&
        isInZoomScrollPhase(latestProgress, copyPhaseEndRatio, zoomPhaseEndRatio) &&
        releaseProgress === 0
      ) {
        zoomStepIndexRef.current = getNearestZoomStepIndex(zoomProgress)
      }

      if (releaseProgress === 0 && !isInZoomScrollPhase(latestProgress, copyPhaseEndRatio, zoomPhaseEndRatio)) {
        zoomStepIndexRef.current = linearZoomProgress > 0 ? ZOOM_STEP_TARGETS.length - 1 : 0
      }

      const isInReleasePhase = latestProgress >= zoomPhaseEndRatio - 0.0001 && activeZoomProgress > 0

      if (isInReleasePhase && introPhase === 'idle') {
        whyCarbonIntroPhaseRef.current = 'entered'
        setWhyCarbonIntroPhase('entered')
      }

      if (!isInReleasePhase && introPhase !== 'idle') {
        whyCarbonIntroPhaseRef.current = 'idle'
        setWhyCarbonIntroPhase('idle')
        isWhyCarbonIntroVisibleRef.current = false
        setIsWhyCarbonIntroVisible(false)
        isWhyCarbonOverlayVisibleRef.current = false
        setIsWhyCarbonOverlayVisible(false)
      }

      const currentIntroPhase = whyCarbonIntroPhaseRef.current
      const shouldShowIntro =
        isInReleasePhase &&
        (currentIntroPhase === 'entered' || currentIntroPhase === 'exiting')
      const shouldShowOverlay =
        currentIntroPhase === 'exiting' || (currentIntroPhase === 'complete' && isInReleasePhase)

      if (shouldShowIntro !== isWhyCarbonIntroVisibleRef.current) {
        isWhyCarbonIntroVisibleRef.current = shouldShowIntro
        setIsWhyCarbonIntroVisible(shouldShowIntro)
      }

      if (shouldShowOverlay !== isWhyCarbonOverlayVisibleRef.current) {
        isWhyCarbonOverlayVisibleRef.current = shouldShowOverlay
        setIsWhyCarbonOverlayVisible(shouldShowOverlay)
      }

      if (
        shouldShowOverlay &&
        currentIntroPhase === 'complete' &&
        !isReleaseStepScrollingRef.current
      ) {
        const contentProgress = getWhyCarbonContentProgress(releaseProgress, introSlideEndRatio)
        updateWhyCarbonStep(getReleaseStepIndexFromProgress(contentProgress, whyCarbonSteps.length))
      }

      if (!isInReleasePhase && whyCarbonStepIndexRef.current !== 0) {
        whyCarbonStepIndexRef.current = 0
        setWhyCarbonStepIndex(0)
        setWhyCarbonSlideDirection(1)
      }

      if (copyElement && copyElement.dataset.scrollGated === 'true') {
        const maxScrollTop = copyElement.scrollHeight - copyElement.clientHeight

        if (maxScrollTop > 0) {
          copyElement.scrollTop = copyScrollProgress * maxScrollTop
        }
      }

      if (!visualCardElement || !visualCardFloaterElement) {
        return
      }

      if (activeZoomProgress > 0) {
        if (!zoomFromRectRef.current) {
          zoomFromRectRef.current = readVisualCardRect(visualCardElement)
        }

        visualCardElement.style.opacity = '0'
        visualCardElement.style.visibility = 'hidden'
        visualCardFloaterElement.style.opacity = '1'
        visualCardFloaterElement.style.visibility = 'visible'
        applyVisualCardZoom(visualCardFloaterElement, zoomFromRectRef.current, activeZoomProgress)

        if (releaseProgress > 0) {
          applyPostZoomRelease(visualCardFloaterElement, releaseProgress)
        } else {
          clearPostZoomRelease(visualCardFloaterElement)
        }

        sectionElement?.setAttribute('data-zoom-active', 'true')
        return
      }

      if (zoomFromRectRef.current) {
        clearVisualCardZoom(visualCardFloaterElement)
        zoomFromRectRef.current = null
      }

      visualCardElement.style.removeProperty('opacity')
      visualCardElement.style.removeProperty('visibility')
      visualCardFloaterElement.style.opacity = '0'
      visualCardFloaterElement.style.visibility = 'hidden'
      sectionElement?.setAttribute('data-zoom-active', 'false')

      if (isScrollGatedRef.current) {
        visualCardElement.style.clipPath = getVisualCardClipPath(copyScrollProgress)
      }
    },
    [prefersReducedMotion, updateWhyCarbonStep],
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
      const contentScrollDistance =
        window.innerHeight *
        POST_ZOOM_SCROLL_MULTIPLIER *
        WHY_CARBON_STEP_SCROLL_MULTIPLIER *
        whyCarbonSteps.length
      const postZoomScrollDistance = contentScrollDistance
      const animatedScrollDistance = copyOverflow + zoomScrollDistance + postZoomScrollDistance
      const hasZoomPhase = hasScrollableCopy

      introSlideEndRatioRef.current = 0

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

      if (!visualCardFloaterElement || visualCardFloaterElement.dataset.zoomActive !== 'true') {
        return
      }

      clearVisualCardZoom(visualCardFloaterElement)
      zoomFromRectRef.current = null
      visualCardElement?.style.removeProperty('opacity')
      visualCardElement?.style.removeProperty('visibility')
      visualCardFloaterElement.style.opacity = '0'
      visualCardFloaterElement.style.visibility = 'hidden'
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
    if (prefersReducedMotion) {
      return
    }

    let scrollCooldownTimer = 0

    const handleWheel = (event: WheelEvent) => {
      const trackElement = trackRef.current

      if (
        !trackElement ||
        !isScrollGatedRef.current ||
        isZoomStepScrollingRef.current ||
        isReleaseStepScrollingRef.current
      ) {
        return
      }

      const copyPhaseEndRatio = copyPhaseEndRatioRef.current
      const zoomPhaseEndRatio = zoomPhaseEndRatioRef.current
      const currentOverallProgress = scrollYProgress.get()
      const releaseProgress = getPostZoomReleaseProgress(currentOverallProgress, zoomPhaseEndRatio)
      const introPhase = whyCarbonIntroPhaseRef.current
      const direction = event.deltaY > 0 ? 1 : -1

      if (introPhase === 'exiting') {
        event.preventDefault()
        return
      }

      const isAtIntroHold =
        introPhase === 'entered' &&
        currentOverallProgress >= zoomPhaseEndRatio - 0.0001 &&
        releaseProgress < 0.0001

      if (isAtIntroHold) {
        if (direction > 0) {
          event.preventDefault()
          triggerIntroExit()
        }

        return
      }

      const isInContentPhase =
        introPhase === 'complete' &&
        currentOverallProgress >= zoomPhaseEndRatio - 0.0001

      if (isInContentPhase) {
        const introSlideEndRatio = introSlideEndRatioRef.current
        const contentProgress = getWhyCarbonContentProgress(releaseProgress, introSlideEndRatio)
        const currentStepIndex = getReleaseStepIndexFromProgress(
          contentProgress,
          whyCarbonSteps.length,
        )
        const nextStepIndex = currentStepIndex + direction

        if (direction < 0 && nextStepIndex < 0) {
          event.preventDefault()

          resetIntroToEntered()

          const targetOverallProgress = zoomPhaseEndRatio
          const targetScrollY = getTargetScrollYForOverallProgress(
            trackElement,
            window.scrollY,
            currentOverallProgress,
            targetOverallProgress,
          )

          isReleaseStepScrollingRef.current = true
          window.scrollTo({ top: targetScrollY, behavior: 'smooth' })

          window.clearTimeout(scrollCooldownTimer)
          scrollCooldownTimer = window.setTimeout(() => {
            isReleaseStepScrollingRef.current = false
          }, ZOOM_STEP_WHEEL_COOLDOWN_MS)

          return
        }

        if (nextStepIndex < 0 || nextStepIndex >= whyCarbonSteps.length) {
          return
        }

        event.preventDefault()

        const targetOverallProgress = getOverallProgressForReleaseStep(
          nextStepIndex,
          whyCarbonSteps.length,
          zoomPhaseEndRatio,
          introSlideEndRatio,
        )
        const targetScrollY = getTargetScrollYForOverallProgress(
          trackElement,
          window.scrollY,
          currentOverallProgress,
          targetOverallProgress,
        )

        updateWhyCarbonStep(nextStepIndex)
        isReleaseStepScrollingRef.current = true
        window.scrollTo({ top: targetScrollY, behavior: 'smooth' })

        window.clearTimeout(scrollCooldownTimer)
        scrollCooldownTimer = window.setTimeout(() => {
          isReleaseStepScrollingRef.current = false
        }, ZOOM_STEP_WHEEL_COOLDOWN_MS)

        return
      }

      if (
        !isInZoomScrollPhase(currentOverallProgress, copyPhaseEndRatio, zoomPhaseEndRatio) ||
        releaseProgress > 0
      ) {
        return
      }

      const nextStepIndex = zoomStepIndexRef.current + direction

      if (nextStepIndex < 0 || nextStepIndex >= ZOOM_STEP_TARGETS.length) {
        return
      }

      event.preventDefault()

      const targetRemappedProgress = ZOOM_STEP_TARGETS[nextStepIndex]
      const targetOverallProgress = getOverallProgressForRemappedZoom(
        targetRemappedProgress,
        copyPhaseEndRatio,
        zoomPhaseEndRatio,
      )
      const targetScrollY = getTargetScrollYForOverallProgress(
        trackElement,
        window.scrollY,
        currentOverallProgress,
        targetOverallProgress,
      )

      zoomStepIndexRef.current = nextStepIndex
      isZoomStepScrollingRef.current = true
      window.scrollTo({ top: targetScrollY, behavior: 'smooth' })

      window.clearTimeout(scrollCooldownTimer)
      scrollCooldownTimer = window.setTimeout(() => {
        isZoomStepScrollingRef.current = false
      }, ZOOM_STEP_WHEEL_COOLDOWN_MS)
    }

    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.clearTimeout(scrollCooldownTimer)
      isZoomStepScrollingRef.current = false
      isReleaseStepScrollingRef.current = false
    }
  }, [prefersReducedMotion, resetIntroToEntered, scrollYProgress, triggerIntroExit, updateWhyCarbonStep])

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
      >
        <div className="intro-section__zoom-panel-visual">
          <span className="intro-section__visual-highlight" aria-hidden="true" />

          <img
            className="intro-section__visual-image intro-section__visual-image--primary"
            src="/leaf_three.png"
            alt=""
            loading="lazy"
          />
          <img
            className="intro-section__visual-image intro-section__visual-image--secondary"
            src="/leafparticles.png"
            alt=""
            loading="lazy"
          />
        </div>

        {isWhyCarbonIntroVisible ? (
          <WhyCarbonIntroTitle
            key={introResetKey}
            phase={whyCarbonIntroPhase === 'exiting' ? 'exiting' : 'entered'}
            prefersReducedMotion={Boolean(prefersReducedMotion)}
            onExitComplete={handleIntroExitComplete}
          />
        ) : null}

        {isWhyCarbonOverlayVisible ? (
          <WhyCarbonOverlay
            activeStepIndex={whyCarbonStepIndex}
            slideDirection={whyCarbonSlideDirection}
            prefersReducedMotion={Boolean(prefersReducedMotion)}
            isTransitionEnter={whyCarbonIntroPhase === 'exiting'}
          />
        ) : null}
      </div>
    </motion.div>
  )
}

export default IntroSection
