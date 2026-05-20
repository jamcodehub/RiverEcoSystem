import React, { useEffect, useRef, useMemo, useState } from 'react';

const EcosystemCanvas = ({ creatures, robots }) => {
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // Generate static reeds once
  const staticReeds = useMemo(() => {
    const reeds = [];
    for (let i = 0; i < 20; i++) {
      reeds.push({
        x: (i * (canvasSize.width / 20)) + 20,
        topY: 10,
        bottomY: null,
      });
    }
    return reeds;
  }, [canvasSize.width]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Initial sizing
    setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, width, height);

    // Draw river gradient
    const gradient = ctx.createLinearGradient(0, 50, 0, height - 50);
    gradient.addColorStop(0, '#a8d8ff');
    gradient.addColorStop(0.5, '#7fc8ff');
    gradient.addColorStop(1, '#a8d8ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 50, width, height - 100);

    // Draw river banks
    ctx.fillStyle = '#4a7c3a';
    ctx.fillRect(0, 0, width, 50); // Top bank
    ctx.fillStyle = '#3d6b2f';
    ctx.fillRect(0, height - 50, width, 50); // Bottom bank

    // Draw solid water lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const yOffset = 100 + i * 60;
      ctx.beginPath();
      ctx.moveTo(0, yOffset);
      ctx.lineTo(width, yOffset);
      ctx.stroke();
    }

    // Draw plants/reeds on banks (static)
    ctx.fillStyle = '#5a8c4a';
    staticReeds.forEach(reed => {
      // Top reeds
      ctx.fillRect(reed.x, reed.topY, 3, 40);
      // Bottom reeds
      ctx.fillRect(reed.x, height - 40, 3, 40);
    });

    // Draw rocks - responsive positioning
    ctx.fillStyle = '#8b8680';
    const scale = canvasSize.width / 1000;
    const rockPositions = [
      { x: 150 * scale, y: 280 * scale, r: 12 },
      { x: 450 * scale, y: 350 * scale, r: 10 },
      { x: 800 * scale, y: 200 * scale, r: 14 },
      { x: 950 * scale, y: 320 * scale, r: 11 },
    ];
    rockPositions.forEach(rock => {
      ctx.beginPath();
      ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#696360';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw creatures
    creatures.forEach(creature => {
      const x = Math.floor(creature.x);
      const y = Math.floor(creature.y);

      if (creature.type === 'frog') {
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(x - 6, y - 6, 12, 12);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(x - 3, y - 3, 6, 6);
      } else if (creature.type === 'fish') {
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.ellipse(x, y, 8, 5, creature.vx > 0 ? 0 : Math.PI, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.fillStyle = '#2980b9';
        ctx.beginPath();
        ctx.moveTo(x + (creature.vx > 0 ? 8 : -8), y);
        ctx.lineTo(x + (creature.vx > 0 ? 14 : -14), y - 3);
        ctx.lineTo(x + (creature.vx > 0 ? 14 : -14), y + 3);
        ctx.closePath();
        ctx.fill();
      } else if (creature.type === 'babyFish') {
        // Baby fish - smaller than regular fish
        ctx.fillStyle = '#5dade2';
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3, creature.vx > 0 ? 0 : Math.PI, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.moveTo(x + (creature.vx > 0 ? 5 : -5), y);
        ctx.lineTo(x + (creature.vx > 0 ? 9 : -9), y - 2);
        ctx.lineTo(x + (creature.vx > 0 ? 9 : -9), y + 2);
        ctx.closePath();
        ctx.fill();
      } else if (creature.type === 'tadpole') {
        // Tadpole - round body with tail
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(x - 2, y, 4, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.moveTo(x + 2, y);
        ctx.lineTo(x + 8, y + (Math.sin(creature.age * 0.1) * 2));
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (creature.type === 'babyMosquito') {
        // Baby mosquito fish - smaller, less aggressive coloring
        ctx.fillStyle = '#ec7063';
        ctx.beginPath();
        ctx.ellipse(x, y, 3, 2, creature.vx > 0 ? 0 : Math.PI, 0, Math.PI * 2);
        ctx.fill();
        // Small eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + (creature.vx > 0 ? 2 : -2), y - 0.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (creature.type === 'mosquito') {
        // Mosquito fish
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3, creature.vx > 0 ? 0 : Math.PI, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + (creature.vx > 0 ? 4 : -4), y - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw detection radius for creatures fleeing
      const nearbyDanger = creatures.some(
        c => c.type === 'mosquito' &&
          Math.hypot(c.x - creature.x, c.y - creature.y) < 120
      );

      if (nearbyDanger && creature.type === 'tadpole') {
        ctx.strokeStyle = 'rgba(255, 150, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Draw robots
    robots.forEach(robot => {
      const x = Math.floor(robot.x);
      const y = Math.floor(robot.y);
      const huntSpeed = robot.huntingSpeed || 0;
      const maxSpeed = 4;
      const speedRatio = Math.min(huntSpeed / maxSpeed, 1);

      // Hunting glow indicator
      if (speedRatio > 0.3) {
        const glowRadius = 15 + (speedRatio * 20);
        const glowAlpha = 0.1 + (speedRatio * 0.3);
        ctx.fillStyle = `rgba(255, ${Math.floor(100 + speedRatio * 155)}, 0, ${glowAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Robot body
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(x - 8, y - 8, 16, 16);

      // Speed indicator - color changes with speed
      const speedColor = speedRatio > 0.7 ? '#ff4444' : speedRatio > 0.3 ? '#ffaa00' : '#f39c12';
      ctx.strokeStyle = speedColor;
      ctx.lineWidth = 2 + (speedRatio * 2);
      ctx.strokeRect(x - 6, y - 6, 12, 12);

      // Antenna
      ctx.strokeStyle = speedColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 8);
      ctx.lineTo(x + 14, y - (8 + speedRatio * 8));
      ctx.stroke();

      // Detection range
      ctx.strokeStyle = `rgba(${Math.floor(243 - speedRatio * 100)}, ${Math.floor(156 + speedRatio * 50)}, 18, ${0.2 + speedRatio * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 250, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw info text
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.fillText('Drag to view • Space to pause', 10, height - 10);
  }, [creatures, robots, canvasSize]);

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className="ecosystem-canvas"
      />
    </div>
  );
};

export default EcosystemCanvas;
