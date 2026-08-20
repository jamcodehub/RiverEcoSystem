import React, { useEffect, useRef, useMemo, useState } from 'react';

const EcosystemCanvas = ({ creatures, robots, onWaterTouch }) => {
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Latest data, read fresh by the animation loop every frame without
  // needing to restart the loop or depend on React re-renders for
  // smoothness (ripples/water shimmer animate independently of how often
  // the simulation itself ticks, and keep animating while paused).
  const creaturesRef = useRef(creatures);
  const robotsRef = useRef(robots);
  const ripplesRef = useRef([]); // { x, y, startTime }
  useEffect(() => { creaturesRef.current = creatures; }, [creatures]);
  useEffect(() => { robotsRef.current = robots; }, [robots]);

  // Generate static reeds once
  const staticReeds = useMemo(() => {
    const reeds = [];
    for (let i = 0; i < 20; i++) {
      reeds.push({
        x: (i * (canvasSize.width / 20)) + 20,
        topY: 10,
        h: 30 + Math.sin(i * 1.7) * 10,
        sway: Math.random() * Math.PI * 2,
      });
    }
    return reeds;
  }, [canvasSize.width]);

  // A handful of small grass tufts along both banks, positioned once per
  // canvas width so they don't jitter every render.
  const grassTufts = useMemo(() => {
    const tufts = [];
    for (let i = 0; i < 45; i++) {
      tufts.push({
        x: Math.random() * canvasSize.width,
        edge: Math.random() < 0.5 ? 'top' : 'bottom',
        h: 6 + Math.random() * 10,
        lean: (Math.random() - 0.5) * 8,
      });
    }
    return tufts;
  }, [canvasSize.width]);

  // Deterministic "caustic" light glints on the water surface - fixed seeds
  // animated by time, rather than re-randomized every frame (which would
  // just look like static noise).
  const caustics = useMemo(() => {
    const dots = [];
    for (let i = 0; i < 18; i++) {
      dots.push({
        seedX: Math.random(),
        seedY: Math.random(),
        r: 8 + Math.random() * 16,
        speed: 0.15 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return dots;
  }, []);

  // Handle canvas resize - debounced so a drag-resize or iPad orientation
  // change doesn't force a full redraw on every intermediate frame.
  useEffect(() => {
    let resizeTimer = null;

    const applyResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applyResize, 150);
    };

    const initialTimer = setTimeout(applyResize, 100);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      clearTimeout(initialTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Resize the actual canvas backing store only when size changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
  }, [canvasSize]);

  // ---- Sprite helpers -----------------------------------------------
  const drawFrog = (ctx, x, y, creature, t) => {
    const vx = creature.vx || 0;
    const vy = creature.vy || 0;
    const angle = Math.atan2(vy, vx);
    const speed = Math.min(Math.hypot(vx, vy), 4);
    const seed = (creature.x || 0) * 0.7 + (creature.y || 0) * 0.3;
 
    // Breaststroke kick cycle: quick power stroke (legs whip out and back),
    // slower recovery (legs pull back in close to the body). Faster
    // swimming = faster kicking.
    const cycleSpeed = 0.005 + speed * 0.0035;
    const phase = (t * cycleSpeed + seed) % (Math.PI * 2);
    const kick = Math.pow(Math.max(0, Math.sin(phase)), 0.6); // 0 tucked -> 1 fully extended
    const bob = Math.sin(t * 0.004 + seed) * 0.5;
 
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(angle); // local +x = direction of travel (head faces forward)
 
    // Hind legs - long, attached toward the rear, trailing behind and
    // kicking outward/back in sync (real frogs kick both legs together,
    // not alternating).
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    [-1, 1].forEach(side => {
      const hipX = -5, hipY = side * 2.5;
      const kneeX = hipX - 4 - kick * 4;
      const kneeY = hipY + side * (2 + kick * 7);
      const footX = hipX - 7 - kick * 11;
      const footY = hipY + side * (1 + kick * 4);
 
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
      ctx.stroke();
 
      // Webbed foot
      ctx.save();
      ctx.translate(footX, footY);
      ctx.rotate(side * (0.3 + kick * 0.4));
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.4 + kick * 1, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
 
      // Body
      const grad = ctx.createRadialGradient(2, -1, 1, 0, 0, 9);
      grad.addColorStop(0, '#4bd97e');
      grad.addColorStop(1, '#2ecc71');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
  
      // Spots
      ctx.fillStyle = 'rgba(39, 174, 96, 0.5)';
      ctx.beginPath();
      ctx.ellipse(-1, 2, 1.6, 1, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1, -2, 1.4, 0.9, -0.4, 0, Math.PI * 2);
      ctx.fill();
  
      // Eyes (bulging on top, toward the front)
      [-1, 1].forEach(side => {
        ctx.fillStyle = '#eafff2';
        ctx.beginPath();
        ctx.arc(4, side * 2.6, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(4.6, side * 2.6, 0.9, 0, Math.PI * 2);
        ctx.fill();
      });
  
// Front legs - small, tucked near the head
      ctx.strokeStyle = '#27ae60';
      ctx.lineWidth = 1.6;
      [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.moveTo(4, side * 4);
        ctx.lineTo(6.5, side * 5.5);
        ctx.stroke();
      });
  
      ctx.restore();
    }; // This single brace closes drawFrog!

  const drawFish = (ctx, x, y, creature, palette) => {
    const facingRight = creature.vx >= 0;
    const d = facingRight ? 1 : -1;
    const wag = Math.sin((creature.age || 0) * 0.3) * 0.35;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(d, 1);

    // Tail fin (forked)
    ctx.fillStyle = palette.fin;
    ctx.save();
    ctx.translate(-palette.len * 0.85, 0);
    ctx.rotate(wag);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-palette.tail, -palette.tailW);
    ctx.lineTo(-palette.tail * 0.55, 0);
    ctx.lineTo(-palette.tail, palette.tailW);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Body
    const grad = ctx.createLinearGradient(0, -palette.h, 0, palette.h);
    grad.addColorStop(0, palette.top);
    grad.addColorStop(1, palette.belly);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, palette.len, palette.h, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dorsal fin
    ctx.fillStyle = palette.fin;
    ctx.beginPath();
    if (palette.spiky) {
      ctx.moveTo(-2, -palette.h + 1);
      ctx.lineTo(1, -palette.h - 5);
      ctx.lineTo(3, -palette.h + 1);
      ctx.lineTo(5, -palette.h - 4);
      ctx.lineTo(7, -palette.h + 1);
    } else {
      ctx.moveTo(-3, -palette.h + 1);
      ctx.quadraticCurveTo(2, -palette.h - 5, 6, -palette.h + 1);
    }
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(palette.len * 0.55, -palette.h * 0.15, palette.eye, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(palette.len * 0.6, -palette.h * 0.15, palette.eye * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const FISH_PALETTE = { len: 8, h: 5, tail: 7, tailW: 4, eye: 1.4, top: '#3fa9e8', belly: '#a7dcf5', fin: '#2980b9', spiky: false };
  const BABYFISH_PALETTE = { len: 5, h: 3, tail: 4.5, tailW: 2.4, eye: 0.9, top: '#6fc3ec', belly: '#cdeeFA', fin: '#3498db', spiky: false };
  const MOSQUITO_PALETTE = { len: 5.5, h: 3.2, tail: 5, tailW: 3, eye: 1, top: '#f4664a', belly: '#ffb199', fin: '#c0392b', spiky: true };
  const BABYMOSQ_PALETTE = { len: 3.4, h: 2, tail: 3, tailW: 1.8, eye: 0.7, top: '#f0876f', belly: '#ffcabb', fin: '#e0654a', spiky: true };

  const drawTadpole = (ctx, x, y, creature) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#e8a33d';
    ctx.strokeStyle = '#c9781f';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.lineTo(2, 0);
    ctx.lineTo(9, (Math.sin((creature.age || 0) * 0.25) * 3));
    ctx.stroke();
    const grad = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, 4.2);
    grad.addColorStop(0, '#f7c873');
    grad.addColorStop(1, '#e8a33d');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(-1, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a10';
    ctx.beginPath();
    ctx.arc(-2.6, -1.3, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawHeron = (ctx, x, y, creature) => {
    const facingRight = creature.vx >= 0;
    const d = facingRight ? 1 : -1;
    ctx.save();
    ctx.translate(x, y);

    // Legs
    ctx.strokeStyle = '#e0b84a';
    ctx.lineWidth = 1.6;
    [-6, 4].forEach(lx => {
      ctx.beginPath();
      ctx.moveTo(lx, 6);
      ctx.lineTo(lx - 1, 15);
      ctx.stroke();
    });

    // Body
    const grad = ctx.createLinearGradient(0, -8, 0, 8);
    grad.addColorStop(0, '#7c94a3');
    grad.addColorStop(1, '#546778');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = '#4a6275';
    ctx.beginPath();
    ctx.moveTo(-d * 4, -1);
    ctx.quadraticCurveTo(-d * 16, -20, -d * 24, -6);
    ctx.quadraticCurveTo(-d * 14, -2, -d * 6, 5);
    ctx.closePath();
    ctx.fill();

    // Neck + head
    ctx.strokeStyle = '#7c94a3';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(d * 16, -1);
    ctx.quadraticCurveTo(d * 22, -14, d * 27, -8);
    ctx.stroke();

    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(d * 28, -8, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(d * 29.5, -9, 1, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.strokeStyle = '#e8c547';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(d * 32, -8);
    ctx.lineTo(d * 43, -7);
    ctx.stroke();

    ctx.restore();
  };

  const drawRobot = (ctx, x, y, robot) => {
    const huntSpeed = robot.huntingSpeed || 0;
    const maxSpeed = 4;
    const speedRatio = Math.min(huntSpeed / maxSpeed, 1);
    const robotColor = robot.color || '#f39c12';

    if (speedRatio > 0.3) {
      const glowRadius = 15 + speedRatio * 20;
      const glowAlpha = 0.1 + speedRatio * 0.3;
      ctx.fillStyle = `rgba(255, ${Math.floor(100 + speedRatio * 155)}, 0, ${glowAlpha})`;
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(x, y);

    // Body (rounded)
    const grad = ctx.createLinearGradient(0, -9, 0, 9);
    grad.addColorStop(0, robotColor);
    grad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = robotColor;
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(-9 + r, -9);
    ctx.arcTo(9, -9, 9, 9, r);
    ctx.arcTo(9, 9, -9, 9, r);
    ctx.arcTo(-9, 9, -9, -9, r);
    ctx.arcTo(-9, -9, 9, -9, r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = grad;
    ctx.fill();

    // Eye/sensor
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    const speedColor = speedRatio > 0.7 ? '#ff4444' : speedRatio > 0.3 ? '#ffaa00' : '#2c3e50';
    ctx.fillStyle = speedColor;
    ctx.beginPath();
    ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = speedColor;
    ctx.lineWidth = 2 + speedRatio * 2;
    ctx.strokeRect(-6, -6, 12, 12);

    // Antenna
    ctx.strokeStyle = speedColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(14, -(8 + speedRatio * 8));
    ctx.stroke();
    ctx.restore();

    // Detection range
    ctx.strokeStyle = `rgba(${Math.floor(243 - speedRatio * 100)}, ${Math.floor(156 + speedRatio * 50)}, 18, ${0.2 + speedRatio * 0.2})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 250, 0, Math.PI * 2);
    ctx.stroke();
  };

  // ---- Main draw, called every animation frame -----------------------
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const t = performance.now();

    ctx.clearRect(0, 0, width, height);

    // Sky
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, width, 50);
    ctx.fillRect(0, height - 50, width, 50);

    // Water - richer layered gradient
    const waterGrad = ctx.createLinearGradient(0, 50, 0, height - 50);
    waterGrad.addColorStop(0, '#d7ecff');
    waterGrad.addColorStop(0.35, '#8fc7ec');
    waterGrad.addColorStop(0.7, '#5a9fd4');
    waterGrad.addColorStop(1, '#3d7fb5');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 50, width, height - 100);

    // Subtle animated shimmer bands
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 50, width, height - 100);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const yy = 70 + i * ((height - 120) / 6);
      ctx.beginPath();
      for (let px = 0; px <= width; px += 20) {
        const wave = Math.sin(px * 0.02 + t * 0.0006 + i) * 4;
        if (px === 0) ctx.moveTo(px, yy + wave);
        else ctx.lineTo(px, yy + wave);
      }
      ctx.stroke();
    }

    // Caustic light glints
    caustics.forEach(c => {
      const cx = c.seedX * width;
      const cy = 60 + c.seedY * (height - 120);
      const alpha = 0.06 + 0.05 * (1 + Math.sin(t * 0.0008 * c.speed * 8 + c.phase));
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, c.r, c.r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Banks
    const topBankGrad = ctx.createLinearGradient(0, 0, 0, 50);
    topBankGrad.addColorStop(0, '#8bcf3d');
    topBankGrad.addColorStop(1, '#5a9c28');
    ctx.fillStyle = topBankGrad;
    ctx.fillRect(0, 0, width, 50);

    const bottomBankGrad = ctx.createLinearGradient(0, height - 50, 0, height);
    bottomBankGrad.addColorStop(0, '#5a9c28');
    bottomBankGrad.addColorStop(1, '#3f7a1a');
    ctx.fillStyle = bottomBankGrad;
    ctx.fillRect(0, height - 50, width, 50);

    // Reeds (swaying)
    ctx.strokeStyle = '#4a7a3a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    staticReeds.forEach((reed, i) => {
      const sway = Math.sin(t * 0.0012 + reed.sway) * 4;
      ctx.beginPath();
      ctx.moveTo(reed.x, reed.topY);
      ctx.quadraticCurveTo(reed.x + sway, reed.topY + reed.h * 0.6, reed.x + sway * 1.6, reed.topY + reed.h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(reed.x, height - 10);
      ctx.quadraticCurveTo(reed.x - sway, height - 10 - reed.h * 0.6, reed.x - sway * 1.6, height - 10 - reed.h);
      ctx.stroke();
    });

    // Grass tufts
    ctx.strokeStyle = '#3f7a1a';
    ctx.lineWidth = 1.6;
    grassTufts.forEach(g => {
      const baseY = g.edge === 'top' ? 48 : height - 48;
      const dir = g.edge === 'top' ? 1 : -1;
      for (let b = -1; b <= 1; b++) {
        ctx.beginPath();
        ctx.moveTo(g.x + b * 2, baseY);
        ctx.quadraticCurveTo(g.x + b * 2 + g.lean * 0.5, baseY - dir * g.h * 0.6, g.x + g.lean, baseY - dir * g.h);
        ctx.stroke();
      }
    });

    // Rocks
    const scale = width / 1000;
    ctx.fillStyle = '#b5ada2';
    const rockPositions = [
      { x: 150 * scale, y: 280 * scale, r: 12 },
      { x: 450 * scale, y: 350 * scale, r: 10 },
      { x: 800 * scale, y: 200 * scale, r: 14 },
      { x: 950 * scale, y: 320 * scale, r: 11 },
    ];
    rockPositions.forEach(rock => {
      const grad = ctx.createRadialGradient(rock.x - rock.r * 0.3, rock.y - rock.r * 0.3, 1, rock.x, rock.y, rock.r);
      grad.addColorStop(0, '#cfc7ba');
      grad.addColorStop(1, '#8b8375');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Creatures
    const liveCreatures = creaturesRef.current || [];
    liveCreatures.forEach(creature => {
      const x = Math.floor(creature.x);
      const y = Math.floor(creature.y);

      if (creature.type === 'frog') {
        drawFrog(ctx, x, y, creature, t); // FIX APPLIED HERE
      } else if (creature.type === 'fish') {
        drawFish(ctx, x, y, creature, FISH_PALETTE);
      } else if (creature.type === 'babyFish') {
        drawFish(ctx, x, y, creature, BABYFISH_PALETTE);
      } else if (creature.type === 'tadpole') {
        drawTadpole(ctx, x, y, creature);
      } else if (creature.type === 'mosquito') {
        drawFish(ctx, x, y, creature, MOSQUITO_PALETTE);
      } else if (creature.type === 'babyMosquito') {
        drawFish(ctx, x, y, creature, BABYMOSQ_PALETTE);
      } else if (creature.type === 'heron') {
        drawHeron(ctx, x, y, creature);
      }

      const nearbyDanger = liveCreatures.some(
        c => c.type === 'mosquito' && Math.hypot(c.x - creature.x, c.y - creature.y) < 120
      );
      if (nearbyDanger && creature.type === 'tadpole') {
        ctx.strokeStyle = 'rgba(255, 150, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Robots
    (robotsRef.current || []).forEach(robot => {
      drawRobot(ctx, Math.floor(robot.x), Math.floor(robot.y), robot);
    });

    // Ripples from screen touches
    const now = Date.now();
    ripplesRef.current = ripplesRef.current.filter(r => now - r.startTime < 900);
    ripplesRef.current.forEach(r => {
      const age = now - r.startTime;
      const progress = age / 900;
      [0, 130].forEach(delay => {
        const p = Math.max(0, Math.min(1, progress - delay / 900));
        if (p <= 0) return;
        const radius = p * 55;
        const alpha = (1 - p) * 0.45;
        ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      });
    });
  };

  const drawRef = useRef(draw);
  drawRef.current = draw;

  // A single persistent animation loop, started once. Reads the latest
  // draw() via a ref so ripples/water shimmer keep animating smoothly
  // regardless of how often the simulation itself ticks (or if it's paused).
  useEffect(() => {
    let frameId;
    const loop = () => {
      drawRef.current();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ripplesRef.current = [...ripplesRef.current, { x, y, startTime: Date.now() }];
    if (onWaterTouch) onWaterTouch(x, y);
  };

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className="ecosystem-canvas"
        onPointerDown={handlePointerDown}
      />
    </div>
  );
};

export default EcosystemCanvas;