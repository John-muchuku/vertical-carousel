"use client"

import * as React from "react"
import Image from "next/image"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

/**
 * Deck effect tuning.
 * - TRANSLATE_FACTOR: how far a neighbour slide is pulled toward the active
 *   card. Each card behind peeks a rim of step * (1 - TRANSLATE_FACTOR)
 *   per level above the active card (proportional to slide height),
 *   like a stacked deck. Cards below the active card are tucked behind
 *   it instead, so the deck only stacks upward.
 * - SCALE_STEP: how much smaller each card behind gets per level.
 * - MAX_DISTANCE: deck levels that stay fully visible. The rearmost card
 *   fades out before it wraps around to the other side of the deck.
 */
const TRANSLATE_FACTOR = 0.88
const SCALE_STEP = 0.11
const MAX_DISTANCE = 2

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

/**
 * Applies the stacked-deck transform to every slide on scroll.
 *
 * The transform goes on the inner `[data-deck-slide]` wrapper — never on the
 * Embla slide node, which Embla itself transforms for looping. Each card is
 * positioned at its wrapped deck location. Embla's cached measurements and
 * rendered scroll position compensate for its container and loop shifts
 * without measuring layout on every animation frame.
 *
 * The deck is top-only: cards above the active card peek a rim upward, while
 * cards below it are tucked behind the active card and emerge from underneath
 * as they scroll into the active spot — nothing ever peeks below.
 */
function DeckEffect() {
  const { api } = useCarousel()

  React.useLayoutEffect(() => {
    if (!api) return
    let engine = api.internalEngine()
    let slideNodes = api.slideNodes()
    let deckNodes = slideNodes.map((node) =>
      node.querySelector<HTMLElement>("[data-deck-slide]")
    )

    const update = () => {
      const progress = api.scrollProgress()
      const snaps = api.scrollSnapList()
      const slideCount = snaps.length
      const rim = (engine.slideRects[0]?.height || 0) * (1 - TRANSLATE_FACTOR)
      // Match the two-decimal translation rendered by Embla.
      const location = Math.round(engine.offsetLocation.get() * 100) / 100

      if (!slideCount || !rim) return

      slideNodes.forEach((slideNode, index) => {
        const deckNode = deckNodes[index]
        if (!deckNode) return

        // Signed distance to this snap, wrapped for loop mode ([-0.5, 0.5)).
        const diff = snaps[index] - progress
        const wrapped = diff - Math.round(diff)
        const distance = wrapped * slideCount
        const abs = Math.abs(distance)
        // Ease between deck levels, preserving the original pose at every
        // snap and avoiding a velocity kink as a card crosses the front.
        const level = Math.floor(abs)
        const depth = level + smoothstep(abs - level)

        const loopPoint = engine.slideLooper.loopPoints.find(
          (point) => point.index === index
        )
        const slideTop =
          engine.slideRects[index].top -
          engine.containerRect.top +
          location +
          (loopPoint?.slideLocation.get() ?? 0)
        const offset = distance < 0 ? -Math.min(depth, MAX_DISTANCE) * rim : 0
        const translateY = offset - slideTop
        const scale = 1 - Math.min(depth, MAX_DISTANCE + 1) * SCALE_STEP

        // Only the rearmost card fades at the wrap point. Front cards stay
        // fully opaque so their content never blends with the cards behind.
        const fadeRange = slideCount / 2 - MAX_DISTANCE
        const fade =
          fadeRange > 0
            ? Math.max(0, Math.min(1, (abs - MAX_DISTANCE) / fadeRange))
            : 0

        deckNode.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
        deckNode.style.opacity = `${1 - smoothstep(fade)}`
        // The closest card must be on top, including at the first/last seam.
        slideNode.style.zIndex = `${100 - Math.round(abs * 20)}`
      })
    }

    const reInit = () => {
      engine = api.internalEngine()
      slideNodes = api.slideNodes()
      deckNodes = slideNodes.map((node) =>
        node.querySelector<HTMLElement>("[data-deck-slide]")
      )
      update()
    }

    update()
    api.on("scroll", update)
    api.on("select", update)
    api.on("settle", update)
    api.on("reInit", reInit)

    return () => {
      api.off("scroll", update)
      api.off("select", update)
      api.off("settle", update)
      api.off("reInit", reInit)
      slideNodes.forEach((slideNode, index) => {
        slideNode.style.zIndex = ""
        deckNodes[index]?.style.removeProperty("transform")
        deckNodes[index]?.style.removeProperty("opacity")
      })
    }
  }, [api])

  return null
}

function CarouselCard({ label, image, title, description }: Slide) {
  return (
    <div className="flex h-28 w-full max-w-[288px] items-stretch gap-2.5 rounded-[18px] bg-zinc-100 p-2.5 shadow-[0_20px_45px_-18px_rgb(0_0_0/0.25)]">
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

function DeckDots({ className }: { className?: string }) {
  const { api } = useCarousel()
  const [selected, setSelected] = React.useState(0)

  React.useEffect(() => {
    if (!api) return
    const onSelect = () => setSelected(api.selectedScrollSnap())
    onSelect()
    api.on("select", onSelect)
    api.on("reInit", onSelect)

    return () => {
      api.off("select", onSelect)
      api.off("reInit", onSelect)
    }
  }, [api])

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {SLIDES.map((slide, index) => (
        <button
          key={slide.label}
          type="button"
          aria-label={`Go to slide ${index + 1}`}
          aria-current={selected === index}
          onClick={() => api?.scrollTo(index)}
          className={cn(
            "size-2 cursor-pointer rounded-full transition-colors duration-200",
            selected === index ? "bg-zinc-400" : "bg-zinc-300 hover:bg-zinc-400/70"
          )}
        />
      ))}
    </div>
  )
}

function DeckControls({ className }: { className?: string }) {
  const { scrollPrev, scrollNext } = useCarousel()

  return (
    <div className={cn("flex items-center justify-center gap-6", className)}>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={scrollPrev}
        className="size-9 rounded-xl border-none bg-zinc-200 text-zinc-500 shadow-sm hover:bg-zinc-300 hover:text-zinc-600"
      >
        <ArrowLeftIcon />
        <span className="sr-only">Previous slide</span>
      </Button>
      <DeckDots />
      <Button
        variant="outline"
        size="icon-sm"
        onClick={scrollNext}
        className="size-9 rounded-xl border-none bg-zinc-200 text-zinc-500 shadow-sm hover:bg-zinc-300 hover:text-zinc-600"
      >
        <ArrowRightIcon />
        <span className="sr-only">Next slide</span>
      </Button>
    </div>
  )
}

export function StackedCarousel({ className }: { className?: string }) {
  return (
    <Carousel
      orientation="vertical"
      opts={{
        loop: true,
        align: "center",
        containScroll: false,
        duration: 30,
        breakpoints: {
          "(prefers-reduced-motion: reduce)": { duration: 0 },
        },
      }}
      aria-label="Project updates"
      className={cn("w-full max-w-[312px]", className)}
    >
      <CarouselContent className="mt-0 h-44 touch-pan-x touch-pinch-zoom cursor-grab select-none active:cursor-grabbing">
        {SLIDES.map((slide, index) => (
          <CarouselItem
            key={slide.label}
            aria-label={`${index + 1} of ${SLIDES.length}`}
            className="h-44 pt-0"
          >
            <div className="flex h-full items-center justify-center">
              <div data-deck-slide className="flex w-full justify-center will-change-transform">
                <CarouselCard {...slide} />
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <DeckEffect />
      <DeckControls className="mt-9" />
    </Carousel>
  )
}
