import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ScreenContentType } from "../../types";

// ══════════════════════════════════════════════════════════════════════════════
// WorkScreen — Canvas2D-texture-based monitor content.
//
// Renders to an offscreen <canvas> at 256x160 (cheap!), updates every 2-3s.
// Content types: code, design, terminal, dashboard, chat, document, idle,
// meeting-notes, off.
//
// Usage: place at the monitor position inside a desk group.
// ══════════════════════════════════════════════════════════════════════════════

const CANVAS_W = 256;
const CANVAS_H = 160;
const UPDATE_INTERVAL_MS = 2500; // repaint every 2.5 seconds

// ── Deterministic pseudo-random for consistent "fake" content ───────────────

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Drawing routines per content type ───────────────────────────────────────

function drawCode(ctx: CanvasRenderingContext2D, rand: () => number) {
  ctx.fillStyle = "#1e1e2e";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Line numbers gutter
  ctx.fillStyle = "#2a2a3e";
  ctx.fillRect(0, 0, 24, CANVAS_H);

  const colors = ["#89b4fa", "#a6e3a1", "#f9e2af", "#cba6f7", "#f38ba8", "#94e2d5"];
  const y0 = 6;
  const lineH = 11;
  const lines = Math.floor(CANVAS_H / lineH);

  for (let i = 0; i < lines; i++) {
    const y = y0 + i * lineH;

    // Line number
    ctx.fillStyle = "#585b70";
    ctx.font = "8px monospace";
    ctx.fillText(String(i + 1).padStart(3, " "), 2, y + 7);

    // Indentation
    const indent = Math.floor(rand() * 4) * 12 + 28;

    // Keyword
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    const kwLen = 20 + rand() * 40;
    ctx.fillRect(indent, y + 2, kwLen, 6);

    // Maybe a second token
    if (rand() > 0.3) {
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      const tkLen = 15 + rand() * 50;
      ctx.fillRect(indent + kwLen + 4, y + 2, tkLen, 6);
    }

    // Maybe a third token
    if (rand() > 0.5) {
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      const tkLen = 10 + rand() * 30;
      ctx.fillRect(indent + kwLen + 60, y + 2, tkLen, 6);
    }
  }
}

function drawDesign(ctx: CanvasRenderingContext2D, rand: () => number) {
  ctx.fillStyle = "#f8f8fc";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Toolbar
  ctx.fillStyle = "#e4e4ec";
  ctx.fillRect(0, 0, CANVAS_W, 14);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = "#c0c0d0";
    ctx.fillRect(4 + i * 18, 3, 14, 8);
  }

  // Left panel
  ctx.fillStyle = "#eeeef4";
  ctx.fillRect(0, 14, 40, CANVAS_H - 14);

  // Canvas area — wireframe rectangles
  const colors = ["#a78bfa", "#60a5fa", "#f472b6", "#34d399", "#fbbf24"];
  for (let i = 0; i < 6; i++) {
    const x = 50 + rand() * 140;
    const y = 24 + rand() * 100;
    const w = 20 + rand() * 60;
    const h = 15 + rand() * 40;
    ctx.strokeStyle = colors[Math.floor(rand() * colors.length)];
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Some filled
    if (rand() > 0.5) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }
  }
}

function drawTerminal(ctx: CanvasRenderingContext2D, rand: () => number) {
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const lineH = 10;
  const lines = Math.floor(CANVAS_H / lineH);
  const greens = ["#00ff60", "#00cc44", "#33ff88", "#66ffaa"];

  for (let i = 0; i < lines; i++) {
    const y = 4 + i * lineH;

    // Prompt symbol
    ctx.fillStyle = "#00ff60";
    ctx.font = "8px monospace";
    if (rand() > 0.3) {
      ctx.fillText("$", 4, y + 7);
    }

    // Text tokens
    const tokens = 1 + Math.floor(rand() * 4);
    let x = 14;
    for (let t = 0; t < tokens; t++) {
      ctx.fillStyle = greens[Math.floor(rand() * greens.length)];
      const len = 10 + rand() * 50;
      ctx.fillRect(x, y + 2, len, 5);
      x += len + 4;
    }
  }
}

function drawDashboard(ctx: CanvasRenderingContext2D, rand: () => number) {
  ctx.fillStyle = "#141425";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Header bar
  ctx.fillStyle = "#1e1e3a";
  ctx.fillRect(0, 0, CANVAS_W, 16);
  ctx.fillStyle = "#8888cc";
  ctx.font = "9px sans-serif";
  ctx.fillText("Dashboard", 6, 11);

  // Cards (2x2 grid)
  const cardColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const x = 8 + c * 124;
      const y = 22 + r * 68;
      ctx.fillStyle = "#1e1e38";
      ctx.fillRect(x, y, 116, 60);

      // Bar chart
      ctx.fillStyle = cardColors[r * 2 + c];
      const bars = 5 + Math.floor(rand() * 4);
      const barW = 100 / bars;
      for (let b = 0; b < bars; b++) {
        const bh = 10 + rand() * 35;
        ctx.fillRect(x + 8 + b * barW, y + 50 - bh, barW - 2, bh);
      }

      // Number
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(String(Math.floor(rand() * 999)), x + 6, y + 14);
    }
  }
}

function drawChat(ctx: CanvasRenderingContext2D, rand: () => number) {
  ctx.fillStyle = "#f5f5fa";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Header
  ctx.fillStyle = "#6366f1";
  ctx.fillRect(0, 0, CANVAS_W, 16);

  // Messages
  let y = 22;
  const bubbleColors = ["#e0e0f0", "#dbeafe"];
  for (let i = 0; i < 8 && y < CANVAS_H - 20; i++) {
    const isMe = rand() > 0.5;
    const w = 60 + rand() * 80;
    const h = 12 + rand() * 10;
    const x = isMe ? CANVAS_W - w - 8 : 8;
    ctx.fillStyle = isMe ? "#818cf8" : bubbleColors[Math.floor(rand() * 2)];
    const radius = 6;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();

    // Text lines inside bubble
    ctx.fillStyle = isMe ? "#f0f0ff" : "#444466";
    ctx.fillRect(x + 6, y + 4, w - 12, 4);
    if (h > 16) ctx.fillRect(x + 6, y + 10, w * 0.6, 4);

    y += h + 6;
  }

  // Input bar
  ctx.fillStyle = "#e8e8f0";
  ctx.fillRect(0, CANVAS_H - 18, CANVAS_W, 18);
}

function drawDocument(ctx: CanvasRenderingContext2D, rand: () => number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Toolbar
  ctx.fillStyle = "#f0f0f4";
  ctx.fillRect(0, 0, CANVAS_W, 14);

  // Text lines
  const lineH = 10;
  for (let i = 0; i < 14; i++) {
    const y = 20 + i * lineH;
    const indent = i === 0 || i === 7 ? 20 : 30;
    const width = 80 + rand() * 100;

    // Headers are darker/wider
    if (i === 0 || i === 7) {
      ctx.fillStyle = "#333344";
      ctx.fillRect(indent, y, width, 6);
    } else {
      ctx.fillStyle = "#999aaa";
      ctx.fillRect(indent, y, width, 4);
    }
  }
}

function drawMeetingNotes(ctx: CanvasRenderingContext2D, rand: () => number) {
  ctx.fillStyle = "#fffff8";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Title
  ctx.fillStyle = "#333344";
  ctx.fillRect(20, 10, 120, 7);

  // Bullet points
  for (let i = 0; i < 10; i++) {
    const y = 28 + i * 12;

    // Bullet dot
    ctx.fillStyle = "#6366f1";
    ctx.beginPath();
    ctx.arc(24, y + 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Text line
    ctx.fillStyle = "#666680";
    const w = 60 + rand() * 100;
    ctx.fillRect(32, y, w, 4);
  }
}

function drawIdle(ctx: CanvasRenderingContext2D, rand: () => number) {
  ctx.fillStyle = "#0a0a12";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Faint screensaver glow
  const cx = 64 + rand() * 128;
  const cy = 40 + rand() * 80;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
  gradient.addColorStop(0, "rgba(100, 100, 200, 0.12)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawOff(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#050508";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// ── Dispatcher ──────────────────────────────────────────────────────────────

function paintCanvas(
  ctx: CanvasRenderingContext2D,
  contentType: ScreenContentType,
  seed: number
) {
  const rand = seededRand(seed);
  switch (contentType) {
    case "code":
      return drawCode(ctx, rand);
    case "design":
      return drawDesign(ctx, rand);
    case "terminal":
      return drawTerminal(ctx, rand);
    case "dashboard":
      return drawDashboard(ctx, rand);
    case "chat":
      return drawChat(ctx, rand);
    case "document":
      return drawDocument(ctx, rand);
    case "meeting-notes":
      return drawMeetingNotes(ctx, rand);
    case "idle":
      return drawIdle(ctx, rand);
    case "off":
      return drawOff(ctx);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// WorkScreen component — renders to a CanvasTexture, updates infrequently.
// ══════════════════════════════════════════════════════════════════════════════

interface WorkScreenProps {
  contentType: ScreenContentType;
  /** Optional position override — defaults to monitor position on desk */
  position?: [number, number, number];
  /** Screen width in world units */
  width?: number;
  /** Screen height in world units */
  height?: number;
}

export function WorkScreen({
  contentType,
  position = [0, 1.0, -0.2],
  width = 0.5,
  height = 0.32,
}: WorkScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const seedRef = useRef(Math.floor(Math.random() * 100000));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create the offscreen canvas + texture once
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvasRef.current = canvas;

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    textureRef.current = tex;

    // Initial paint
    const ctx = canvas.getContext("2d");
    if (ctx) paintCanvas(ctx, contentType, seedRef.current);

    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally stable — content type changes handled by effect

  // Repaint periodically + on content type change
  useEffect(() => {
    const canvas = canvasRef.current;
    const tex = textureRef.current;
    if (!canvas || !tex) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Paint immediately on content change
    seedRef.current = Math.floor(Math.random() * 100000);
    paintCanvas(ctx, contentType, seedRef.current);
    tex.needsUpdate = true;

    // Then repaint every UPDATE_INTERVAL_MS with a new seed
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      seedRef.current = Math.floor(Math.random() * 100000);
      paintCanvas(ctx, contentType, seedRef.current);
      tex.needsUpdate = true;
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [contentType]);

  // Emissive material so the screen "glows" slightly
  const screenMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.2,
        metalness: 0.0,
        emissiveMap: texture,
        emissiveIntensity: 0.3,
        emissive: new THREE.Color("#ffffff"),
      }),
    [texture]
  );

  return (
    <mesh position={position} material={screenMat}>
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}

export default WorkScreen;
