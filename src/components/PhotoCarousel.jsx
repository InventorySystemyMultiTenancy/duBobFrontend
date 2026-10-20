import { useCallback, useEffect, useRef, useState } from "react";

const GAP_PX = 16;
const AUTOPLAY_MS = 4000;
const SWIPE_THRESHOLD_PX = 40;

function getPerView() {
  if (typeof window === "undefined") return 1;
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 640) return 2;
  return 1;
}

function Chevron({ direction }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-5 w-5 ${direction === "left" ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="m8 4 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Carrossel de fotos: avança sozinho (pausa com mouse/dedo/foco em cima),
 * setas, bolinhas, arrastar no celular e clique para ampliar.
 * items: [{ image, title }]
 */
export default function PhotoCarousel({ items, onSelect }) {
  const [perView, setPerView] = useState(getPerView);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragRef = useRef({ startX: null, moved: false });

  const pageCount = Math.max(1, items.length - perView + 1);
  const current = Math.min(index, pageCount - 1);

  const goTo = useCallback(
    (next) => setIndex(((next % pageCount) + pageCount) % pageCount),
    [pageCount],
  );

  useEffect(() => {
    const handleResize = () => setPerView(getPerView());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (paused || reduceMotion || pageCount <= 1) return undefined;
    const timer = window.setInterval(
      () => setIndex((value) => (Math.min(value, pageCount - 1) + 1) % pageCount),
      AUTOPLAY_MS,
    );
    return () => window.clearInterval(timer);
  }, [paused, pageCount]);

  const handlePointerDown = (event) => {
    dragRef.current = { startX: event.clientX, moved: false };
    setPaused(true);
  };

  const handlePointerMove = (event) => {
    const { startX } = dragRef.current;
    if (startX === null) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 6) dragRef.current.moved = true;
    setDragOffset(delta);
  };

  const finishDrag = () => {
    const { startX } = dragRef.current;
    if (startX === null) return;
    if (dragOffset <= -SWIPE_THRESHOLD_PX) goTo(current + 1);
    else if (dragOffset >= SWIPE_THRESHOLD_PX) goTo(current - 1);
    dragRef.current.startX = null;
    setDragOffset(0);
  };

  const slideBasis = `calc((100% - ${(perView - 1) * GAP_PX}px) / ${perView})`;
  const translate = `calc(${-current} * (${slideBasis} + ${GAP_PX}px) + ${dragOffset}px)`;

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Fotos dos produtos"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        finishDrag();
      }}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-3xl">
        <div
          className={`flex touch-pan-y select-none ${
            dragOffset ? "" : "transition-transform duration-500 ease-out"
          }`}
          style={{ gap: `${GAP_PX}px`, transform: `translateX(${translate})` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onTouchEnd={() => setPaused(false)}
        >
          {items.map((item, itemIndex) => {
            const visible =
              itemIndex >= current && itemIndex < current + perView;
            return (
              <button
                key={item.image}
                type="button"
                tabIndex={visible ? 0 : -1}
                aria-hidden={!visible}
                aria-label={`Ampliar foto: ${item.title}`}
                onClick={() => {
                  if (!dragRef.current.moved) onSelect?.(itemIndex);
                }}
                className="group relative shrink-0 overflow-hidden rounded-3xl bg-white shadow-card focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/40"
                style={{ flexBasis: slideBasis }}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  draggable="false"
                  className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-5 pb-4 pt-12 text-left font-display text-lg font-semibold text-white">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {pageCount > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            aria-label="Fotos anteriores"
            className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg backdrop-blur transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/40"
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            aria-label="Próximas fotos"
            className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg backdrop-blur transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/40"
          >
            <Chevron direction="right" />
          </button>

          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: pageCount }, (_, dot) => (
              <button
                key={dot}
                type="button"
                onClick={() => goTo(dot)}
                aria-label={`Ir para a foto ${dot + 1}`}
                aria-current={dot === current}
                className={`h-2.5 rounded-full transition-all ${
                  dot === current
                    ? "w-8 bg-secondary"
                    : "w-2.5 bg-primary/20 hover:bg-primary/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
