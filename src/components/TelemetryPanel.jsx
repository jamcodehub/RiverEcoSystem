import React from 'react';

const TelemetryPanel = ({ onClose, telemetry, stats }) => {
  const totalLives = stats.frogs + stats.fish + stats.eggs + stats.mosquito;
  
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
    ? ((telemetry.mosquitoesKilledByRobots / (telemetry.mosquitoesKilledByRobots + stats.mosquito)) * 100).toFixed(1)
    : '0';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="telemetry-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 River Telemetry Dashboard</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="telemetry-content">
          <div className="telemetry-section">
            <h3>⏱️ Simulation Time</h3>
            <div className="big-stat">{formatTime(telemetry.gameTime)}</div>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-card">
              <h4>🌍 Population Overview</h4>
              <div className="stat-row">
                <span>Frogs</span>
                <span className="value">{stats.frogs}</span>
                <span className="percentage">{getPercentage(stats.frogs, totalLives)}</span>
              </div>
              <div className="stat-row">
                <span>Fish</span>
                <span className="value">{stats.fish}</span>
                <span className="percentage">{getPercentage(stats.fish, totalLives)}</span>
              </div>
              <div className="stat-row">
                <span>Eggs</span>
                <span className="value">{stats.eggs}</span>
                <span className="percentage">{getPercentage(stats.eggs, totalLives)}</span>
              </div>
              <div className="stat-row">
                <span>Mosquito Fish</span>
                <span className="value">{stats.mosquito}</span>
                <span className="percentage">{getPercentage(stats.mosquito, totalLives)}</span>
              </div>
              <hr />
              <div className="stat-row bold">
                <span>Total Life</span>
                <span className="value">{totalLives}</span>
              </div>
            </div>

            <div className="telemetry-card">
              <h4>⚔️ Predation Stats</h4>
              <div className="stat-row">
                <span>Native Species Killed</span>
                <span className="value danger">{telemetry.nativeSpeciesKilled}</span>
              </div>
              <div className="stat-row">
                <span>Mosquitoes Eliminated</span>
                <span className="value success">{telemetry.mosquitoesKilledByRobots}</span>
              </div>
              <div className="stat-row">
                <span>Net Loss (Native)</span>
                <span className="value danger">{telemetry.nativeSpeciesKilled}</span>
              </div>
              <hr />
              <div className="stat-row">
                <span>Frogs Born</span>
                <span className="value">{telemetry.frogsHatched}</span>
              </div>
            </div>

            <div className="telemetry-card">
              <h4>🤖 Robot Performance</h4>
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
                <span className={`value ${robotEffectiveness > 50 ? 'success' : 'danger'}`}>
                  {robotEffectiveness > 50 ? '✓ Active' : '✗ Struggling'}
                </span>
              </div>
            </div>

            <div className="telemetry-card">
              <h4>📈 Ecosystem Health</h4>
              <div className="health-bar">
                <div 
                  className="health-fill" 
                  style={{
                    width: `${Math.max(0, (totalLives / 15) * 100)}%`,
                    backgroundColor: totalLives > 10 ? '#2ecc71' : totalLives > 5 ? '#f39c12' : '#e74c3c'
                  }}
                />
              </div>
              <div className="stat-row">
                <span>Status</span>
                <span className={`value ${totalLives > 10 ? 'success' : totalLives > 5 ? 'warning' : 'danger'}`}>
                  {totalLives > 10 ? '🟢 Thriving' : totalLives > 5 ? '🟡 Stable' : '🔴 Critical'}
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
