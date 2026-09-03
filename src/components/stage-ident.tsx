"use client";

/**
 * "Stage Light" — the homepage ident.
 *
 * Abstract over literal (org law): no objects, no scene. Brass stage-light
 * dust drifts over the hero photo, converges to form the wordmark (a brand
 * fragment formed by the field), ignites with a specular sweep, then settles
 * into a living, swaying mark with two slow currents running through it.
 * Pointer scatters nearby dust and repaints it coral/cream; drag pulls it
 * into orbit; release springs it home. Double-click replays.
 *
 * Four acts: Breath (0–1.2s dust only) → Growth (1.2–3.6s letters form)
 * → Ignition (3.4–5s sweep + bloom) → Resolve (settle, sway).
 *
 * Reduced-motion or no WebGL → the component renders nothing and the HTML
 * wordmark (always present for SEO/a11y) simply shows.
 *
 * Cost-shape: DPR capped 1.6, particle counts halved on phones, one draw
 * call, no external libs, no textures — targets come from an offscreen
 * canvas rendering the wordmark in the site's own font.
 */

import { useEffect, useRef, useState } from "react";

const VERT = `
attribute vec2 aTarget;
attribute vec3 aSeed;
attribute float aOrder;
attribute float aKind;
uniform mediump float uTime;
uniform float uAspect;
uniform float uDPR;
uniform float uFit;
uniform mediump vec2 uPointer;
uniform mediump float uScatter;
uniform mediump float uGrab;
uniform mediump float uPaint;
varying float vGlow;
varying float vOrder;
varying float vKind;
varying float vSeed;
varying float vCustom;

float easeOutCubic(float x) { return 1.0 - pow(1.0 - x, 3.0); }

void main() {
  vKind = aKind; vOrder = aOrder; vSeed = aSeed.z; vCustom = 0.0;

  if (aKind > 0.5) {
    // dust: slow upward drift like heat off a stage
    vec2 pos = aTarget;
    pos.x += sin(uTime * (0.05 + aSeed.z * 0.08) + aSeed.x * 6.2831) * 0.30;
    pos.y += mod(uTime * (0.02 + aSeed.z * 0.03) + aSeed.y * 2.0, 2.4) - 1.2;
    vGlow = 0.0;
    gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);
    gl_PointSize = (8.0 + aSeed.z * 20.0) * uDPR;
    return;
  }

  vec2 target = aTarget * uFit;
  float dAssemble = 1.2 + aOrder * 1.8;
  float tA = clamp((uTime - dAssemble) / 1.1, 0.0, 1.0);
  float e = easeOutCubic(tA);
  vec2 scatter0 = target + aSeed.xy * (1.5 + aSeed.z * 1.4) + vec2(0.0, -0.9);
  vec2 pos = mix(scatter0, target, e);

  float idle = smoothstep(4.4, 5.4, uTime);
  pos += idle * vec2(sin(uTime * 0.8 + aSeed.z * 40.0), cos(uTime * 0.7 + aSeed.z * 34.0)) * 0.0014;
  float sway = sin(uTime * 0.2) * 0.014 * idle;
  pos.x += sway * pos.y;

  float R = 0.32 * max(uFit, 0.55);
  vec2 toP = pos - uPointer;
  float pd = length(toP) + 0.0001;
  float infl = (1.0 - smoothstep(0.0, R, pd));
  vec2 dir = toP / pd;
  vec2 perp = vec2(-dir.y, dir.x);
  vec2 swirl = vec2(sin(aSeed.z * 53.0 + uTime * 3.1), cos(aSeed.z * 71.0 + uTime * 2.7));
  float hoverForce = infl * uScatter * idle;
  pos += (dir * 0.42 + swirl * 0.20) * hoverForce * (0.5 + aSeed.z * 0.8) * 0.36;
  float grabForce = infl * uGrab * idle;
  pos += (-dir * (0.50 + aSeed.z * 0.25) + perp * (0.55 + aSeed.z * 0.5)) * grabForce * 0.5;
  float force = max(hoverForce, grabForce);
  vCustom = clamp(infl * (1.2 + uGrab * 0.8), 0.0, 1.0) * uPaint;

  vGlow = (1.0 - tA) * 0.9 + force * 0.9;
  gl_Position = vec4(pos.x / uAspect, pos.y, 0.0, 1.0);
  gl_PointSize = (1.7 + aSeed.z * 2.0 + vGlow * 2.2) * uDPR;
}
`;

const FRAG = `
precision mediump float;
uniform float uTime;
uniform float uBurst;
varying float vGlow;
varying float vOrder;
varying float vKind;
varying float vSeed;
varying float vCustom;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  vec3 cream  = vec3(0.953, 0.918, 0.847);
  vec3 brass  = vec3(0.851, 0.643, 0.255);
  vec3 deep   = vec3(0.659, 0.471, 0.122);
  vec3 coral  = vec3(0.878, 0.400, 0.290);
  vec3 pigment = vOrder < 0.5 ? brass : mix(brass, deep, (vOrder - 0.5) * 2.0);

  if (vKind > 0.5) {
    float soft = smoothstep(0.5, 0.0, d);
    float tw = 0.6 + 0.4 * sin(uTime * 0.5 + vSeed * 40.0);
    float blink = pow(max(sin(uTime * (0.2 + fract(vSeed * 13.7) * 0.4) + vSeed * 90.0), 0.0), 26.0);
    vec3 col = brass * (0.55 + uBurst * 0.7 + blink * 1.4);
    float alpha = soft * (0.05 * tw * (1.0 + uBurst) + blink * 0.35);
    gl_FragColor = vec4(col, alpha);
    return;
  }

  float soft = smoothstep(0.5, 0.05, d);
  float settled = smoothstep(4.6, 5.6, uTime);
  float cur1 = smoothstep(0.30, 0.0, abs(vOrder - fract(uTime * 0.05)));
  float cur2 = smoothstep(0.24, 0.0, abs((1.0 - vOrder) - fract(uTime * 0.035 + 0.5)));
  float rest = settled * (0.30 + 0.35 * cur1 + 0.20 * cur2) + (1.0 - settled) * 0.12;
  float sweep = smoothstep(0.0, 1.0, uBurst) * smoothstep(0.25, 0.0, abs(vOrder - fract(uTime * 0.45)));
  float mixAmt = clamp(rest + uBurst * 0.9 + sweep, 0.0, 1.0);
  vec3 col = mix(cream, pigment, mixAmt);

  float pick = fract(vSeed * 7.13);
  vec3 custom = pick < 0.45 ? coral : (pick < 0.8 ? brass : cream * 1.1);
  col = mix(col, custom, clamp(vCustom, 0.0, 1.0));
  col = mix(col, pigment, vGlow * 0.35);

  float radiate = 1.0 + settled * (0.30 * cur1 + 0.18 * cur2) + vCustom * 0.9;
  float alpha = soft * (0.74 + vGlow * 0.26);
  gl_FragColor = vec4(col * (0.92 + vGlow * 0.6 + uBurst * 0.8) * radiate, alpha);
}
`;

function buildBuffers(lines: string[], font: string, inkCount: number, dustCount: number) {
  const W = 320;
  const H = lines.length > 1 ? 300 : 120;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = lines.length > 1 ? 120 : 92;
  ctx.font = `600 ${size}px ${font}`;
  // condensed caps: tighten letterspacing by scaling x a touch
  lines.forEach((line, i) => {
    const y = lines.length > 1 ? 75 + i * 130 : H / 2;
    ctx.fillText(line, W / 2, y);
  });
  const data = ctx.getImageData(0, 0, W, H).data;

  const candidates: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 128) candidates.push([x, y]);
  if (candidates.length === 0) return null;

  const total = inkCount + dustCount;
  const targets = new Float32Array(total * 2);
  const seeds = new Float32Array(total * 3);
  const orders = new Float32Array(total);
  const kinds = new Float32Array(total);
  const SCALE = 1.55;

  for (let i = 0; i < inkCount; i++) {
    const [x, y] = candidates[(Math.random() * candidates.length) | 0];
    const nx = (x / W - 0.5) * 2;
    const ny = -(y / H - 0.5) * 2 * (H / W);
    targets[i * 2] = nx * SCALE;
    targets[i * 2 + 1] = ny * SCALE + 0.12;
    const a = Math.random() * Math.PI * 2;
    seeds[i * 3] = Math.cos(a);
    seeds[i * 3 + 1] = Math.sin(a) - 0.6;
    seeds[i * 3 + 2] = Math.random();
    orders[i] = Math.min(1, Math.max(0, (nx + 1) / 2 + (Math.random() - 0.5) * 0.06));
    kinds[i] = 0;
  }
  for (let i = inkCount; i < total; i++) {
    targets[i * 2] = (Math.random() - 0.5) * 2.2;
    targets[i * 2 + 1] = (Math.random() - 0.5) * 2.4;
    seeds[i * 3] = Math.random();
    seeds[i * 3 + 1] = Math.random();
    seeds[i * 3 + 2] = Math.random();
    orders[i] = Math.random();
    kinds[i] = 1;
  }
  return { targets, seeds, orders, kinds, total };
}

export function StageIdent({ onReady }: { onReady?: (ready: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false });
    if (!gl) return;

    let raf = 0;
    let startedAt = performance.now();
    let disposed = false;

    const start = async () => {
      const font = getComputedStyle(document.documentElement).getPropertyValue("--font-oswald").trim() || "Oswald";
      try {
        await document.fonts.load(`600 92px ${font}`);
      } catch {
        /* fall through with fallback font */
      }
      if (disposed) return;
      const isMobile = window.innerWidth < 768;
      const lines = isMobile ? ["JOHN", "ELIJAH"] : ["JOHN ELIJAH"];
      const INK = isMobile ? 5200 : 11000;
      const DUST = isMobile ? 180 : 420;
      const built = buildBuffers(lines, `${font}, Impact, sans-serif`, INK, DUST);
      if (!built) return;
      const { targets, seeds, orders, kinds, total } = built;

      const compile = (type: number, src: string) => {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        return sh;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      const buf = (data: Float32Array, name: string, size: number) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      };
      buf(targets, "aTarget", 2);
      buf(seeds, "aSeed", 3);
      buf(orders, "aOrder", 1);
      buf(kinds, "aKind", 1);

      const u = (name: string) => gl.getUniformLocation(prog, name);
      const uTime = u("uTime"), uAspect = u("uAspect"), uDPR = u("uDPR"), uBurst = u("uBurst"), uFit = u("uFit");
      const uPointer = u("uPointer"), uScatter = u("uScatter"), uGrab = u("uGrab"), uPaint = u("uPaint");

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      let aspect = 1;
      let fit = 1;
      const resize = () => {
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        aspect = canvas.width / Math.max(canvas.height, 1);
        fit = Math.min(1, (0.92 * aspect) / 1.55);
      };
      resize();
      window.addEventListener("resize", resize);

      let px = 10, py = 10, scatterTarget = 0, scatterNow = 0, grabTarget = 0, grabNow = 0, paintNow = 0;
      const toLocal = (clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        px = (((clientX - rect.left) / rect.width) * 2 - 1) * aspect;
        py = -(((clientY - rect.top) / rect.height) * 2 - 1);
      };
      canvas.addEventListener("pointermove", (e) => { toLocal(e.clientX, e.clientY); scatterTarget = 1; paintNow = 1; });
      canvas.addEventListener("pointerleave", () => { scatterTarget = 0; grabTarget = 0; });
      canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture?.(e.pointerId); toLocal(e.clientX, e.clientY); grabTarget = 1; paintNow = 1; });
      const release = () => { grabTarget = 0; };
      canvas.addEventListener("pointerup", release);
      canvas.addEventListener("pointercancel", release);
      canvas.addEventListener("dblclick", () => { startedAt = performance.now(); });
      canvas.addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t) { toLocal(t.clientX, t.clientY); grabTarget = 1; paintNow = 1; } }, { passive: true });
      canvas.addEventListener("touchend", () => { grabTarget = 0; scatterTarget = 0; });

      setReady(true);
      onReady?.(true);

      const frame = () => {
        if (disposed) return;
        const t = (performance.now() - startedAt) / 1000;
        const burst = Math.max(0, Math.sin(Math.min(Math.max(t - 3.4, 0) / 1.5, 1) * Math.PI)) * (t < 5.6 ? 1 : 0.1 + 0.08 * Math.sin(t * 0.35));
        scatterNow += (scatterTarget - scatterNow) * (scatterTarget > scatterNow ? 0.3 : 0.07);
        grabNow += (grabTarget - grabNow) * (grabTarget > grabNow ? 0.38 : 0.16);
        if (scatterTarget === 0 && grabTarget === 0 && Math.max(scatterNow, grabNow) < 0.35) paintNow *= 0.984;
        if (scatterNow < 0.002) scatterNow = 0;
        if (grabNow < 0.002) grabNow = 0;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(uTime, t);
        gl.uniform1f(uAspect, aspect);
        gl.uniform1f(uDPR, dpr);
        gl.uniform1f(uBurst, burst);
        gl.uniform1f(uFit, fit);
        gl.uniform2f(uPointer, px, py);
        gl.uniform1f(uScatter, scatterNow);
        gl.uniform1f(uGrab, grabNow);
        gl.uniform1f(uPaint, paintNow);
        gl.drawArrays(gl.POINTS, 0, total);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    void start();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [onReady]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full touch-pan-y transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
      aria-hidden
    />
  );
}
