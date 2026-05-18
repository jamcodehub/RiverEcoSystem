import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import EcosystemCanvas from './components/EcosystemCanvas';
import RobotBuilder from './components/RobotBuilder';
import StatsPanel from './components/StatsPanel';

function App() {
  const [creatures, setCreatures] = useState([]);
  const [robots, setRobots] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [showRobotModal, setShowRobotModal] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [selectedRobotCode, setSelectedRobotCode] = useState([]);
  const gameLoopRef = useRef(null);

  // Initialize ecosystem
  useEffect(() => {
    resetEcosystem();
  }, []);

  // Game loop
  useEffect(() => {
    const gameLoop = setInterval(() => {
      if (!isPaused) {
        setGameTime(t => t + 1);

        setCreatures(prevCreatures => {
          let updated = prevCreatures
            .map(creature => updateCreature(creature, prevCreatures))
            .filter(c => c && c.alive && c.age < c.lifespan);

          // Mosquito fish attack
          updated = updated.map(mosquito => {
            if (mosquito.type === 'mosquito') {
              const targets = updated.filter(
                c => ['frog', 'fish', 'egg'].includes(c.type) &&
                  distance(mosquito, c) < 15
              );
              if (targets.length > 0) {
                return { ...mosquito };
              }
            }
            return mosquito;
          });

          // Remove eaten creatures
          const eaten = new Set();
          updated.forEach(mosquito => {
            if (mosquito.type === 'mosquito') {
              updated.forEach(target => {
                if (['frog', 'fish', 'egg'].includes(target.type) && distance(mosquito, target) < 15) {
                  eaten.add(target.id);
                }
              });
            }
          });

          updated = updated.filter(c => !eaten.has(c.id));

          // Egg hatching
          const newCreatures = [];
          updated = updated.map(creature => {
            if (creature.type === 'egg' && creature.age > 300) {
              newCreatures.push({
                ...creature,
                type: 'frog',
                id: Math.random(),
              });
              return null;
            }
            return creature;
          }).filter(Boolean);

          // Random egg laying
          if (Math.random() < 0.001 && updated.filter(c => c.type === 'egg').length < 5) {
            const frogs = updated.filter(c => c.type === 'frog');
            if (frogs.length > 0) {
              const parent = frogs[Math.floor(Math.random() * frogs.length)];
              newCreatures.push({
                id: Math.random(),
                type: 'egg',
                x: parent.x + (Math.random() - 0.5) * 30,
                y: parent.y + (Math.random() - 0.5) * 30,
                vx: 0,
                vy: 0,
                age: 0,
                alive: true,
                lifespan: 800,
              });
            }
          }

          return [...updated, ...newCreatures];
        });

        // Update robots
        setRobots(prevRobots => {
          return prevRobots
            .map(robot => {
              const mosquitoes = creatures.filter(
                c => c.type === 'mosquito' && distance(robot, c) < 150
              );

              if (mosquitoes.length > 0 && robot.code.some(b => b.includes('mosquito'))) {
                const target = mosquitoes[0];
                if (robot.code.some(b => b.includes('rotate'))) {
                  // Remove target mosquito
                  setCreatures(prev => prev.filter(c => c.id !== target.id));
                }
              }

              return {
                ...robot,
                age: robot.age + 1,
                alive: robot.age < 3000,
              };
            })
            .filter(r => r.alive);
        });
      }
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [isPaused, creatures]);

  const updateCreature = (creature, allCreatures) => {
    const updated = { ...creature };
    updated.age = (updated.age || 0) + 1;

    // Check for nearby mosquito fish
    const nearbyMosquito = allCreatures.find(
      c => c.type === 'mosquito' && distance(creature, c) < 120
    );

    let currentSpeed = 1.5;
    let dirX = updated.vx || (Math.random() - 0.5) * 1.5;
    let dirY = updated.vy || (Math.random() - 0.5) * 1.5;

    if (nearbyMosquito && ['frog', 'fish', 'egg'].includes(creature.type)) {
      // Flee behavior - speed increases with proximity
      const dist = distance(creature, nearbyMosquito);
      const dangerLevel = Math.max(0, 1 - dist / 120);
      currentSpeed = 1.5 + dangerLevel * 3; // Ramp up to 4.5

      // Turn away from mosquito
      const dx = creature.x - nearbyMosquito.x;
      const dy = creature.y - nearbyMosquito.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      dirX = (dx / len) * currentSpeed;
      dirY = (dy / len) * currentSpeed;
    } else {
      // Normal wandering
      if (Math.random() < 0.02) {
        dirX = (Math.random() - 0.5) * 2;
        dirY = (Math.random() - 0.5) * 2;
      }
      currentSpeed = 1.5;
    }

    updated.vx = dirX;
    updated.vy = dirY;
    updated.x = updated.x + dirX;
    updated.y = updated.y + dirY;

    // Boundaries with wrapping
    const CANVAS_W = 1000;
    const CANVAS_H = 500;
    if (updated.x < 0) updated.x += CANVAS_W;
    if (updated.x > CANVAS_W) updated.x -= CANVAS_W;
    if (updated.y < 50) updated.y = 50;
    if (updated.y > CANVAS_H - 50) updated.y = CANVAS_H - 50;

    updated.alive = true;
    return updated;
  };

  const distance = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const resetEcosystem = () => {
    const newCreatures = [];
    // Add frogs
    for (let i = 0; i < 5; i++) {
      newCreatures.push({
        id: Math.random(),
        type: 'frog',
        x: Math.random() * 800 + 100,
        y: Math.random() * 300 + 100,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        age: 0,
        alive: true,
        lifespan: 5000,
      });
    }
    // Add fish
    for (let i = 0; i < 3; i++) {
      newCreatures.push({
        id: Math.random(),
        type: 'fish',
        x: Math.random() * 800 + 100,
        y: Math.random() * 300 + 100,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        age: 0,
        alive: true,
        lifespan: 5000,
      });
    }
    // Add eggs
    for (let i = 0; i < 2; i++) {
      newCreatures.push({
        id: Math.random(),
        type: 'egg',
        x: Math.random() * 800 + 100,
        y: Math.random() * 300 + 100,
        vx: 0,
        vy: 0,
        age: 0,
        alive: true,
        lifespan: 800,
      });
    }
    setCreatures(newCreatures);
    setRobots([]);
    setIsPaused(false);
  };

  const addMosquitoFish = () => {
    const newMosquito = [];
    for (let i = 0; i < 3; i++) {
      newMosquito.push({
        id: Math.random(),
        type: 'mosquito',
        x: Math.random() * 800 + 100,
        y: Math.random() * 300 + 100,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        age: 0,
        alive: true,
        lifespan: 1200,
      });
    }
    setCreatures(prev => [...prev, ...newMosquito]);
  };

  const deployRobot = (code) => {
    if (code.length === 0) {
      alert('Build a robot with at least one code block!');
      return;
    }
    const newRobot = {
      id: Math.random(),
      x: Math.random() * 800 + 100,
      y: Math.random() * 300 + 100,
      code: code,
      age: 0,
      alive: true,
    };
    setRobots(prev => [...prev, newRobot]);
    setShowRobotModal(false);
    setSelectedRobotCode([]);
  };

  const stats = {
    frogs: creatures.filter(c => c.type === 'frog').length,
    fish: creatures.filter(c => c.type === 'fish').length,
    eggs: creatures.filter(c => c.type === 'egg').length,
    mosquito: creatures.filter(c => c.type === 'mosquito').length,
    robots: robots.length,
  };

  return (
    <div className="app">
      <StatsPanel stats={stats} />

      <div className="main-content">
        <EcosystemCanvas creatures={creatures} robots={robots} />

        <div className="controls">
          <button onClick={addMosquitoFish} className="btn btn-danger">
            ➕ Spawn Mosquito Fish
          </button>
          <button onClick={() => setShowRobotModal(true)} className="btn btn-primary">
            🤖 Build Robot
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="btn btn-secondary"
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button onClick={resetEcosystem} className="btn btn-secondary">
            ↻ Reset
          </button>
        </div>
      </div>

      {showRobotModal && (
        <RobotBuilder
          onDeploy={deployRobot}
          onClose={() => setShowRobotModal(false)}
          selectedCode={selectedRobotCode}
          setSelectedCode={setSelectedRobotCode}
        />
      )}
    </div>
  );
}

export default App;
