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
  const [robotPlans, setRobotPlans] = useState([
    { id: 1, name: 'Robot 1', code: [], color: '#4ECDC4' }
  ]);
  const [activeRobotPlanId, setActiveRobotPlanId] = useState(1);
  const [gameSpeed, setGameSpeed] = useState(1); // Game speed multiplier
  const [telemetry, setTelemetry] = useState({
    gameTime: 0,
    nativeSpeciesEaten: 0,
    totalMosquitoesEaten: 0,
    mosquitoesEatenByRobots: 0,
    frogsHatched: 0,
    totalRobotsDeployed: 0,
  });
  const prevCreaturesRef = useRef({
    frogs: 0,
    fish: 0,
    tadpoles: 0,
    babyFish: 0,
    babyMosquito: 0,
    mosquito: 0,
  });
  const gameLoopRef = useRef(null);
  // Recent screen touches/clicks on the water - creatures near an active
  // point flee it briefly. Kept as a ref (not state) since it's read every
  // simulation tick but shouldn't itself trigger React re-renders.
  const touchPointsRef = useRef([]);
  const handleWaterTouch = (x, y) => {
    const now = Date.now();
    touchPointsRef.current = [
      ...touchPointsRef.current.filter(t => now - t.time < 1200),
      { x, y, time: now },
    ];
  };

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
      babyMosquito: creatures.filter(c => c.type === 'babyMosquito').length,
      mosquito: creatures.filter(c => c.type === 'mosquito').length,
    };

    // Check for native species death
    const nativeDeath = (prevCreaturesRef.current.frogs - currentCounts.frogs) +
                        (prevCreaturesRef.current.fish - currentCounts.fish) +
                        (prevCreaturesRef.current.tadpoles - currentCounts.tadpoles);

    // Check for invasive mosquito fish death (adults + babies combined, so
    // a babyMosquito -> mosquito maturation doesn't get miscounted as a death)
    const mosquitoDeath = (prevCreaturesRef.current.mosquito - currentCounts.mosquito) +
                          (prevCreaturesRef.current.babyMosquito - currentCounts.babyMosquito);

    // Check for frog birth (tadpole -> frog conversion)
    const frogBirth = Math.max(0, currentCounts.frogs - prevCreaturesRef.current.frogs);

    if (nativeDeath > 0 || mosquitoDeath > 0 || frogBirth > 0) {
      setTelemetry(prev => ({
        ...prev,
        nativeSpeciesEaten: prev.nativeSpeciesEaten + Math.max(0, nativeDeath),
        totalMosquitoesEaten: prev.totalMosquitoesEaten + Math.max(0, mosquitoDeath),
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
            .map(creature => updateCreature(creature, prevCreatures, gameSpeed))
            .filter(c => c && c.alive && c.age < c.lifespan);

          // Mosquito fish attack - target tadpoles and baby fish
          // Tadpoles are 50% more likely targets (easier prey)
          const eaten = new Set();
          updated.forEach(mosquito => {
            if (mosquito.type === 'mosquito') {
              updated.forEach(target => {
                if (distance(mosquito, target) < 15) {
                  // Tadpoles: 80% chance to be eaten, 20% chance to escape
                  if (target.type === 'tadpole' && Math.random() < 0.80) {
                    eaten.add(target.id);
                  }
                  // Baby fish: 80% chance to be eaten, 20% chance to escape
                  else if (target.type === 'babyFish' && Math.random() < 0.80) {
                    eaten.add(target.id);
                  }
                }
              });
            }
          });

          let modified = updated.filter(c => !eaten.has(c.id));

          // Decrement breeding cooldown for all creatures
          modified = modified.map(creature => ({
            ...creature,
            breedingCooldown: Math.max(0, (creature.breedingCooldown || 0) - 1),
          }));

          // Tadpole hatching (tadpole -> frog) - 1 minute maturation
          const newCreatures = [];
          modified = modified.map(creature => {
            if (creature.type === 'tadpole' && creature.age > 3600) {
              newCreatures.push({
                ...creature,
                type: 'frog',
                id: Math.random(),
                lifespan: 46000,
              });
              return null;
            }
            // Baby fish maturation (babyFish -> fish) - 1 minute maturation
            if (creature.type === 'babyFish' && creature.age > 3600) {
              newCreatures.push({
                ...creature,
                type: 'fish',
                id: Math.random(),
                lifespan: 46000,
              });
              return null;
            }
            // Baby mosquito maturation (babyMosquito -> mosquito) - 1 minute maturation
            if (creature.type === 'babyMosquito' && creature.age > 3600) {
              newCreatures.push({
                ...creature,
                type: 'mosquito',
                id: Math.random(),
                lifespan: 46000,
              });
              return null;
            }
            return creature;
          }).filter(Boolean);

          // Population cap - stop breeding at 1000 creatures to prevent lag
          const getPopulation = () => modified.length + newCreatures.length;
          const canAddCreature = () => getPopulation() < 1000;

          // Breeding system - Fish breed to make baby fish (40% chance)
          const fishCount = modified.filter(c => c.type === 'fish').length;
          if (Math.random() < 0.008 && fishCount > 1) {
            const fishes = modified.filter(c => c.type === 'fish' && (c.breedingCooldown || 0) <= 0);
            const fishBreedingIds = new Set();
            for (let i = 0; i < fishes.length; i++) {
              for (let j = i + 1; j < fishes.length; j++) {
                if (distance(fishes[i], fishes[j]) < 80) {
                  if (Math.random() < 0.40 && canAddCreature()) {
                    newCreatures.push({
                      id: Math.random(),
                      type: 'babyFish',
                      x: (fishes[i].x + fishes[j].x) / 2 + (Math.random() - 0.5) * 30,
                      y: (fishes[i].y + fishes[j].y) / 2 + (Math.random() - 0.5) * 30,
                      vx: (Math.random() - 0.5) * 1,
                      vy: (Math.random() - 0.5) * 1,
                      age: 0,
                      alive: true,
                      lifespan: 3700,
                      breedingCooldown: 0,
                    });
                    fishBreedingIds.add(fishes[i].id);
                    fishBreedingIds.add(fishes[j].id);
                  }
                }
              }
            }
            // Apply breeding cooldown to modified array
            modified = modified.map(c => 
              c.type === 'fish' && fishBreedingIds.has(c.id)
                ? { ...c, breedingCooldown: 250 }
                : c
            );
          }

          // Breeding system - Frogs breed to make tadpoles (40% chance)
          const frogCount = modified.filter(c => c.type === 'frog').length;
          if (canAddCreature() && Math.random() < 0.008 && frogCount > 1) {
            const frogs = modified.filter(c => c.type === 'frog' && (c.breedingCooldown || 0) <= 0);
            const frogBreedingIds = new Set();
            for (let i = 0; i < frogs.length; i++) {
              for (let j = i + 1; j < frogs.length; j++) {
                if (distance(frogs[i], frogs[j]) < 80) {
                  if (Math.random() < 0.40 && canAddCreature()) {
                    newCreatures.push({
                      id: Math.random(),
                      type: 'tadpole',
                      x: (frogs[i].x + frogs[j].x) / 2 + (Math.random() - 0.5) * 25,
                      y: (frogs[i].y + frogs[j].y) / 2 + (Math.random() - 0.5) * 25,
                      vx: (Math.random() - 0.5) * 1,
                      vy: (Math.random() - 0.5) * 1,
                      age: 0,
                      alive: true,
                      lifespan: 3700,
                      breedingCooldown: 0,
                    });
                    frogBreedingIds.add(frogs[i].id);
                    frogBreedingIds.add(frogs[j].id);
                  }
                }
              }
            }
            // Apply breeding cooldown to modified array
            modified = modified.map(c => 
              c.type === 'frog' && frogBreedingIds.has(c.id)
                ? { ...c, breedingCooldown: 250 }
                : c
            );
          }

          // Breeding system - Mosquito fish breed to make baby mosquitoes (48% chance - 20% more than frogs/fish)
          const mosquitoCount = modified.filter(c => c.type === 'mosquito').length;
          if (canAddCreature() && Math.random() < 0.0096 && mosquitoCount > 1) {
            const mosquitoes = modified.filter(c => c.type === 'mosquito' && (c.breedingCooldown || 0) <= 0);
            const mosquitoBreedingIds = new Set();
            for (let i = 0; i < mosquitoes.length; i++) {
              for (let j = i + 1; j < mosquitoes.length; j++) {
                if (distance(mosquitoes[i], mosquitoes[j]) < 80) {
                  if (Math.random() < 0.48 && canAddCreature()) {
                    newCreatures.push({
                      id: Math.random(),
                      type: 'babyMosquito',
                      x: (mosquitoes[i].x + mosquitoes[j].x) / 2 + (Math.random() - 0.5) * 30,
                      y: (mosquitoes[i].y + mosquitoes[j].y) / 2 + (Math.random() - 0.5) * 30,
                      vx: (Math.random() - 0.5) * 1,
                      vy: (Math.random() - 0.5) * 1,
                      age: 0,
                      alive: true,
                      lifespan: 3700,
                      breedingCooldown: 0,
                    });
                    mosquitoBreedingIds.add(mosquitoes[i].id);
                    mosquitoBreedingIds.add(mosquitoes[j].id);
                  }
                }
              }
            }
            // Apply breeding cooldown to modified array
            modified = modified.map(c => 
              c.type === 'mosquito' && mosquitoBreedingIds.has(c.id)
                ? { ...c, breedingCooldown: 100 }
                : c
            );
          }

          // Heron predation - population control for frogs, fish AND mosquito fish
          const heronFrogCount = modified.filter(c => c.type === 'frog').length;
          const heronFishCount = modified.filter(c => c.type === 'fish').length;
          const heronMosquitoCount = modified.filter(c => c.type === 'mosquito').length;
          const totalPrey = heronFrogCount + heronFishCount;
          const heronCount = modified.filter(c => c.type === 'heron').length;

          let maxHerons = 0;
          if (totalPrey >= 100) {
            const popAboveTarget = totalPrey > 550;
            const imbalanced = Math.abs(heronFrogCount - heronFishCount) > 20;
            if (popAboveTarget || imbalanced) {
              let heronNeeded = popAboveTarget ? Math.ceil((totalPrey - 550) / 50) : 0;
              if (imbalanced) heronNeeded = Math.max(heronNeeded, Math.ceil(Math.abs(heronFrogCount - heronFishCount) / 75));
              maxHerons = Math.min(heronNeeded, 2);
            }
          }
          // Also spawn herons if mosquito fish exceeds 500
          if (heronMosquitoCount > 500) maxHerons = Math.max(maxHerons, 2);

          if (heronCount < maxHerons) {
            const fromLeft = Math.random() < 0.5;
            newCreatures.push({
              id: Math.random(),
              type: 'heron',
              x: fromLeft ? -20 : window.innerWidth + 20,
              y: 80 + Math.random() * (window.innerHeight - 160),
              vx: fromLeft ? 3 : -3,
              vy: 0,
              age: 0,
              alive: true,
              hunted: 0,
              lifespan: 999999, 
            });
          } 

          // Heron eating - consume prey within 80px as it flies through
          const heronEaten = new Set();
          modified.forEach(heron => {
            if (heron.type !== 'heron' || (heron.hunted || 0) >= 50) return;

            const currFrogCount = modified.filter(c => c.type === 'frog' && !heronEaten.has(c.id)).length;
            const currFishCount = modified.filter(c => c.type === 'fish' && !heronEaten.has(c.id)).length;
            const currMosquitoCount = modified.filter(c => c.type === 'mosquito' && !heronEaten.has(c.id)).length;
            const frogRatio = currFrogCount / (currFrogCount + currFishCount || 1);
            const isBalanced = frogRatio > 0.42 && frogRatio < 0.58;
            const targetFrogs = currFrogCount > currFishCount;
            const mosquitoOverpopulated = currMosquitoCount > 500;

            modified.forEach(target => {
              if ((heron.hunted || 0) >= 50 || distance(heron, target) > 80) return;
              // Always eat mosquito fish if overpopulated
              if (mosquitoOverpopulated && target.type === 'mosquito' && Math.random() < 0.85) {
                heronEaten.add(target.id);
                heron.hunted = (heron.hunted || 0) + 1;
              } else if (isBalanced && (target.type === 'frog' || target.type === 'fish') && Math.random() < 0.85) {
                heronEaten.add(target.id);
                heron.hunted = (heron.hunted || 0) + 1;
              } else if (!isBalanced) {
                if (targetFrogs && target.type === 'frog' && Math.random() < 0.90) {
                  heronEaten.add(target.id);
                  heron.hunted = (heron.hunted || 0) + 1;
                } else if (!targetFrogs && target.type === 'fish' && Math.random() < 0.90) {
                  heronEaten.add(target.id);
                  heron.hunted = (heron.hunted || 0) + 1;
                }
              }
            });
          });

          modified = modified.filter(c => {
            if (c.type !== 'heron') return true;
            if ((c.hunted || 0) >= 50) return false;
            if (c.x < -100 || c.x > window.innerWidth + 100) return false;
            return true;
          });
          modified = modified.filter(c => !heronEaten.has(c.id));

          // HARD POPULATION CAP: Never exceed 550 total prey
          let allCreatures = [...modified, ...newCreatures];
          const maxPopulation = 550;
          
          if (allCreatures.length > maxPopulation) {
            // Count current populations
            const frogs = allCreatures.filter(c => c.type === 'frog').length;
            const fish = allCreatures.filter(c => c.type === 'fish').length;
            const excessPopulation = allCreatures.length - maxPopulation;
            
            // Remove excess proportionally from whichever is more abundant
            // This maintains balance and avoids one species being wiped out
            const imbalance = Math.abs(frogs - fish);
            
            if (imbalance > 20) {
              // Species are imbalanced - remove from the more abundant one
              if (frogs > fish) {
                const frogsToRemove = Math.min(frogs - Math.ceil(frogs / 2), excessPopulation);
                let removed = 0;
                allCreatures = allCreatures.filter(c => {
                  if (c.type === 'frog' && removed < frogsToRemove) {
                    removed++;
                    return false;
                  }
                  return true;
                });
              } else {
                const fishToRemove = Math.min(fish - Math.ceil(fish / 2), excessPopulation);
                let removed = 0;
                allCreatures = allCreatures.filter(c => {
                  if (c.type === 'fish' && removed < fishToRemove) {
                    removed++;
                    return false;
                  }
                  return true;
                });
              }
            } else {
              // Species are balanced - remove equally from both
              const removePerSpecies = Math.ceil(excessPopulation / 2);
              let frogsRemoved = 0, fishRemoved = 0;
              allCreatures = allCreatures.filter(c => {
                if (c.type === 'frog' && frogsRemoved < removePerSpecies) {
                  frogsRemoved++;
                  return false;
                }
                if (c.type === 'fish' && fishRemoved < removePerSpecies) {
                  fishRemoved++;
                  return false;
                }
                return true;
              });
            }
          }

          return allCreatures;
        });

        // Update robots - aggressive hunting behavior
        setRobots(prevRobots => {
          let mosquitoesKilled = 0;

          const updated = prevRobots
            .map(robot => {
              let updated = { ...robot };
              const hasSensorCommand = robot.code.some(b => typeof b === 'string' && b.includes('sensor'));
              const hasSwimCommand = robot.code.some(b => typeof b === 'string' && b.includes('swim'));
              // Only the trap/eat motor blocks should let a robot actually
              // capture a mosquito fish - "motor rotate (swim)" also contains
              // the substring "rotate", so checking for that alone let a
              // robot with just a swim block kill on contact too.
              const hasCaptureCommand = robot.code.some(b => typeof b === 'string' && (b.includes('trap') || b.includes('eat')));

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
                if (dist < 15 && hasCaptureCommand) {
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
              const CANVAS_W = window.innerWidth;
              const CANVAS_H = window.innerHeight;
              if (updated.x < 0) updated.x += CANVAS_W;
              if (updated.x > CANVAS_W) updated.x -= CANVAS_W;
              if (updated.y < 50) updated.y = 50;
              if (updated.y > CANVAS_H - 50) updated.y = CANVAS_H - 50;

              return {
                ...updated,
                age: updated.age + 1,
                alive: true,
              };
            })
            .filter(r => r.alive);

          // Update telemetry
          if (mosquitoesKilled > 0) {
            setTelemetry(prev => ({
              ...prev,
              mosquitoesEatenByRobots: prev.mosquitoesEatenByRobots + mosquitoesKilled,
            }));
          }

          return updated;
        });
      }
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [isPaused, creatures, gameSpeed]);

  const updateCreature = (creature, allCreatures, speedMult = 1) => {
    const updated = { ...creature };
    updated.age = (updated.age || 0) + speedMult;

    let dirX = updated.vx || (Math.random() - 0.5) * 1.5;
    let dirY = updated.vy || (Math.random() - 0.5) * 1.5;
    let currentSpeed = 1.5;

    // ===== TADPOLE BEHAVIOR =====
    if (creature.type === 'tadpole') {
      const nearbyMosquito = allCreatures.find(
        c => c.type === 'mosquito' && distance(creature, c) < 120
      );
      
      if (nearbyMosquito) {
        // Flee from predator
        const dist = distance(creature, nearbyMosquito);
        const dangerLevel = Math.max(0, 1 - dist / 120);
        currentSpeed = 1.5 + dangerLevel * 3; // Ramp up to 4.5
        
        const dx = creature.x - nearbyMosquito.x;
        const dy = creature.y - nearbyMosquito.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        dirX = (dx / len) * currentSpeed;
        dirY = (dy / len) * currentSpeed;
      } else {
        // Wandering
        if (Math.random() < 0.02) {
          dirX = (Math.random() - 0.5) * 2;
          dirY = (Math.random() - 0.5) * 2;
        }
        currentSpeed = 1.5;
      }
    }
    // ===== MOSQUITO BEHAVIOR =====
    else if (creature.type === 'mosquito') {
      const prey = allCreatures.filter(c => 
        (c.type === 'tadpole' || c.type === 'babyFish') && distance(creature, c) < 150
      );

      if (prey.length > 0) {
        // Hunt nearest prey (tadpoles or baby fish)
        const target = prey.reduce((closest, p) => 
          distance(creature, p) < distance(creature, closest) ? p : closest
        );
        
        const dist = distance(creature, target);
        currentSpeed = 2 + (1 - Math.min(dist / 150, 1)) * 2.5; // 2-4.5 speed
        
        const dx = target.x - creature.x;
        const dy = target.y - creature.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        dirX = (dx / len) * currentSpeed;
        dirY = (dy / len) * currentSpeed;
      } else {
        // No prey - normal wandering (breeding happens naturally when close)
        if (Math.random() < 0.02) {
          dirX = (Math.random() - 0.5) * 2;
          dirY = (Math.random() - 0.5) * 2;
        }
        currentSpeed = 1.5;
      }
    }
    // ===== HERON BEHAVIOR =====
    else if (creature.type === 'heron') {
      // Just maintain fixed direction set at spawn - no steering
      dirX = creature.vx;
      dirY = 0;
      currentSpeed = Math.abs(creature.vx);
    }
    // ===== FROG, FISH, AND BABY CREATURES BEHAVIOR =====
    else if (creature.type === 'frog' || creature.type === 'fish' || creature.type === 'babyFish' || creature.type === 'babyMosquito') {
      // Normal wandering - only adults hunt/breed visually
      if (Math.random() < 0.02) {
        dirX = (Math.random() - 0.5) * 2;
        dirY = (Math.random() - 0.5) * 2;
      }
      currentSpeed = 1.5;
    }
    // ===== DEFAULT BEHAVIOR =====
    else {
      if (Math.random() < 0.02) {
        dirX = (Math.random() - 0.5) * 2;
        dirY = (Math.random() - 0.5) * 2;
      }
      currentSpeed = 1.5;
    }

    // ===== STARTLE RESPONSE (touch/click on the water) =====
    // Overrides whatever the creature was doing - a hand or finger nearby
    // should interrupt hunting/wandering, not just nudge it.
    if (creature.type !== 'heron' && creature.type !== 'robot') {
      const now = Date.now();
      let repelX = 0, repelY = 0, influence = 0;
      const radius = 140;
      touchPointsRef.current.forEach(t => {
        const age = now - t.time;
        if (age >= 1200) return;
        const dx = creature.x - t.x;
        const dy = creature.y - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist >= radius) return;
        const fade = 1 - age / 1200;
        const strength = (1 - dist / radius) * fade;
        repelX += (dx / dist) * strength;
        repelY += (dy / dist) * strength;
        influence = Math.max(influence, strength);
      });
      if (influence > 0) {
        const fleeSpeed = 3 + influence * 3;
        const len = Math.sqrt(repelX * repelX + repelY * repelY) || 1;
        dirX = (repelX / len) * fleeSpeed;
        dirY = (repelY / len) * fleeSpeed;
        currentSpeed = fleeSpeed;
      }
    }

    // Apply velocity
    updated.vx = dirX;
    updated.vy = dirY;
    updated.x = updated.x + dirX * speedMult;
    updated.y = updated.y + dirY * speedMult;

    // Boundaries - wrap horizontally (EXCEPT for herons), constrain vertically to river
    const CANVAS_W = window.innerWidth;
    const CANVAS_H = window.innerHeight;
    const RIVER_TOP = 50;
    const RIVER_BOTTOM = CANVAS_H - 50;
    
    // Handle horizontal movement safely
    if (updated.type !== 'heron') {
        if (updated.x < 0) updated.x += CANVAS_W;
        if (updated.x > CANVAS_W) updated.x -= CANVAS_W;
    } else {
        // Optional: Ensure herons traveling right don't get stuck due to math clamping 
        // Just let them keep their velocity without any restriction
    }
    
    // Vertically constrain everything to the river
    if (updated.y < RIVER_TOP) updated.y = RIVER_TOP;
    if (updated.y > RIVER_BOTTOM) updated.y = RIVER_BOTTOM;

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
    // Add frogs (35)
    for (let i = 0; i < 35; i++) {
      newCreatures.push({
        id: Math.random(),
        type: 'frog',
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: 60 + Math.random() * (window.innerHeight - 120),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        age: 0,
        alive: true,
        lifespan: 46000,
        breedingCooldown: 0,
      });
    }
    // Add tadpoles (10) - for mosquito fish to hunt
    for (let i = 0; i < 10; i++) {
      newCreatures.push({
        id: Math.random(),
        type: 'tadpole',
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: 60 + Math.random() * (window.innerHeight - 120),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        age: 0,
        alive: true,
        lifespan: 3700,
        breedingCooldown: 0,
      });
    }
    // Add fish (35)
    for (let i = 0; i < 35; i++) {
      newCreatures.push({
        id: Math.random(),
        type: 'fish',
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: 60 + Math.random() * (window.innerHeight - 120),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        age: 0,
        alive: true,
        lifespan: 46000,
        breedingCooldown: 0,
      });
    }
    // Add mosquito fish (10)
    for (let i = 0; i < 10; i++) {
      newCreatures.push({
        id: Math.random(),
        type: 'mosquito',
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: 60 + Math.random() * (window.innerHeight - 120),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        age: 0,
        alive: true,
        lifespan: 46000,
        breedingCooldown: 0,
      });
    }
    setCreatures(newCreatures);
    setRobots([]);
    setIsPaused(false);
  };

  const deployRobot = (code, color = '#4ECDC4', planId = null) => {
    if (code.length === 0) {
      alert('Build a robot with at least one code block!');
      return;
    }
    const alreadyDeployed = planId !== null && robots.some(r => r.planId === planId);

    setRobots(prev => {
      const existingIndex = planId !== null ? prev.findIndex(r => r.planId === planId) : -1;
      if (existingIndex !== -1) {
        // This robot is already on the field - update its program/color in
        // place rather than spawning a duplicate.
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], code, color };
        return updated;
      }
      const newRobot = {
        id: Math.random(),
        planId,
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: 60 + Math.random() * (window.innerHeight - 120),
        vx: 0,
        vy: 0,
        direction: 0, // Angle in radians
        code,
        age: 0,
        alive: true,
        color,
      };
      return [...prev, newRobot];
    });

    if (!alreadyDeployed) {
      setTelemetry(prev => ({ ...prev, totalRobotsDeployed: prev.totalRobotsDeployed + 1 }));
    }
    setShowRobotModal(false); // Close modal so user can see deployed robot - tabs persist on reopen
  };

  const stats = {
    frogs: creatures.filter(c => c.type === 'frog').length,
    fish: creatures.filter(c => c.type === 'fish').length,
    tadpoles: creatures.filter(c => c.type === 'tadpole').length,
    babyFish: creatures.filter(c => c.type === 'babyFish').length,
    babyMosquito: creatures.filter(c => c.type === 'babyMosquito').length,
    mosquito: creatures.filter(c => c.type === 'mosquito').length,
    heron: creatures.filter(c => c.type === 'heron').length,
    robots: robots.length,
  };

  return (
    <div className="app">
      <div className="river-scene">
        <EcosystemCanvas creatures={creatures} robots={robots} onWaterTouch={handleWaterTouch} />
        
        {/* Overlay controls */}
        <div className="scene-overlay">
          <div className="top-stats">
            <StatsPanel stats={stats} />
          </div>
          
          <div className="bottom-controls">
            <div className="controls">
              <button onClick={() => setShowRobotModal(true)} className="btn btn-primary">
                Build Robot
              </button>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="btn btn-secondary"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button onClick={resetEcosystem} className="btn btn-secondary">
                Reset
              </button>
              <button 
                onClick={() => setShowTelemetry(true)} 
                className="btn btn-telemetry"
              >
                Telemetry
              </button>
              
              {/* Game Speed Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px', borderLeft: '1px solid #ccc', paddingLeft: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Speed:</span>
                {[1, 2, 4, 8].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setGameSpeed(speed)}
                    className="btn btn-secondary"
                    style={{
                      backgroundColor: gameSpeed === speed ? '#4CAF50' : undefined,
                      color: gameSpeed === speed ? 'white' : undefined,
                    }}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRobotModal && (
        <RobotBuilder
          onDeploy={deployRobot}
          onClose={() => setShowRobotModal(false)}
          robotPlans={robotPlans}
          setRobotPlans={setRobotPlans}
          activeRobotId={activeRobotPlanId}
          setActiveRobotId={setActiveRobotPlanId}
          deployedPlanIds={robots.map(r => r.planId)}
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