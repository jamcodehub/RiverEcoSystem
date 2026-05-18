import React, { useState } from 'react';

const AVAILABLE_BLOCKS = [
  {
    id: 'sensor-mosquito',
    label: 'if sensor < mosquito_fish >',
    description: 'Detect mosquito fish nearby',
    category: 'sensor',
    code: 'if sensor <mosquito_fish>:',
  },
  {
    id: 'motor-trap',
    label: 'motor rotate (trap)',
    description: 'Capture and trap target',
    category: 'motor',
    code: '  > motor rotate (trap)',
  },
  {
    id: 'motor-kill',
    label: 'motor rotate (kill)',
    description: 'Eliminate threat directly',
    category: 'motor',
    code: '  > motor rotate (kill)',
  },
  {
    id: 'wait',
    label: 'wait (0.5 seconds)',
    description: 'Pause before next action',
    category: 'control',
    code: '  > wait (0.5)',
  },
  {
    id: 'loop',
    label: 'repeat forever',
    description: 'Run continuously',
    category: 'control',
    code: 'repeat forever:',
  },
];

const RobotBuilder = ({ onDeploy, onClose, selectedCode, setSelectedCode }) => {
  const [draggedBlock, setDraggedBlock] = useState(null);

  const handleAddBlock = (block) => {
    setSelectedCode([...selectedCode, block]);
  };

  const handleRemoveBlock = (index) => {
    setSelectedCode(selectedCode.filter((_, i) => i !== index));
  };

  const handleClearCode = () => {
    setSelectedCode([]);
  };

  const handleDeploy = () => {
    onDeploy(selectedCode.map(b => b.code));
  };

  const getBlockColor = (category) => {
    switch (category) {
      case 'sensor':
        return '#ff6b6b';
      case 'motor':
        return '#4ecdc4';
      case 'control':
        return '#ffe66d';
      default:
        return '#95a5a6';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="robot-builder-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 Robot Builder (Spike Prime Style)</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="builder-container">
          {/* LEFT: Available Blocks */}
          <div className="blocks-panel">
            <h3>Blocks Library</h3>
            <p className="panel-description">Click a block to add it to your code</p>

            <div className="block-categories">
              {/* Sensor Blocks */}
              <div className="block-category">
                <h4 className="category-title" style={{ color: '#ff6b6b' }}>
                  🎯 Sensors
                </h4>
                <div className="blocks-list">
                  {AVAILABLE_BLOCKS.filter(b => b.category === 'sensor').map(block => (
                    <button
                      key={block.id}
                      className="block-button sensor-block"
                      onClick={() => handleAddBlock(block)}
                      title={block.description}
                    >
                      <div className="block-label">{block.label}</div>
                      <div className="block-desc">{block.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Motor Blocks */}
              <div className="block-category">
                <h4 className="category-title" style={{ color: '#4ecdc4' }}>
                  ⚙️ Motors
                </h4>
                <div className="blocks-list">
                  {AVAILABLE_BLOCKS.filter(b => b.category === 'motor').map(block => (
                    <button
                      key={block.id}
                      className="block-button motor-block"
                      onClick={() => handleAddBlock(block)}
                      title={block.description}
                    >
                      <div className="block-label">{block.label}</div>
                      <div className="block-desc">{block.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Control Blocks */}
              <div className="block-category">
                <h4 className="category-title" style={{ color: '#ffe66d' }}>
                  🔄 Control
                </h4>
                <div className="blocks-list">
                  {AVAILABLE_BLOCKS.filter(b => b.category === 'control').map(block => (
                    <button
                      key={block.id}
                      className="block-button control-block"
                      onClick={() => handleAddBlock(block)}
                      title={block.description}
                    >
                      <div className="block-label">{block.label}</div>
                      <div className="block-desc">{block.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Code Workspace */}
          <div className="code-panel">
            <h3>Your Robot Code</h3>

            <div className="code-workspace">
              {selectedCode.length === 0 ? (
                <div className="empty-workspace">
                  <p>Click blocks on the left to build your robot's program</p>
                </div>
              ) : (
                <div className="code-blocks-display">
                  {selectedCode.map((block, index) => (
                    <div
                      key={index}
                      className={`code-block-item category-${block.category}`}
                      style={{ borderLeftColor: getBlockColor(block.category) }}
                    >
                      <span className="block-index">{index + 1}</span>
                      <span className="block-content">{block.label}</span>
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveBlock(index)}
                        title="Remove this block"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Code Preview */}
            <div className="code-preview">
              <h4>Python Preview:</h4>
              <pre>
                {selectedCode.length === 0 ? (
                  'No code yet...'
                ) : (
                  selectedCode.map(b => b.code).join('\n')
                )}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="builder-actions">
              <button
                className="btn btn-secondary"
                onClick={handleClearCode}
                disabled={selectedCode.length === 0}
              >
                Clear Code
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDeploy}
                disabled={selectedCode.length === 0}
              >
                Deploy Robot
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="builder-tips">
          <h4>💡 Pro Tips:</h4>
          <ul>
            <li>Start with a <strong>sensor</strong> to detect mosquito fish</li>
            <li>Follow with a <strong>motor</strong> to trap or eliminate them</li>
            <li>Use <strong>control</strong> blocks to repeat actions</li>
            <li>Deploy multiple robots with different strategies</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RobotBuilder;
