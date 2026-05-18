import React from 'react';

const StatsPanel = ({ stats }) => {
  return (
    <div className="stats-panel">
      <h1>🌊 Werribee River Ecosystem Simulator</h1>
      <div className="stats-grid">
        <div className="stat-item frog-stat">
          <span className="stat-icon">🐸</span>
          <div className="stat-info">
            <span className="stat-label">Frogs</span>
            <span className="stat-value">{stats.frogs}</span>
          </div>
        </div>

        <div className="stat-item fish-stat">
          <span className="stat-icon">🐟</span>
          <div className="stat-info">
            <span className="stat-label">Fish</span>
            <span className="stat-value">{stats.fish}</span>
          </div>
        </div>

        <div className="stat-item egg-stat">
          <span className="stat-icon">🥚</span>
          <div className="stat-info">
            <span className="stat-label">Eggs</span>
            <span className="stat-value">{stats.eggs}</span>
          </div>
        </div>

        <div className="stat-item mosquito-stat">
          <span className="stat-icon">🦟</span>
          <div className="stat-info">
            <span className="stat-label">Mosquito Fish</span>
            <span className="stat-value">{stats.mosquito}</span>
          </div>
        </div>

        <div className="stat-item robot-stat">
          <span className="stat-icon">🤖</span>
          <div className="stat-info">
            <span className="stat-label">Robots</span>
            <span className="stat-value">{stats.robots}</span>
          </div>
        </div>

        <div className="stat-item total-stat">
          <span className="stat-icon">📊</span>
          <div className="stat-info">
            <span className="stat-label">Total Life</span>
            <span className="stat-value">{stats.frogs + stats.fish + stats.eggs + stats.mosquito}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
