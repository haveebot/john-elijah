"use client";

/**
 * "The Print-In" — the homepage motion piece.
 *
 * The hero photo behaves like a screen-print being pulled:
 *   Paper (0–0.5s)   cream stock with grain, the photo not yet there
 *   Brass pass (0.5–1.9s)  the mid-tone halftone ink squeegees up from the bottom
 *   Key pass (1.9–3.2s)    the black halftone lands from the left, a hair off-register
 *   Settle (3.2–4.2s)      registration eases home; the type stamps (CSS, in hero.tsx)
 *   Breath (after)         grain lives, an occasional light leak; pointer shifts the
 *                          registration a few px like holding the print to the light,
 *                          and lifts the ink near the cursor so the real photo shows through.
 *
 * Abstract over literal: it's a process, not a scene. One quad, one texture, one
 * fragment shader, DPR capped. Texture comes through the same-origin image
 * optimizer so WebGL can read it. Reduced motion / no WebGL → the plain photo.
 */

import { useEffect, useRef, useState } from "react";

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;        // canvas px
uniform vec2 uTexRes;     // texture px
uniform float uTime;
uniform float uDPR;
uniform vec2 uPointer;    // canvas px
uniform float uPointerOn;
uniform vec2 uReg;        // registration offset for the key pass, px

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// cover-fit uv for the photo
vec2 coverUv(vec2 uv) {
  float ca = uRes.x / uRes.y;
  float ta = uTexRes.x / uTexRes.y;
  vec2 s = ca > ta ? vec2(1.0, ta / ca) : vec2(ca / ta, 1.0);
  return (uv - 0.5) * s + 0.5;
}

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// halftone: rotated grid, dot radius from darkness
float dots(vec2 px, float cell, float angle, float dark) {
  float c = cos(angle), s = sin(angle);
  vec2 p = mat2(c, -s, s, c) * px / cell;
  vec2 f = fract(p) - 0.5;
  float d = length(f);
  float r = dark * 0.72;
  return smoothstep(r, r - 0.12, d);
}

void main() {
  vec2 px = vUv * uRes;
  vec2 uv = coverUv(vec2(vUv.x, 1.0 - vUv.y));

  // paper + grain
  float g = hash(floor(px / uDPR) + floor(uTime * 12.0));
  vec3 paper = vec3(0.953, 0.918, 0.847) * (0.96 + 0.06 * g);

  // ink samples
  vec3 photo = texture2D(uTex, uv).rgb;
  float L = lum(photo);
  float darkBrass = clamp((0.78 - L) * 1.55, 0.0, 1.0);       // mids + darks
  vec2 regUv = uReg / uRes * vec2(1.0, -1.0);
  vec3 photoK = texture2D(uTex, uv + regUv).rgb;
  float darkKey = clamp((0.42 - lum(photoK)) * 2.4, 0.0, 1.0); // darks only

  float cell = 4.2 * uDPR;
  float brassInk = dots(px, cell, 0.26, darkBrass);
  float keyInk = dots(px + uReg, cell, 0.79, darkKey);

  // squeegee wipes
  float brassWipe = smoothstep(0.0, 1.0, (uTime - 0.5) / 1.4);
  float brassMask = smoothstep(vUv.y - 0.06, vUv.y + 0.02, brassWipe * 1.12 - 0.06);
  float keyWipe = smoothstep(0.0, 1.0, (uTime - 1.9) / 1.3);
  float keyMask = smoothstep(vUv.x - 0.06, vUv.x + 0.02, keyWipe * 1.12 - 0.06);

  vec3 brass = vec3(0.851, 0.643, 0.255);
  vec3 ink = vec3(0.043, 0.039, 0.031);

  // lift the ink near the pointer: the real photo shows through
  float pd = length(px - uPointer) / (uRes.y * 0.22);
  float lift = uPointerOn * (1.0 - smoothstep(0.0, 1.0, pd));
  lift *= smoothstep(3.6, 4.6, uTime);

  vec3 col = paper;
  col = mix(col, brass * (0.92 + 0.08 * g), brassInk * brassMask * 0.95);
  col = mix(col, ink, keyInk * keyMask * 0.96);

  // light leak: a soft brass band that drifts across every ~9s
  float leakT = fract(uTime / 9.0);
  float leak = smoothstep(0.35, 0.0, abs(vUv.x - (leakT * 1.6 - 0.3) + vUv.y * 0.2)) * smoothstep(0.0, 0.15, leakT) * smoothstep(1.0, 0.85, leakT);
  col += brass * leak * 0.10 * smoothstep(3.2, 4.2, uTime);

  // the ink lifts → photo through, with a warm cast so it belongs to the print
  vec3 warmPhoto = mix(photo, photo * vec3(1.05, 0.98, 0.9), 0.5);
  col = mix(col, warmPhoto, lift);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function PrintIn({ src, onPhase }: { src: string; onPhase?: (phase: "printing" | "settled") => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;

    let raf = 0;
    let disposed = false;
    let startedAt = performance.now();
    let settledFired = false;

    const img = new Image();
    img.crossOrigin = "anonymous";
    // same-origin through the optimizer so the texture isn't tainted
    img.src = `/_next/image?url=${encodeURIComponent(src)}&w=1920&q=78`;
    img.onload = () => {
      if (disposed) return;
      const compile = (type: number, s: string) => {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, s);
        gl.compileShader(sh);
        return sh;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      } catch {
        return; // tainted or unsupported → stay on the plain photo
      }

      const u = (n: string) => gl.getUniformLocation(prog, n);
      const uRes = u("uRes"), uTexRes = u("uTexRes"), uTime = u("uTime"), uDPR = u("uDPR");
      const uPointer = u("uPointer"), uPointerOn = u("uPointerOn"), uReg = u("uReg");

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const resize = () => {
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      resize();
      window.addEventListener("resize", resize);

      let px = -9999, py = -9999, on = 0, onTarget = 0;
      let hoverX = 0, hoverY = 0;
      const toLocal = (cx: number, cy: number) => {
        const r = canvas.getBoundingClientRect();
        px = (cx - r.left) * dpr;
        py = (cy - r.top) * dpr;
        hoverX = ((cx - r.left) / r.width - 0.5) * 2;
        hoverY = ((cy - r.top) / r.height - 0.5) * 2;
      };
      canvas.addEventListener("pointermove", (e) => { toLocal(e.clientX, e.clientY); onTarget = 1; });
      canvas.addEventListener("pointerleave", () => { onTarget = 0; });
      canvas.addEventListener("dblclick", () => { startedAt = performance.now(); settledFired = false; onPhase?.("printing"); });
      canvas.addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t) { toLocal(t.clientX, t.clientY); onTarget = 1; } }, { passive: true });
      canvas.addEventListener("touchend", () => { onTarget = 0; });

      setReady(true);
      onPhase?.("printing");

      const frame = () => {
        if (disposed) return;
        const t = (performance.now() - startedAt) / 1000;
        on += (onTarget - on) * 0.08;
        // registration: lands 9px off, eases home by ~4.2s; pointer nudges it after
        const settle = Math.min(1, Math.max(0, (t - 3.2) / 1.0));
        const ease = 1 - Math.pow(1 - settle, 3);
        const base = 9 * (1 - ease) + 1.0;
        const regX = (base + on * hoverX * 4) * dpr;
        const regY = (base * 0.7 + on * hoverY * 3) * dpr;
        if (!settledFired && t > 3.1) { settledFired = true; onPhase?.("settled"); }

        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform2f(uTexRes, img.naturalWidth, img.naturalHeight);
        gl.uniform1f(uTime, t);
        gl.uniform1f(uDPR, dpr);
        gl.uniform2f(uPointer, px, canvas.height - py);
        gl.uniform1f(uPointerOn, on);
        gl.uniform2f(uReg, regX, regY);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [src, onPhase]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full touch-pan-y transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
      aria-hidden
    />
  );
}
