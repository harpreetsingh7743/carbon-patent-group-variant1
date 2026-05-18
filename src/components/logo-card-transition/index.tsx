import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useRef, useState } from 'react'

import LogoCard from '../logo-card'
import './styles.css'

gsap.registerPlugin(ScrollTrigger)

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

function getTransitionClipPath(progress: number) {
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const points = VISUAL_CARD_CLIP_END.map((startPoint, pointIndex) => {
    const endPoint = VISUAL_CARD_CLIP_FULL[pointIndex]
    const x = startPoint[0] + (endPoint[0] - startPoint[0]) * clampedProgress
    const y = startPoint[1] + (endPoint[1] - startPoint[1]) * clampedProgress

    return `${x}% ${y}%`
  })

  return `polygon(${points.join(', ')})`
}

function readElementRect(element: HTMLElement): LogoCardRect {
  const bounds = element.getBoundingClientRect()

  return {
    top: bounds.top,
    left: bounds.left,
    width: bounds.width,
    height: bounds.height,
  }
}

function applyFloatingCardRect(
  floatingCardElement: HTMLElement,
  fromRect: LogoCardRect,
  toRect: LogoCardRect,
  progress: number,
) {
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const top = fromRect.top + (toRect.top - fromRect.top) * clampedProgress
  const left = fromRect.left + (toRect.left - fromRect.left) * clampedProgress
  const width = fromRect.width + (toRect.width - fromRect.width) * clampedProgress
  const height = fromRect.height + (toRect.height - fromRect.height) * clampedProgress
  const borderRadius = 1.8 + (0 - 1.8) * clampedProgress

  floatingCardElement.style.top = `${top}px`
  floatingCardElement.style.left = `${left}px`
  floatingCardElement.style.width = `${width}px`
  floatingCardElement.style.height = `${height}px`
  floatingCardElement.style.borderRadius = `${borderRadius}rem`
  floatingCardElement.style.clipPath = getTransitionClipPath(clampedProgress)
}

function LogoCardTransition({
  sourceCardRef,
  targetShellRef,
  imageAlt,
}: LogoCardTransitionProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const pinRef = useRef<HTMLDivElement | null>(null)
  const floatingCardRef = useRef<HTMLDivElement | null>(null)
  const transitionProgress = useMotionValue(0)
  const prefersReducedMotion = useReducedMotion()
  const [isTransitionActive, setIsTransitionActive] = useState(false)
  const [isTransitionComplete, setIsTransitionComplete] = useState(false)

  const floatingCardOpacity = useTransform(transitionProgress, [0, 0.04, 1], [0, 1, 1])

  useLayoutEffect(() => {
    const trackElement = trackRef.current
    const pinElement = pinRef.current
    const floatingCardElement = floatingCardRef.current
    const sourceCardElement = sourceCardRef.current
    const targetShellElement = targetShellRef.current

    if (
      prefersReducedMotion ||
      !trackElement ||
      !pinElement ||
      !floatingCardElement ||
      !sourceCardElement ||
      !targetShellElement
    ) {
      return
    }

    let fromRect = readElementRect(sourceCardElement)
    let toRect = readElementRect(targetShellElement)

    const captureTransitionRects = () => {
      fromRect = readElementRect(sourceCardElement)
      toRect = readElementRect(targetShellElement)
    }

    const syncTransitionState = (progress: number) => {
      transitionProgress.set(progress)

      const isActive = progress > 0 && progress < 1
      const isComplete = progress >= 0.999

      setIsTransitionActive(isActive)
      setIsTransitionComplete(isComplete)

      if (isActive || isComplete) {
        applyFloatingCardRect(floatingCardElement, fromRect, toRect, progress)
      }
    }

    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: trackElement,
        start: 'top top',
        end: 'bottom top',
        pin: pinElement,
        scrub: 0.85,
        invalidateOnRefresh: true,
        onRefresh: captureTransitionRects,
        onEnter: () => {
          captureTransitionRects()
          applyFloatingCardRect(floatingCardElement, fromRect, toRect, 0)
        },
        onEnterBack: () => {
          captureTransitionRects()
        },
        onLeaveBack: () => {
          setIsTransitionActive(false)
          setIsTransitionComplete(false)
          transitionProgress.set(0)
          floatingCardElement.style.cssText = ''
        },
        onUpdate: (self) => {
          syncTransitionState(self.progress)
        },
      })
    }, trackElement)

    const handleResize = () => {
      ScrollTrigger.refresh()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      context.revert()
      floatingCardElement.style.cssText = ''
      setIsTransitionActive(false)
      setIsTransitionComplete(false)
      transitionProgress.set(0)
    }
  }, [prefersReducedMotion, sourceCardRef, targetShellRef, transitionProgress])

  if (prefersReducedMotion) {
    return null
  }

  return (
    <div
      ref={trackRef}
      className="logo-card-transition__track"
      aria-hidden="true"
      data-transition-active={isTransitionActive ? 'true' : 'false'}
      data-transition-complete={isTransitionComplete ? 'true' : 'false'}
    >
      <motion.div ref={pinRef} className="logo-card-transition__pin">
        <div className="logo-card-transition__layer">
          <LogoCard
            cardRef={floatingCardRef}
            imageAlt={imageAlt}
            className="logo-card-transition__floater intro-section__visual-card"
            style={{ opacity: floatingCardOpacity }}
            isHidden={!isTransitionActive && !isTransitionComplete}
          />
        </div>
      </motion.div>
    </div>
  )
}

export default LogoCardTransition
