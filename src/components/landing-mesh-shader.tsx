'use client';

import { useEffect, useRef } from 'react';

const vertexSource = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentSource = `
precision mediump float;
uniform vec2 resolution;
uniform float time;
uniform float ink;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 point = uv - 0.5;
  point.x *= resolution.x / resolution.y;
  // Bend a triangular lattice into a slowly breathing sheet.
  point.y += 0.035 * sin(point.x * 7.0 + time * 0.45);
  point.x += 0.022 * sin(point.y * 9.0 - time * 0.3);
  point /= 1.0 + 0.28 * point.y;
  vec2 grid = point * 15.0;
  float vertical = abs(fract(grid.x + 0.5) - 0.5);
  float horizontal = abs(fract(grid.y + 0.5) - 0.5);
  float diagonal = abs(fract(grid.x + grid.y + 0.5) - 0.5) * 0.707;
  float distanceToLine = min(min(vertical, horizontal), diagonal);
  float line = 1.0 - smoothstep(0.006, 0.024, distanceToLine);
  float edge = smoothstep(0.0, 0.2, uv.x) * smoothstep(0.0, 0.2, 1.0 - uv.x)
    * smoothstep(0.0, 0.18, uv.y) * smoothstep(0.0, 0.18, 1.0 - uv.y);
  float wave = 0.65 + 0.35 * sin(point.x * 4.0 + point.y * 3.0 + time * 0.4);
  gl_FragColor = vec4(vec3(ink), line * edge * wave * 0.32);
}
`;

export function LandingMeshShader({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) return; // The SVG mesh underneath remains available.

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      if (program) gl.deleteProgram(program);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      return;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'resolution');
    const time = gl.getUniformLocation(program, 'time');
    gl.uniform1f(gl.getUniformLocation(program, 'ink'), dark ? 0.78 : 0.3);

    let frame = 0;
    let visible = false;
    let lost = false;
    let lastFrame = 0;
    let elapsed = 0;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const draw = () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, motion.matches ? 0 : elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const tick = (stamp: number) => {
      if (stamp - lastFrame >= 33) {
        elapsed += Math.min((stamp - lastFrame) / 1000, 0.05);
        lastFrame = stamp;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (lost) return;
      draw();
      if (visible && !document.hidden && !motion.matches) {
        lastFrame = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const resize = new ResizeObserver(() => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      sync();
    });
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; sync(); });
    observer.observe(canvas);
    const contextLost = () => { lost = true; cancelAnimationFrame(frame); };
    canvas.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', contextLost);
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [dark]);

  return <canvas ref={canvasRef} className="landing-mesh-shader" aria-hidden="true" />;
}
