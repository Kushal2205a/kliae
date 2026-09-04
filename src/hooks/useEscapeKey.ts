import { useEffect, useRef } from "react";

interface EscapeLayer {
  id: symbol;
  close: () => void;
}

const layers: EscapeLayer[] = [];

function handleEscape(event: KeyboardEvent): void {
  if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;

  const layer = layers[layers.length - 1];
  if (!layer) return;

  event.preventDefault();
  event.stopPropagation();
  layer.close();
}

/** Closes only the most recently opened dismissible surface on Escape. */
export function useEscapeKey(onEscape: () => void, enabled = true): void {
  const callbackRef = useRef(onEscape);
  callbackRef.current = onEscape;

  useEffect(() => {
    if (!enabled) return;

    const layer: EscapeLayer = {
      id: Symbol("escape-layer"),
      close: () => callbackRef.current(),
    };

    layers.push(layer);
    if (layers.length === 1) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      const index = layers.findIndex((entry) => entry.id === layer.id);
      if (index >= 0) layers.splice(index, 1);
      if (layers.length === 0) {
        window.removeEventListener("keydown", handleEscape);
      }
    };
  }, [enabled]);
}
