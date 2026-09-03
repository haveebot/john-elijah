"use client";

/**
 * "Name in Lights" — the homepage ident.
 *
 * Brass stage-light specks drift over the hero photo from the first frame,
 * gather into the wordmark, and the sign lights: every speck becomes a marquee
 * bulb blinking on its own clock. The light rays are NOT drawn from a formula —
 * they are a radial-blur post-process of the sign's own glow, computed every
 * frame from the bulbs, so they stream out of the letters, flicker with them,
 * and fade in as the name lights instead of switching on. A burst of exposure
 * fires the moment the letters lock.
 *
 * Pipeline per frame: specks → offscreen texture → one full-frame pass that
 * adds (specks + radial light shafts) to the photo. Additive only; the photo is
 * never covered. Pointer scatters/repaints nearby specks; drag orbits them;
 * double-click replays. Reduced motion / no WebGL → the HTML wordmark shows.
 *
 * Cost-shape: DPR cap 1.5, half-res light texture, 2 draws, no libraries.
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
uniform float uSizeScale;
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
    vec2 pos = aTarget;
    pos.x += sin(uTime * (0.05 + aSeed.z * 0.08) + aSeed.x * 6.2831) * 0.30;
    pos.y += mod(uTime * (0.02 + aSeed.z * 0.03) + aSeed.y * 2.0, 2.4) - 1.2;
    vGlow = 0.0;
    gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);
    gl_PointSize = (8.0 + aSeed.z * 20.0) * uDPR * uSizeScale;
    return;
  }

  vec2 target = aTarget * uFit;
  // stagger across the mark left→right; everything is locked by ~2.3s
  float dAssemble = 0.1 + aOrder * 1.2;
  float tA = clamp((uTime - dAssemble) / 1.0, 0.0, 1.0);
  float e = easeOutCubic(tA);
  vec2 scatter0 = target + aSeed.xy * (1.5 + aSeed.z * 1.4) + vec2(0.0, -0.9);
  // alive before assembly: the scattered specks wander, never sit still
  vec2 wander = vec2(sin(uTime * 0.9 + aSeed.z * 31.0), cos(uTime * 0.8 + aSeed.z * 23.0)) * 0.06;
  vec2 pos = mix(scatter0 + wander, target, e);

  float idle = smoothstep(2.3, 3.2, uTime);
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
  gl_PointSize = (2.0 + aSeed.z * 2.3 + vGlow * 2.2) * uDPR * uSizeScale;
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
    gl_FragColor = vec4(col * alpha, alpha);
    return;
  }

  float soft = smoothstep(0.5, 0.05, d);
  float settled = smoothstep(2.4, 3.4, uTime);
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

  // marquee bulbs: after the sign lights, each speck blinks on its own clock
  float bulb = pow(max(sin(uTime * (1.6 + fract(vSeed * 9.31) * 2.4) + vSeed * 120.0), 0.0), 9.0);
  float lights = settled * bulb;
  col = mix(col, mix(brass, cream, 0.35), lights * 0.8);
  float radiate = 1.0 + settled * (0.30 * cur1 + 0.18 * cur2) + vCustom * 0.9 + lights * 1.6;
  float alpha = soft * (0.74 + vGlow * 0.26 + lights * 0.2);
  vec3 rgb = col * (0.92 + vGlow * 0.6 + uBurst * 0.8) * radiate;
  // premultiplied output into the light texture
  gl_FragColor = vec4(rgb * alpha, alpha);
}
`;

// full-frame composite: the specks + radial light shafts computed from them
const QUAD_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const COMPOSITE_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uLight;
uniform vec2 uCenter;      // sign centre in uv
uniform float uExposure;   // ray strength (steady ~0.5, burst ~1.6)
uniform float uDecay;
uniform float uAspect;
uniform float uTime;

const int SAMPLES = 28;

void main() {
  vec3 specks = texture2D(uLight, vUv).rgb;

  // radial blur of the sign's own light toward/away from its centre
  vec2 delta = (vUv - uCenter) / float(SAMPLES) * 0.92;
  vec2 uv = vUv;
  float w = 1.0;
  vec3 rays = vec3(0.0);
  for (int i = 0; i < SAMPLES; i++) {
    uv -= delta;
    rays += texture2D(uLight, uv).rgb * w;
    w *= uDecay;
  }
  rays /= float(SAMPLES);
  // slow shimmer along the beams so the light breathes
  float ang = atan((vUv.y - uCenter.y), (vUv.x - uCenter.x) * uAspect + 1e-4);
  float shimmer = 0.85 + 0.15 * sin(uTime * 0.6 + ang * 6.0);

  vec3 brass = vec3(0.851, 0.643, 0.255);
  vec3 col = specks + rays * uExposure * shimmer * mix(vec3(1.0), brass, 0.35);
  gl_FragColor = vec4(col, 0.0);   // additive light only; the photo stays underneath
}
`;

function buildBuffers(lines: string[], font: string, inkCount: number, dustCount: number) {
  const W = 800;
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.font = `600 100px ${font}`;
  const m100 = lines.map((l) => ctx.measureText(l));
  const widest = Math.max(...m100.map((m) => m.width), 1);
  const size = Math.floor((100 * (W * 0.88)) / widest);
  ctx.font = `600 ${size}px ${font}`;
  const ms = lines.map((l) => ctx.measureText(l));
  const asc = Math.max(...ms.map((m) => m.actualBoundingBoxAscent || size * 0.75));
  const desc = Math.max(...ms.map((m) => m.actualBoundingBoxDescent || size * 0.05));
  const lineH = (asc + desc) * 1.12;
  const H = Math.ceil(lineH * lines.length + size * 0.3);
  cv.width = W;
  cv.height = H;
  ctx.font = `600 ${size}px ${font}`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const top = (H - lineH * lines.length) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, top + i * lineH + asc + (lineH - asc - desc) / 2);
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
  const halfW = SCALE;
  const halfH = SCALE * (H / W);

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
  return { targets, seeds, orders, kinds, total, halfW, halfH, size, W, H };
}

export function StageIdent({ onReady }: { onReady?: (ready: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) return;

    let raf = 0;
    let startedAt = performance.now();
    let disposed = false;

    const start = async () => {
      const font = getComputedStyle(document.documentElement).getPropertyValue("--font-oswald").trim() || "Oswald";
      await Promise.race([document.fonts.load(`600 92px ${font}`).catch(() => null), new Promise((r) => setTimeout(r, 150))]);
      if (disposed) return;
      const isMobile = window.innerWidth < 768;
      const lines = isMobile ? ["JOHN", "ELIJAH"] : ["JOHN ELIJAH"];
      const INK = isMobile ? 5200 : 11000;
      const DUST = isMobile ? 180 : 420;
      const built = buildBuffers(lines, `${font}, Impact, sans-serif`, INK, DUST);
      if (!built) return;
      const { targets, seeds, orders, kinds, total, halfH } = built;
      (window as unknown as { __jeIdent?: unknown }).__jeIdent = { lines, size: built.size, W: built.W, H: built.H, halfW: built.halfW, halfH };

      const compile = (type: number, src: string) => {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        return sh;
      };
      const link = (v: string, f: string) => {
        const p = gl.createProgram()!;
        gl.attachShader(p, compile(gl.VERTEX_SHADER, v));
        gl.attachShader(p, compile(gl.FRAGMENT_SHADER, f));
        gl.linkProgram(p);
        return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
      };
      const prog = link(VERT, FRAG);
      const comp = link(QUAD_VERT, COMPOSITE_FRAG);
      if (!prog || !comp) return;

      // speck attributes
      const attrs: { buf: WebGLBuffer; loc: number; size: number }[] = [];
      const mk = (data: Float32Array, name: string, size: number) => {
        const b = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        attrs.push({ buf: b, loc: gl.getAttribLocation(prog, name), size });
      };
      mk(targets, "aTarget", 2);
      mk(seeds, "aSeed", 3);
      mk(orders, "aOrder", 1);
      mk(kinds, "aKind", 1);
      const quad = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(comp, "aPos");

      const u = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
      const U = {
        time: u(prog, "uTime"), aspect: u(prog, "uAspect"), dpr: u(prog, "uDPR"), burst: u(prog, "uBurst"), fit: u(prog, "uFit"),
        sizeScale: u(prog, "uSizeScale"), pointer: u(prog, "uPointer"), scatter: u(prog, "uScatter"), grab: u(prog, "uGrab"), paint: u(prog, "uPaint"),
      };
      const C = { light: u(comp, "uLight"), center: u(comp, "uCenter"), exposure: u(comp, "uExposure"), decay: u(comp, "uDecay"), aspect: u(comp, "uAspect"), time: u(comp, "uTime") };

      // offscreen light texture (half-res)
      const fbo = gl.createFramebuffer()!;
      const lightTex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, lightTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, lightTex, 0);
      const dbg = (window as unknown as { __jeIdent: Record<string, unknown> }).__jeIdent;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const LIGHT_SCALE = 0.5;
      let aspect = 1;
      let fit = 1;
      let lw = 1, lh = 1;
      const resize = () => {
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        aspect = canvas.width / Math.max(canvas.height, 1);
        fit = Math.min(1, (0.92 * aspect) / 1.55, 0.78 / Math.max(halfH, 0.01));
        lw = Math.max(1, Math.round(canvas.width * LIGHT_SCALE));
        lh = Math.max(1, Math.round(canvas.height * LIGHT_SCALE));
        gl.bindTexture(gl.TEXTURE_2D, lightTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, lw, lh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        dbg.fbo = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE ? "complete" : "incomplete";
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
      startedAt = performance.now();

      const frame = () => {
        if (disposed) return;
        const t = (performance.now() - startedAt) / 1000;
        // JS burst envelope: letters lock ~2.3s → flare → settle
        const burst = Math.max(0, Math.sin(Math.min(Math.max(t - 2.2, 0) / 1.4, 1) * Math.PI)) * (t < 3.8 ? 1 : 0.1 + 0.08 * Math.sin(t * 0.35));
        // ray exposure: nothing before the sign lights, big burst at landing, steady after
        const lit = Math.min(1, Math.max(0, (t - 2.2) / 1.1));
        const steady = 0.55 + 0.08 * Math.sin(t * 0.4);
        const flare = Math.max(0, Math.sin(Math.min(Math.max(t - 2.25, 0) / 1.6, 1) * Math.PI)) * 1.3;
        const exposure = lit * steady + flare;
        const decay = 0.955 + 0.02 * Math.min(1, flare);

        scatterNow += (scatterTarget - scatterNow) * (scatterTarget > scatterNow ? 0.3 : 0.07);
        grabNow += (grabTarget - grabNow) * (grabTarget > grabNow ? 0.38 : 0.16);
        if (scatterTarget === 0 && grabTarget === 0 && Math.max(scatterNow, grabNow) < 0.35) paintNow *= 0.984;
        if (scatterNow < 0.002) scatterNow = 0;
        if (grabNow < 0.002) grabNow = 0;

        // 1) specks → light texture (premultiplied, additive)
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, lw, lh);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(prog);
        for (const a of attrs) {
          gl.bindBuffer(gl.ARRAY_BUFFER, a.buf);
          gl.enableVertexAttribArray(a.loc);
          gl.vertexAttribPointer(a.loc, a.size, gl.FLOAT, false, 0, 0);
        }
        gl.uniform1f(U.time, t);
        gl.uniform1f(U.aspect, aspect);
        gl.uniform1f(U.dpr, dpr);
        gl.uniform1f(U.burst, burst);
        gl.uniform1f(U.fit, fit);
        gl.uniform1f(U.sizeScale, LIGHT_SCALE);
        gl.uniform2f(U.pointer, px, py);
        gl.uniform1f(U.scatter, scatterNow);
        gl.uniform1f(U.grab, grabNow);
        gl.uniform1f(U.paint, paintNow);
        gl.drawArrays(gl.POINTS, 0, total);
        for (const a of attrs) gl.disableVertexAttribArray(a.loc);

        // 2) composite: specks + radial light shafts from them, added onto the photo
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
        gl.useProgram(comp);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, lightTex);
        gl.uniform1i(C.light, 0);
        gl.uniform2f(C.center, 0.5, 0.5 + (0.12 * fit) / 2);
        gl.uniform1f(C.exposure, exposure);
        gl.uniform1f(C.decay, decay);
        gl.uniform1f(C.aspect, aspect);
        gl.uniform1f(C.time, t);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disableVertexAttribArray(aPos);

        dbg.t = t;
        dbg.exposure = exposure;
        dbg.frames = ((dbg.frames as number) || 0) + 1;
        dbg.glError = gl.getError();
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
      className={`absolute inset-0 h-full w-full touch-pan-y transition-opacity duration-200 ${ready ? "opacity-100" : "opacity-0"}`}
      aria-hidden
    />
  );
}
