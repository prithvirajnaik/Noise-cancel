import { useEffect, useRef } from 'react';

// Animated line + gradient fill driven by the cleaned-output RMS level.
// One animation loop for the component's lifetime; the latest level is read from a ref.
export default function Waveform({ level }) {
  const canvasRef = useRef(null);
  const levelRef = useRef(level);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let amp = 0;

    const render = () => {
      // Fix for High DPI screens; only reallocate the backing store when the size changes
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      amp = amp * 0.8 + (levelRef.current * 4) * 0.2;

      // Theme colors come from the CSS tokens so the canvas follows dark mode
      const css = getComputedStyle(canvas);
      const gridColor = css.getPropertyValue('--hairline').trim();
      const lineColor = css.getPropertyValue('--success').trim();

      // Dashed grid
      ctx.save();
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      const cols = 8;
      for (let c = 1; c < cols; c++) {
        const x = Math.round((w / cols) * c) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 16); ctx.lineTo(x, h - 16);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, Math.round(h * 0.5) + 0.5); ctx.lineTo(w, Math.round(h * 0.5) + 0.5);
      ctx.stroke();
      ctx.restore();

      // Wave path
      const segments = 120;
      const time = Date.now() * 0.008;
      const a = Math.min(amp, 1);
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const envelope = Math.sqrt(Math.sin(Math.PI * t));
        const noise = (
          Math.sin(i * 0.12 + time) * 0.5 +
          Math.sin(i * 0.24 - time * 0.5) * 0.3 +
          Math.sin(i * 0.04 + time * 1.5) * 0.2
        );
        points.push([t * w, h * 0.5 + noise * a * (h * 0.4) * envelope]);
      }

      const tracePath = () => {
        ctx.beginPath();
        points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      };

      // Gradient fill under the line
      tracePath();
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.85);
      grad.addColorStop(0, `${lineColor}38`);
      grad.addColorStop(1, `${lineColor}00`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      tracePath();
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = lineColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `${lineColor}66`;
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
