import React from 'react';

const TelemetryPanel = ({ onClose, telemetry, stats }) => {
  // Separate native and invasive species for accurate health math
  const totalNative = stats.frogs + stats.fish + stats.tadpoles + stats.babyFish;
  const totalInvasive = stats.mosquito + stats.babyMosquito;
  const totalLives = totalNative + totalInvasive;
  
  const getPercentage = (count, total) => {
    if (total === 0) return '0%';
    return ((count / total) * 100).toFixed(1) + '%';
  };

  const formatTime = (frames) => {
    const seconds = Math.floor(frames / 60);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const robotEffectiveness = stats.robots > 0 
    ? ((telemetry.mosquitoesEatenByRobots / (telemetry.mosquitoesEatenByRobots + totalInvasive || 1)) * 100).toFixed(1)
    : '0';

  // --- HEALTH SCORE ALGORITHM ---
  let healthScore = 0;
  if (totalInvasive === 0 && totalNative > 0) {
    healthScore = 100; // Perfect score if invasive fish are entirely eradicated
  } else if (totalLives > 0) {
    // Health drops dynamically as the percentage of invasive species increases
    healthScore = (totalNative / totalLives) * 100;
  }
  
  let healthStatus = 'Critical';
  let healthColor = '#e74c3c';
  
  if (totalInvasive === 0 && totalNative > 0) {
      healthStatus = 'Clean & Thriving';
      healthColor = '#2ecc71';
  } else if (healthScore > 70) {
      healthStatus = 'Thriving';
      healthColor = '#2ecc71';
  } else if (healthScore > 40) {
      healthStatus = 'Stable';
      healthColor = '#f39c12';
  }

  // --- PROTECTION STATUS ALGORITHM ---
  let protectionStatus = 'Struggling';
  let protectionClass = 'danger';
  
  if (totalInvasive === 0) {
      protectionStatus = 'Secured';
      protectionClass = 'success';
  } else if (robotEffectiveness > 50) {
      protectionStatus = 'Active';
      protectionClass = 'success';
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="telemetry-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>River Telemetry Dashboard</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="telemetry-content">
          <div className="telemetry-section">
            <h3>Simulation Time</h3>
            <div className="big-stat">{formatTime(telemetry.gameTime)}</div>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-card">
              <h4>Population Overview</h4>
              <div className="stat-row">
                <span>Native Frogs & Tadpoles</span>
                <span className="value">{stats.frogs + stats.tadpoles}</span>
                <span className="percentage">{getPercentage(stats.frogs + stats.tadpoles, totalLives)}</span>
              </div>
              <div className="stat-row">
                <span>Native Fish (Adult & Baby)</span>
                <span className="value">{stats.fish + stats.babyFish}</span>
                <span className="percentage">{getPercentage(stats.fish + stats.babyFish, totalLives)}</span>
              </div>
              <div className="stat-row">
                <span>Invasive Mosquito Fish</span>
                <span className="value danger">{totalInvasive}</span>
                <span className="percentage">{getPercentage(totalInvasive, totalLives)}</span>
              </div>
              <hr />
              <div className="stat-row bold">
                <span>Total Life</span>
                <span className="value">{totalLives}</span>
              </div>
            </div>

            <div className="telemetry-card">
              <h4>Predation Stats</h4>
              <div className="stat-row">
                <span>Native Species Eaten</span>
                <span className="value danger">{telemetry.nativeSpeciesEaten}</span>
              </div>
              <div className="stat-row">
                <span>Total Mosquitoes Eaten</span>
                <span className="value success">{telemetry.totalMosquitoesEaten || 0}</span>
              </div>
              <div className="stat-row">
                <span>Mosquitoes Eaten by Robots</span>
                <span className="value success">{telemetry.mosquitoesEatenByRobots}</span>
              </div>
              <hr />
              <div className="stat-row">
                <span>Frogs Born</span>
                <span className="value">{telemetry.frogsHatched}</span>
              </div>
            </div>

            <div className="telemetry-card">
              <h4>Robot Performance</h4>
              <div className="stat-row">
                <span>Active Robots</span>
                <span className="value">{stats.robots}</span>
              </div>
              <div className="stat-row">
                <span>Avg Effectiveness</span>
                <span className="value">{robotEffectiveness}%</span>
              </div>
              <div className="stat-row">
                <span>Total Deployed</span>
                <span className="value">{telemetry.totalRobotsDeployed}</span>
              </div>
              <hr />
              <div className="stat-row">
                <span>River Protection</span>
                <span className={`value ${protectionClass}`}>
                  {protectionStatus}
                </span>
              </div>
            </div>

            <div className="telemetry-card">
              <h4>Ecosystem Health</h4>
              <div className="health-bar">
                <div 
                  className="health-fill" 
                  style={{
                    width: `${healthScore}%`,
                    backgroundColor: healthColor
                  }}
                />
              </div>
              <div className="stat-row">
                <span>Status</span>
                <span className="value" style={{ color: healthColor }}>
                  {healthStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryPanel;