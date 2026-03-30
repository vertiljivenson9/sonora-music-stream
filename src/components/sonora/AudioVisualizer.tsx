'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function AudioVisualizer() {
  const { player } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const barCount = 32;

  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => ({
      height: 0,
      targetHeight: 0,
      velocity: 0,
      hue: 270 + (i / barCount) * 60,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const { width, height } = canvas;

      ctx.clearRect(0, 0, width, height);

      const barWidth = width / barCount;
      const gap = 2;
      const isPlaying = player.isPlaying;

      bars.forEach((bar, i) => {
        // Update target height
        if (isPlaying) {
          bar.targetHeight = Math.random() * height * 0.8 + height * 0.1;
        } else {
          bar.targetHeight = 4;
        }

        // Spring physics
        const spring = 0.08;
        const damping = 0.75;
        const force = (bar.targetHeight - bar.height) * spring;
        bar.velocity = (bar.velocity + force) * damping;
        bar.height += bar.velocity;
        bar.height = Math.max(2, bar.height);

        // Draw bar
        const x = i * barWidth + gap / 2;
        const barH = bar.height;
        const y = height - barH;
        const w = barWidth - gap;

        const gradient = ctx.createLinearGradient(x, y, x, height);
        gradient.addColorStop(0, `hsla(${bar.hue}, 80%, 65%, 0.9)`);
        gradient.addColorStop(1, `hsla(${bar.hue}, 60%, 45%, 0.4)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = Math.min(w / 2, 3);
        ctx.roundRect(x, y, w, barH, [radius, radius, 0, 0]);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [player.isPlaying, bars]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ minHeight: '80px' }}
    />
  );
}
