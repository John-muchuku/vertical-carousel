"use client"

import * as React from "react"
import Image from "next/image"
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "framer-motion"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const RIM_PERCENT = 12
const SCALE_STEP = 0.11
const MAX_DISTANCE = 2
const DECK_SPRING = {
  type: "spring",
  stiffness: 220,
  damping: 30,
  mass: 0.9,
  restDelta: 0.001,
  restSpeed: 0.01,
} as const

function smoothstep(value: number) {
  return value * value * (3 - 2 * value)
}

type Slide = {
  /** Accessible label for the card. */
  label: string
  /** Phone image shown in the card's square slot (from /public/phones). */
  image: string
  /** Card heading. */
  title: string
  /** Card body copy. */
  description: string
}

const SLIDES: Slide[] = [
  {
    label: "Project overview",
    image: "/phones/Frame_131_mysdfq.avif",
    title: "Project overview",
    description:
      "Track milestones, owners, and deadlines in one shared view that keeps the whole team aligned from kickoff to launch.",
  },
  {
    label: "Weekly highlights",
    image: "/phones/Frame-251_w0er66.avif",
    title: "Weekly highlights",
    description:
      "A quick digest of wins, blockers, and key metrics from the past week, delivered to your inbox every Monday.",
  },
  {
    label: "Team activity",
    image: "/phones/Frame_180_su3jpo.avif",
    title: "Team activity",
    description:
      "See who shipped what, which reviews are in progress, and how work is moving across every project in real time.",
  },
  {
    label: "Design review",
    image: "/phones/Frame-272_rrdqlu.avif",
    title: "Design review",
    description:
      "Collect feedback inline, iterate on mockups together, and sign off on final specs before handoff.",
  },
  {
    label: "Recent updates",
    image: "/phones/Frame_272_mqtwxz.avif",
    title: "Recent updates",
    description:
      "Everything new in this release: improvements, fixes, and a peek at what the team is building next.",
  },
]

function wrapIndex(index: number) {
  return ((index % SLIDES.length) + SLIDES.length) % SLIDES.length
}

function wrapDistance(distance: number) {
  return distance - Math.round(distance / SLIDES.length) * SLIDES.length
}

function DeckSlide({
  slide,
  index,
  position,
  active,
}: {
  slide: Slide
  index: number
  position: MotionValue<number>
  active: boolean
}) {
  // Every card follows the same continuous position, including through the
  // first/last seam. Motion updates these styles without React frame renders.
  const distance = useTransform(position, (value) => wrapDistance(index - value))
  const depth = useTransform(distance, (value) => {
    const absolute = Math.abs(value)
    const level = Math.floor(absolute)
    return level + smoothstep(absolute - level)
  })
  const y = useTransform(() =>
    distance.get() < 0
      ? `${-Math.min(depth.get(), MAX_DISTANCE) * RIM_PERCENT}%`
      : "0%"
  )
  const scale = useTransform(depth, (value) => 1 - value * SCALE_STEP)
  const opacity = useTransform(distance, (value) => {
    // Hide the rear card as it changes sides, keeping front cards opaque.
    const fade = Math.max(
      0,
      Math.min(1, (Math.abs(value) - MAX_DISTANCE) / (SLIDES.length / 2 - MAX_DISTANCE))
    )
    return 1 - smoothstep(fade)
  })
  const zIndex = useTransform(distance, (value) => 100 - Math.round(Math.abs(value) * 20))

  return (
    <motion.div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${SLIDES.length}`}
      aria-hidden={!active}
      data-deck-slide
      className="pointer-events-none absolute inset-0 flex items-center justify-center will-change-transform"
      style={{ y, scale, opacity, zIndex }}
    >
      <CarouselCard {...slide} />
    </motion.div>
  )
}

function CarouselCard({ label, image, title, description }: Slide) {
  return (
    <div className="flex h-28 w-full max-w-[288px] items-stretch gap-2.5 rounded-[18px] border border-zinc-200 bg-zinc-100 p-2.5 shadow-[0_2px_5px_rgb(0_0_0/0.06)]">
      <div className="relative aspect-square h-full shrink-0 overflow-hidden rounded-[14px] bg-white/10">
        <Image
          src={image}
          alt={label}
          fill
          sizes="76px"
          className="object-contain"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <h3 className="truncate text-sm font-semibold text-zinc-800">
          {title}
        </h3>
        <p className="line-clamp-2 text-[11px] leading-snug text-zinc-600">
          {description}
        </p>
      </div>
    </div>
  )
}

function DeckDots({
  selected,
  onSelect,
}: {
  selected: number
  onSelect: (index: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {SLIDES.map((slide, index) => (
        <button
          key={slide.label}
          type="button"
          aria-label={`Go to slide ${index + 1}`}
          aria-current={selected === index}
          onClick={() => onSelect(index)}
          className={cn(
            "size-2 cursor-pointer rounded-full transition-colors duration-200",
            selected === index ? "bg-zinc-400" : "bg-zinc-300 hover:bg-zinc-400/70"
          )}
        />
      ))}
    </div>
  )
}

function DeckControls({
  selected,
  onSelect,
  onPrevious,
  onNext,
}: {
  selected: number
  onSelect: (index: number) => void
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="mt-9 flex items-center justify-center gap-6">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onPrevious}
        className="size-9 rounded-xl border-none bg-zinc-200 text-zinc-500 shadow-sm hover:bg-zinc-300 hover:text-zinc-600"
      >
        <ArrowLeftIcon />
        <span className="sr-only">Previous slide</span>
      </Button>
      <DeckDots selected={selected} onSelect={onSelect} />
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onNext}
        className="size-9 rounded-xl border-none bg-zinc-200 text-zinc-500 shadow-sm hover:bg-zinc-300 hover:text-zinc-600"
      >
        <ArrowRightIcon />
        <span className="sr-only">Next slide</span>
      </Button>
    </div>
  )
}

export function StackedCarousel({ className }: { className?: string }) {
  const position = useMotionValue(0)
  const reducedMotion = useReducedMotion()
  const [selected, setSelected] = React.useState(0)
  const target = React.useRef(0)
  const viewport = React.useRef<HTMLDivElement>(null)
  const panStart = React.useRef<{ position: number; height: number } | null>(null)

  React.useEffect(() => () => position.stop(), [position])

  const goTo = (next: number, velocity?: number) => {
    target.current = next
    setSelected(wrapIndex(next))

    if (reducedMotion) {
      position.jump(next)
      return
    }

    // Retarget the running spring so rapid inputs preserve its momentum.
    animate(position, next, { ...DECK_SPRING, velocity })
  }

  const handlePanStart = (_event: PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) return
    position.stop()
    panStart.current = {
      position: position.get(),
      height: viewport.current?.clientHeight || 176,
    }
  }

  const handlePan = (_event: PointerEvent, info: PanInfo) => {
    if (!panStart.current || reducedMotion) return
    position.set(panStart.current.position - info.offset.y / panStart.current.height)
  }

  const handlePanEnd = (_event: PointerEvent, info: PanInfo) => {
    if (!panStart.current) return
    const { position: start, height } = panStart.current
    const velocity = -info.velocity.y / height
    const released = start - info.offset.y / height
    const projected = released + Math.max(-1, Math.min(1, velocity * 0.18))
    panStart.current = null
    goTo(Math.round(projected), velocity)
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      onKeyDownCapture={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault()
          goTo(target.current - 1)
        } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault()
          goTo(target.current + 1)
        }
      }}
      aria-label="Project updates"
      className={cn("w-full max-w-[312px]", className)}
    >
      <motion.div
        ref={viewport}
        className="relative isolate h-44 touch-pan-x touch-pinch-zoom cursor-grab overflow-hidden select-none active:cursor-grabbing"
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
      >
        {SLIDES.map((slide, index) => (
          <DeckSlide
            key={slide.label}
            slide={slide}
            index={index}
            position={position}
            active={selected === index}
          />
        ))}
      </motion.div>
      <DeckControls
        selected={selected}
        onSelect={(index) => goTo(target.current + wrapDistance(index - target.current))}
        onPrevious={() => goTo(target.current - 1)}
        onNext={() => goTo(target.current + 1)}
      />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {SLIDES[selected].title}, slide {selected + 1} of {SLIDES.length}
      </p>
    </div>
  )
}
