"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface GlobePoint {
  code: string;
  lat: number;
  lon: number;
}

interface GlobeProps {
  origin: GlobePoint;
  destinations: GlobePoint[];
  /** IATA code of the destination to emphasise; the globe turns toward that route. */
  highlight?: string;
  className?: string;
}

const RAD = Math.PI / 180;
const GOLD = "52,193,195";
const GOLD_SOFT = "107,211,214";
const TEAL = "124,155,219";
const SAND = "243,247,249";

type Vec3 = [number, number, number];

const toVec = (lat: number, lon: number): Vec3 => {
  const la = lat * RAD;
  const lo = lon * RAD;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

/** Spherical interpolation between two unit vectors. */
function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return a;
  const s = Math.sin(omega);
  const k1 = Math.sin((1 - t) * omega) / s;
  const k2 = Math.sin(t * omega) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

/**
 * Dotted-earth globe on a 2D canvas: ~4k land dots, great-circle routes from Riyadh with travelling
 * light pulses, drag-to-rotate with inertia, and a gentle sway that keeps Riyadh in view.
 * No WebGL / three.js — the whole thing is ~5 KB of JS + 12 KB (gz) of dot data, loaded lazily.
 */
export function Globe({ origin, destinations, highlight, className }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const highlightRef = useRef(highlight);
  highlightRef.current = highlight;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dots = new Float32Array(0);
    let disposed = false;
    let raf = 0;
    let visible = true;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // View state. Base orientation centres Riyadh; yaw/pitch offsets come from sway + drag.
    const baseYaw = -origin.lon * RAD + 0.25;
    const basePitch = origin.lat * RAD * 0.85;
    let dragYaw = 0;
    let dragPitch = 0;
    let velYaw = 0;
    let velPitch = 0;
    let focusYaw = 0; // eases toward the highlighted route
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let appear = reduceMotion ? 1 : 0; // intro scale/opacity

    const originVec = toVec(origin.lat, origin.lon);
    const routes = destinations.map((d, i) => {
      const end = toVec(d.lat, d.lon);
      const dist = Math.acos(Math.min(1, originVec[0] * end[0] + originVec[1] * end[1] + originVec[2] * end[2]));
      const samples = 72;
      const pts: Vec3[] = [];
      for (let s = 0; s <= samples; s++) {
        const t = s / samples;
        const p = slerp(originVec, end, t);
        const lift = 1 + Math.sin(Math.PI * t) * (0.06 + dist * 0.12);
        pts.push([p[0] * lift, p[1] * lift, p[2] * lift]);
      }
      return { ...d, end, pts, phase: (i * 0.137) % 1, speed: 0.11 + (i % 3) * 0.025 };
    });

    import("./land-dots.json").then((mod) => {
      if (disposed) return;
      const raw = mod.default as number[];
      const arr = new Float32Array((raw.length / 2) * 3);
      for (let i = 0, j = 0; i < raw.length; i += 2, j += 3) {
        const v = toVec((raw[i] ?? 0) / 10, (raw[i + 1] ?? 0) / 10);
        arr[j] = v[0];
        arr[j + 1] = v[1];
        arr[j + 2] = v[2];
      }
      dots = arr;
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(canvas);

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      velYaw = dx * 0.006;
      velPitch = dy * 0.004;
      dragYaw += velYaw;
      dragPitch = Math.max(-0.6, Math.min(0.6, dragPitch + velPitch));
    };
    const onUp = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const start = performance.now();

    function frame(now: number) {
      raf = 0;
      if (disposed || !ctx) return;
      const t = (now - start) / 1000;

      // Physics: inertia after release, then drift back toward the curated view.
      if (!dragging) {
        dragYaw += velYaw;
        dragPitch += velPitch;
        velYaw *= 0.94;
        velPitch *= 0.9;
        dragYaw *= 0.985;
        dragPitch *= 0.97;
      }
      const target = routes.find((r) => r.code === highlightRef.current);
      // Turn so the route's midpoint faces the viewer (angle wrapped to [-π, π] to take the short way round).
      let wantFocus = target ? -Math.atan2(target.end[0] + originVec[0], target.end[2] + originVec[2]) - baseYaw + 0.1 : 0;
      wantFocus = Math.atan2(Math.sin(wantFocus), Math.cos(wantFocus));
      focusYaw += (wantFocus - focusYaw) * 0.04;
      appear += (1 - appear) * 0.045;

      const sway = reduceMotion ? 0 : Math.sin(t * 0.12) * 0.32;
      const yaw = baseYaw + sway + dragYaw + focusYaw;
      const pitch = basePitch + dragPitch;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);

      const R = Math.min(width, height) * 0.44 * (0.88 + appear * 0.12);
      const cx = width / 2;
      const cyy = height / 2;

      // Rotate (yaw around Y, then pitch around X) and project orthographically.
      const project = (x: number, y: number, z: number) => {
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y2 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        return { x: cx + x1 * R, y: cyy - y2 * R, z: z2 };
      };

      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = appear;

      // Atmosphere + body.
      // Halo must fade to zero inside the canvas, or the canvas edge shows as a faint rectangle.
      const haloOuter = Math.min(width, height) / 2;
      const halo = ctx.createRadialGradient(cx, cyy, R * 0.9, cx, cyy, haloOuter);
      halo.addColorStop(0, `rgba(${TEAL},0.2)`);
      halo.addColorStop(0.5, `rgba(${TEAL},0.05)`);
      halo.addColorStop(1, `rgba(${TEAL},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cyy, haloOuter, 0, Math.PI * 2);
      ctx.fill();

      const body = ctx.createRadialGradient(cx - R * 0.35, cyy - R * 0.4, R * 0.1, cx, cyy, R);
      body.addColorStop(0, "rgba(24,46,88,0.95)");
      body.addColorStop(0.7, "rgba(11,24,48,0.96)");
      body.addColorStop(1, "rgba(7,16,35,1)");
      ctx.beginPath();
      ctx.arc(cx, cyy, R, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = `rgba(${TEAL},0.35)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Land dots, bucketed by depth so we issue 4 fills instead of 4,000.
      const buckets: number[][] = [[], [], [], []];
      for (let i = 0; i < dots.length; i += 3) {
        const p = project(dots[i] ?? 0, dots[i + 1] ?? 0, dots[i + 2] ?? 0);
        if (p.z <= 0.02) continue;
        const b = p.z > 0.75 ? 3 : p.z > 0.5 ? 2 : p.z > 0.25 ? 1 : 0;
        buckets[b]?.push(p.x, p.y);
      }
      const dotSize = Math.max(1, R / 230);
      buckets.forEach((list, b) => {
        ctx.fillStyle = `rgba(${SAND},${0.16 + b * 0.17})`;
        ctx.beginPath();
        for (let i = 0; i < list.length; i += 2) {
          const x = list[i] ?? 0;
          const y = list[i + 1] ?? 0;
          ctx.moveTo(x + dotSize, y);
          ctx.arc(x, y, dotSize * (0.75 + b * 0.12), 0, Math.PI * 2);
        }
        ctx.fill();
      });

      // Routes.
      ctx.lineCap = "round";
      for (const r of routes) {
        const isHi = r.code === highlightRef.current;
        const proj = r.pts.map((p) => project(p[0], p[1], p[2]));
        // Static path (only the front-facing part).
        ctx.beginPath();
        let pen = false;
        for (const p of proj) {
          if (p.z > -0.05) {
            if (pen) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
            pen = true;
          } else pen = false;
        }
        ctx.strokeStyle = isHi ? `rgba(${GOLD_SOFT},0.95)` : `rgba(${GOLD},${highlightRef.current ? 0.18 : 0.38})`;
        ctx.lineWidth = isHi ? 2.2 : 1.1;
        ctx.stroke();

        // Travelling pulse with a fading tail.
        const head = reduceMotion ? 0.6 : (t * r.speed * (isHi ? 2 : 1) + r.phase) % 1;
        const tail = 0.16;
        const n = proj.length - 1;
        for (let k = 0; k < 10; k++) {
          const u = head - (tail * k) / 10;
          if (u < 0) break;
          const p = proj[Math.round(u * n)];
          if (!p || p.z < -0.05) continue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (isHi ? 2.6 : 1.8) * (1 - k / 11), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${isHi ? GOLD_SOFT : GOLD},${(1 - k / 10) * 0.95})`;
          ctx.fill();
        }

        // Destination marker + label.
        const endP = proj[proj.length - 1];
        if (endP && endP.z > 0) {
          const pulse = reduceMotion ? 0 : (t * 0.8 + r.phase) % 1;
          ctx.beginPath();
          ctx.arc(endP.x, endP.y, 3 + pulse * 9, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${TEAL},${(1 - pulse) * (isHi ? 0.9 : 0.45)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(endP.x, endP.y, isHi ? 3.6 : 2.6, 0, Math.PI * 2);
          ctx.fillStyle = isHi ? `rgb(${GOLD_SOFT})` : `rgb(${TEAL})`;
          ctx.fill();
          if (isHi) {
            ctx.font = `${isHi ? 700 : 600} ${isHi ? 13 : 10.5}px Inter, ui-sans-serif, system-ui`;
            ctx.fillStyle = `rgba(${SAND},${isHi ? 1 : 0.6 * endP.z + 0.2})`;
            ctx.textAlign = "center";
            ctx.fillText(r.code, endP.x, endP.y - (isHi ? 12 : 9));
          }
        }
      }

      // Origin (Riyadh).
      const o = project(originVec[0], originVec[1], originVec[2]);
      if (o.z > 0) {
        const ring = reduceMotion ? 0.4 : (t * 0.6) % 1;
        ctx.beginPath();
        ctx.arc(o.x, o.y, 5 + ring * 16, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${GOLD},${(1 - ring) * 0.8})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${GOLD})`;
        ctx.fill();
        ctx.font = "700 12px Inter, ui-sans-serif, system-ui";
        ctx.fillStyle = `rgb(${SAND})`;
        ctx.textAlign = "center";
        ctx.fillText(origin.code, o.x, o.y + 22);
      }
      ctx.globalAlpha = 1;

      if (visible && !document.hidden && (!reduceMotion || appear < 0.999 || dragging || Math.abs(velYaw) > 1e-4)) {
        raf = requestAnimationFrame(frame);
      }
    }

    raf = requestAnimationFrame(frame);
    const onVisibility = () => {
      if (!document.hidden && !raf) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVisibility);
    // Reduced motion still needs a redraw when the highlight changes.
    const redraw = window.setInterval(() => {
      if (reduceMotion && !raf) raf = requestAnimationFrame(frame);
    }, 400);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearInterval(redraw);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [origin, destinations]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("block size-full cursor-grab touch-pan-y active:cursor-grabbing", className)}
    />
  );
}
