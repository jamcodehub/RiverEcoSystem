import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import EcosystemCanvas from './components/EcosystemCanvas';
import RobotBuilder from './components/RobotBuilder';
import StatsPanel from './components/StatsPanel';
import TelemetryPanel from './components/TelemetryPanel';

function App() {
  const [creatures, setCreatures] = useState([]);
  const [robots, setRobots] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [showRobotModal, setShowRobotModal] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [selectedRobotCode, setSelectedRobotCode] = useState([]);
  const [telemetry, setTelemetry] = useState({
    gameTime: 0,
    nativeSpeciesKilled: 0,
    mosquitoesKilledByRobots: 0,
    frogsHatched: 0,
    totalRobotsDeployed: 0,
  });
  const prevCreaturesRef = useRef({
    frogs: 0,
    fish: 0,
    tadpoles: 0,
    babyFish: 0,
    mosquito: 0,
  });
  const gameLoopRef = useRef(null);

  // Initialize ecosystem
  useEffect(() => {
    resetEcosystem();
  }, []);

  // Track creature deaths and births for telemetry
  useEffect(() => {
    const currentCounts = {
      frogs: creatures.filter(c => c.type === 'frog').length,
      fish: creatures.filter(c => c.type === 'fish').length,
      tadpoles: creatures.filter(c => c.type === 'tadpole').length,
      babyFish: creatures.filter(c => c.type === 'babyFish').length,
      mosquito: creatures.filter(c => c.type === 'mosquito').length,
    };

    // Check for native species death
    const nativeDeath = (prevCreaturesRef.current.frogs - currentCounts.frogs) +
                        (prevCreaturesRef.current.fish - currentCounts.fish) +
                        (prevCreaturesRef.current.tadpoles - currentCounts.tadpoles);
    
    // Check for frog birth (tadpole -> frog conversion)
    const frogBirth = Math.max(0, currentCounts.frogs - prevCreaturesRef.current.frogs);

    if (nativeDeath > 0 || frogBirth > 0) {
      setTelemetry(prev => ({
        ...prev,
        nativeSpeciesKilled: prev.nativeSpeciesKilled + nativeDeath,
        frogsHatched: prev.frogsHatched + frogBirth,
      }));
    }

    prevCreaturesRef.current = currentCounts;
  }, [creatures]);

  // Game loop
  useEffect(() => {
    const gameLoop = setInterval(() => {
      if (!isPaused) {
        setGameTime(t => t + 1);
        setTelemetry(prev => ({ ...prev, gameTime: prev.gameTime + 1 }));

        setCreatures(prevCreatures => {
          let updated = prevCreatures
            .map(creature => updateCreature(creature, prevCreatures))
            .filter(c => c && c.alive && c.age < c.lifespan);

          // Mosquito fish attack - ONLY target tadpoles
          const eaten = new Set();
          updated.forEach(mosquito => {
            if (mosquito.type === 'mosquito') {
              updated.forEach(target => {
                if (target.type === 'tadpole' && distance(mosquito, target) < 15) {
                  eaten.add(target.id);
                }
              });
            }
          });

          let modified = updated.filter(c => !eaten.has(c.id));

          // Tadpole hatching (tadpole -> frog)
          const newCreatures = [];
          modified = modified.map(creature => {
            if (creature.type === 'tadpole' && creature.age > 300) {
              newCreatures.push({
                ...creature,
                type: 'frog',
                id: Math.random(),
              });
              return null;
            }
            // Baby fish maturation (babyFish -> fish)
            if (creature.type === 'babyFish' && creature.age > 1500) {
              newCreatures.push({
                ...creature,
                type: 'fish',
                id: Math.random(),
                lifespan: 5000,
              });
              return null;
            }
            return creature;
          }).filter(Boolean);

          // Breeding system - Fish breed to make baby fish
          const fishCount = modified.filter(c => c.type === 'fish').length;
          if (Math.random() < 0.01 && fishCount > 1) {
            const fishes = modified.filter(c => c.type === 'fish');
            for (let i = 0; i < fishes.length; i++) {
              for (let j = i + 1; j < fishes.length; j++) {
                if (distance(fishes[i], fishes[j]) < 50) {
                  if (Math.random() < 0.5) {
                    newCreatures.push({
                      id: Math.random(),
                      type: 'babyFish',
                      x: (fishes[i].x + fishes[j].x) / 2 + (Math.random() - 0.5) * 20,
                      y: (fishes[i].y + fishes[j].y) / 2 + (Math.random() - 0.5) * 20,
                      vx: (Math.random() - 0.5) * 1,
                      vy: (Math.random() - 0.5) * 1,
                      age: 0,
                      alive: true,
                      lifespan: 2500,
                    });
                  }
                }
              }
            }
          }

          // Breeding system - Frogs breed to make tadpoles
          const frogCount = modified.filter(c => c.type === 'frog').length;
          if (Math.random() < 0.01 && frogCount > 1) {
            const frogs = modified.filter(c => c.type === 'frog');
            for (let i = 0; i < frogs.length; i++) {
              for (let j = i + 1; j < frogs.length; j++) {
                if (distance(frogs[i], frogs[j]) < 50) {
                  if (Math.random() < 0.5) {
                    newCreatures.push({
                      id: Math.random(),
                      type: 'tadpole',
                      x: (frogs[i].x + frogs[j].x) / 2 + (Math.random() - 0.5) * 20,
                      y: (frogs[i].y + frogs[j].y) / 2 + (Math.random() - 0.5) * 20,
                      vx: (Math.random() - 0.5) * 1,
                      vy: (Math.random() - 0.5) * 1,
                      age: 0,
                      alive: true,
                      lifespan: 400,
                    });
                  }
                }
              }
            }
          }

          // Breeding system - Mosquito fish breed
          const mosquitoCount = modified.filter(c => c.type === 'mosquito').length;
          if (Math.random() < 0.01 && mosquitoCount > 1) {
            const mosquitoes = modified.filter(c => c.type === 'mosquito');
            for (let i = 0; i < mosquitoes.length; i++) {
              for (let j = i + 1; j < mosquitoes.length; j++) {
                if (distance(mosquitoes[i], mosquitoes[j]) < 50) {
                  if (Math.random() < 0.5) {
                    newCreatures.push({
                      id: Math.random(),
                      type: 'mosquito',
                      x: (mosquitoes[i].x + mosquitoes[j].x) / 2 + (Math.random() - 0.5) * 20,
                      y: (mosquitoes[i].y + mosquitoes[j].y) / 2 + (Math.random() - 0.5) * 20,
                      vx: (Math.random() - 0.5) * 1,
                      vy: (Math.random() - 0.5) * 1,
                      age: 0,
                      alive: true,
                      lifespan: 1200,
                    });
                  }
                }
              }
            }
          }

          return [...modified, ...newCreatures];
        });

        // Update robots - aggressive hunting behavior
        setRobots(prevRobots => {
          let mosquitoesKilled = 0;

          const updated = prevRobots
            .map(robot => {
              let updated = { ...robot };
              const hasSensorCommand = robot.code.some(b => typeof b === 'string' && b.includes('sensor'));
              const hasSwimCommand = robot.code.some(b => typeof b === 'string' && b.includes('swim'));
              const hasRotateCommand = robot.code.some(b => typeof b === 'string' && b.includes('rotate'));

              // Check for nearby mosquitoes
              const HUNT_RANGE = 250; // Extended vision
              const nearbyMosquitoes = creatures.filter(
                c => c.type === 'mosquito' && distance(updated, c) < HUNT_RANGE
              );

              if (nearbyMosquitoes.length > 0 && hasSensorCommand) {
                // Aggressive hunting mode
                const target = nearbyMosquitoes.reduce((closest, m) =>
                  distance(updated, m) < distance(updated, closest) ? m : closest
                );

                const dist = distance(updated, target);
                const huntSpeed = 0.5 + (1 - Math.min(dist / HUNT_RANGE, 1)) * 3.5; // 0.5-4 speed
                
                // Chase target
                const dx = target.x - updated.x;
                const dy = target.y - updated.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                updated.vx = (dx / len) * huntSpeed;
                updated.vy = (dy / len) * huntSpeed;
                
                // Update direction for visual feedback
                updated.direction = Math.atan2(dy, dx);
                updated.huntingSpeed = huntSpeed; // Track speed for visual ramp-up

                // Kill mosquito if close enough
                if (dist < 15 && hasRotateCommand) {
                  setCreatures(prev => {
                    const filtered = prev.filter(c => c.id !== target.id);
                    mosquitoesKilled++;
                    return filtered;
                  });
                }
              } else if (hasSwimCommand) {
                // Normal swimming when not hunting
                const swimSpeed = 2;
                updated.vx = Math.cos(updated.direction || 0) * swimSpeed;
                updated.vy = Math.sin(updated.direction || 0) * swimSpeed;
                updated.huntingSpeed = swimSpeed;

                // Randomly change direction
                if (Math.random() < 0.02) {
                  updated.direction = Math.random() * Math.PI * 2;
                }
              } else {
                // Stationary if no swim command
                updated.vx = 0;
                updated.vy = 0;
              }

              // Update position
              updated.x += updated.vx || 0;
              updated.y += updated.vy || 0;

              // Boundary wrapping
              const CANVAS_W = 1000;
              const CANVAS_H = 500;
              if (updated.x < 0) updated.x += CANVAS_W;
              if (updated.x > CANVAS_W) updated.x -= CANVAS_W;
              if (updated.y < 50) updated.y = 50;
              if (updated.y > CANVAS_H - 50) updated.y = CANVAS_H - 50;

              return {
                ...updated,
                age: updated.age + 1,
                alive: updated.age < 3000,
              };
            })
            .filter(r => r.alive);

          // Update telemetry
          if (mosquitoesKilled > 0) {
            setTelemetry(prev => ({
              ...prev,
              mosquitoesKilledByRobots: prev.mosquitoesKilledByRobots + mosquitoesKilled,
            }));
          }

          return updated;
        });
      }
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [isPaused, creatures]);

  const updateCreature = (creature, allCreatures) => {
    const updated = { ...creature };
    updated.age = (updated.age || 0) + 1;

    let currentSpeed = 1.5;
    let dirX = updated.vx || (Math.random() - 0.5) * 1.5;
    let dirY = updated.vy || (Math.random() - 0.5) * 1.5;

    if (creature.type === 'mosquito') {
      // Mosquito fish hunting behavior - pursue nearby prey
      const prey = allCreatures.filter(c => 
        c.type === 'tadpole' && distance(creature, c) < 150
      );

      if (prey.length > 0) {
        // Hunt nearest target
        const target = prey.reduce((closest, p) => 
          distance(creature, p) < distance(creature, closest) ? p : closest
        );
        
        const dist = distance(creature, target);
        // Increase speed based on proximity - faster as they close in
        currentSpeed = 2 + (1 - Math.min(dist / 150, 1)) * 2.5; // 2-4.5 speed
        
        // Move towards target
        const dx = target.x - creature.x;
        const dy = target.y - creature.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        dirX = (dx / len) * currentSpeed;
        dirY = (dy / len) * currentSpeed;
      } else {
        // Wandering behavior when no prey nearby
        if (Math.random() < 0.02) {
          dirX = (Math.random() - 0.5) * 2;
          dirY = (Math.random() - 0.5) * 2;
        }
        currentSpeed = 1.5;
      }
    } else {
      // Check for nearby mosquito fish (for native species) - only flee if tadpole
      if (creature.type !== 'tadpole') {
        // Non-tadpoles ignore mosquitoes
        if (Math.random() < 0.02) {
          dirX = (Math.random() - 0.5) * 2;
          dirY = (Math.random() - 0.5) * 2;
        }
        currentSpeed = 1.5;
      } else {
        const nearbyMosquito = allCreatures.find(
          c => c.type === 'mosquito' && distance(creature, c) < 120
        );

        if (nearbyMosquito) {
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
      }
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
    // Add frogs (20)
    for (let i = 0; i < 20; i++) {
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
    // Add fish (20)
    for (let i = 0; i < 20; i++) {
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
    // Add mosquito fish (6) - they breed now
    for (let i = 0; i < 6; i++) {
      newCreatures.push({
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
    setCreatures(newCreatures);
    setRobots([]);
    setIsPaused(false);
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
      vx: 0,
      vy: 0,
      direction: 0, // Angle in radians
      code: code,
      age: 0,
      alive: true,
    };
    setRobots(prev => [...prev, newRobot]);
    setTelemetry(prev => ({ ...prev, totalRobotsDeployed: prev.totalRobotsDeployed + 1 }));
    setShowRobotModal(false);
    setSelectedRobotCode([]);
  };

  const stats = {
    frogs: creatures.filter(c => c.type === 'frog').length,
    fish: creatures.filter(c => c.type === 'fish').length,
    tadpoles: creatures.filter(c => c.type === 'tadpole').length,
    babyFish: creatures.filter(c => c.type === 'babyFish').length,
    mosquito: creatures.filter(c => c.type === 'mosquito').length,
    robots: robots.length,
  };

  return (
    <div className="app">
      <div className="river-scene">
        <EcosystemCanvas creatures={creatures} robots={robots} />
        
        {/* Overlay controls */}
        <div className="scene-overlay">
          <div className="top-stats">
            <StatsPanel stats={stats} />
          </div>
          
          <div className="bottom-controls">
            <div className="controls">
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
              <button 
                onClick={() => setShowTelemetry(true)} 
                className="btn btn-telemetry"
              >
                📊 Telemetry
              </button>
            </div>
          </div>
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

      {showTelemetry && (
        <TelemetryPanel
          onClose={() => setShowTelemetry(false)}
          telemetry={telemetry}
          stats={stats}
        />
      )}
    </div>
  );
}

export default App;
