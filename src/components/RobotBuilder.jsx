import React, { useState } from 'react';

const AVAILABLE_BLOCKS = [
  {
    id: 'sensor-mosquito',
    label: 'if sensor < mosquito_fish >',
    description: 'Detect mosquito fish nearby',
    category: 'sensor',
    code: 'if sensor <mosquito_fish>:',
    canContain: ['motor', 'control', 'wait'],
    isContainer: true,
  },
  {
    id: 'motor-swim',
    label: 'motor rotate (swim)',
    description: 'Swim forward automatically',
    category: 'motor',
    code: '  > motor rotate (swim)',
    isAction: true,
  },
  {
    id: 'motor-trap',
    label: 'motor rotate (trap)',
    description: 'Capture and trap target',
    category: 'motor',
    code: '  > motor rotate (trap)',
    isAction: true,
  },
  {
    id: 'motor-kill',
    label: 'motor rotate (kill)',
    description: 'Eliminate threat directly',
    category: 'motor',
    code: '  > motor rotate (kill)',
    isAction: true,
  },
  {
    id: 'wait',
    label: 'wait (0.5 seconds)',
    description: 'Pause before next action',
    category: 'control',
    code: '  > wait (0.5)',
    isAction: true,
  },
  {
    id: 'loop-forever',
    label: 'repeat forever',
    description: 'Run continuously',
    category: 'control',
    code: 'repeat forever:',
    canContain: ['sensor', 'motor', 'control', 'wait'],
    isContainer: true,
  },
  {
    id: 'loop-times',
    label: 'repeat 3 times',
    description: 'Repeat actions 3 times',
    category: 'control',
    code: 'repeat 3 times:',
    canContain: ['motor', 'control', 'wait'],
    isContainer: true,
  },
];

const ROBOT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181',
  '#AA96DA', '#FCBAD3', '#A8D8EA', '#FFA07A', '#98D8C8'
];

const RobotBuilder = ({ onDeploy, onClose, selectedCode, setSelectedCode }) => {
  const [robots, setRobots] = useState([
    { id: 1, name: 'Robot 1', code: [], color: ROBOT_COLORS[0] }
  ]);
  const [activeRobotId, setActiveRobotId] = useState(1);
  const [draggedBlock, setDraggedBlock] = useState(null);

  const activeRobot = robots.find(r => r.id === activeRobotId);

  const createNewRobot = () => {
    const newId = Math.max(...robots.map(r => r.id), 0) + 1;
    const newRobot = {
      id: newId,
      name: `Robot ${robots.length + 1}`,
      code: [],
      color: ROBOT_COLORS[robots.length % ROBOT_COLORS.length]
    };
    setRobots([...robots, newRobot]);
    setActiveRobotId(newId);
  };

  const deleteRobot = (id) => {
    if (robots.length === 1) {
      alert('You must have at least one robot!');
      return;
    }
    const updated = robots.filter(r => r.id !== id);
    setRobots(updated);
    setActiveRobotId(updated[0].id);
  };

  const updateRobotCode = (code) => {
    setRobots(robots.map(r => 
      r.id === activeRobotId ? { ...r, code } : r
    ));
  };

  const updateRobotColor = (color) => {
    setRobots(robots.map(r => 
      r.id === activeRobotId ? { ...r, color } : r
    ));
  };

  const handleAddBlock = (block) => {
    if (activeRobot) {
      updateRobotCode([...activeRobot.code, { ...block, children: [] }]);
    }
  };

  const handleRemoveBlock = (index) => {
    if (activeRobot) {
      updateRobotCode(activeRobot.code.filter((_, i) => i !== index));
    }
  };

  const handleAddChildBlock = (parentIndex, block) => {
    if (activeRobot) {
      const updated = [...activeRobot.code];
      if (!updated[parentIndex].children) {
        updated[parentIndex].children = [];
      }
      updated[parentIndex].children.push({ ...block, children: [] });
      updateRobotCode(updated);
    }
  };

  const handleRemoveChildBlock = (parentIndex, childIndex) => {
    if (activeRobot) {
      const updated = [...activeRobot.code];
      updated[parentIndex].children.splice(childIndex, 1);
      updateRobotCode(updated);
    }
  };

  const handleClearCode = () => {
    updateRobotCode([]);
  };

  const generatePython = (blocks, indent = 0) => {
    let code = '';
    blocks.forEach(block => {
      code += '  '.repeat(indent) + block.code + '\n';
      if (block.children && block.children.length > 0) {
        code += generatePython(block.children, indent + 1);
      }
    });
    return code;
  };

  const handleDeploy = () => {
    if (!activeRobot) return;
    const pythonCode = generatePython(activeRobot.code);
    onDeploy(pythonCode.split('\n').filter(l => l.trim()), activeRobot.color);
  };

  const handleDragStart = (e, block) => {
    setDraggedBlock(block);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#4ECDC4';
    e.currentTarget.style.backgroundColor = 'rgba(78, 205, 196, 0.1)';
  };

  const handleDragLeave = (e) => {
    e.currentTarget.style.borderColor = 'transparent';
    e.currentTarget.style.backgroundColor = 'transparent';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'transparent';
    e.currentTarget.style.backgroundColor = 'transparent';
    if (draggedBlock) {
      handleAddBlock(draggedBlock);
      setDraggedBlock(null);
    }
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

  const renderCodeBlock = (block, index, parentIndex = null, childIndex = null) => {
    const isContainer = block.isContainer;
    
    return (
      <div key={`${parentIndex}-${index}`} className="code-block-wrapper">
        <div
          className={`code-block-item category-${block.category} ${isContainer ? 'container-block' : ''}`}
          style={{ borderLeftColor: getBlockColor(block.category) }}
        >
          <span className="block-index">{index + 1}</span>
          <span className="block-content">{block.label}</span>
          <button
            className="remove-btn"
            onClick={() => parentIndex !== null 
              ? handleRemoveChildBlock(parentIndex, childIndex)
              : handleRemoveBlock(index)
            }
            title="Remove this block"
          >
            ✕
          </button>
        </div>
        
        {isContainer && (
          <div className="container-body">
            <div className="children-list">
              {block.children && block.children.length > 0 ? (
                block.children.map((child, cIdx) => renderCodeBlock(child, cIdx + 1, index, cIdx))
              ) : (
                <div className="empty-container">Click blocks to add inside</div>
              )}
            </div>
            <div className="container-actions">
              {block.canContain && AVAILABLE_BLOCKS
                .filter(b => block.canContain.includes(b.category))
                .slice(0, 3)
                .map(availBlock => (
                  <button
                    key={availBlock.id}
                    className="mini-add-btn"
                    onClick={() => handleAddChildBlock(index, availBlock)}
                    title={`Add ${availBlock.label}`}
                  >
                    + {availBlock.label}
                  </button>
                ))
              }
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="robot-builder-modal fullscreen-builder" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 Robot Builder (Spike Prime Style)</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Robot Tabs */}
        <div className="robot-tabs">
          <div className="tabs-container">
            {robots.map(robot => (
              <div
                key={robot.id}
                className={`robot-tab ${activeRobotId === robot.id ? 'active' : ''}`}
                style={{
                  backgroundColor: activeRobotId === robot.id ? robot.color : 'transparent',
                  borderColor: robot.color
                }}
              >
                <button
                  className="tab-button"
                  onClick={() => setActiveRobotId(robot.id)}
                  style={{
                    color: activeRobotId === robot.id ? '#fff' : robot.color
                  }}
                >
                  {robot.name}
                </button>
                {robots.length > 1 && (
                  <button
                    className="tab-delete"
                    onClick={() => deleteRobot(robot.id)}
                    title="Delete this robot"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button className="btn-new-robot" onClick={createNewRobot} title="Create new robot">
              + New Robot
            </button>
          </div>
          
          {activeRobot && (
            <div className="robot-settings">
              <label>Robot Color:</label>
              <div className="color-picker">
                {ROBOT_COLORS.map(color => (
                  <button
                    key={color}
                    className="color-option"
                    style={{
                      backgroundColor: color,
                      border: activeRobot.color === color ? '3px solid #333' : '2px solid #ddd'
                    }}
                    onClick={() => updateRobotColor(color)}
                    title={`Set to ${color}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="builder-container fullscreen-layout">
          {/* LEFT: Available Blocks */}
          <div className="blocks-panel">
            <h3>Blocks Library</h3>
            <p className="panel-description">Drag blocks to the code space</p>

            <div className="block-categories">
              {/* Sensor Blocks */}
              <div className="block-category">
                <h4 className="category-title" style={{ color: '#ff6b6b' }}>
                  🎯 Sensors
                </h4>
                <div className="blocks-list">
                  {AVAILABLE_BLOCKS.filter(b => b.category === 'sensor').map(block => (
                    <div
                      key={block.id}
                      className="block-button sensor-block"
                      draggable
                      onDragStart={(e) => handleDragStart(e, block)}
                      title={block.description}
                    >
                      <div className="block-label">{block.label}</div>
                      <div className="block-desc">{block.description}</div>
                    </div>
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
                    <div
                      key={block.id}
                      className="block-button motor-block"
                      draggable
                      onDragStart={(e) => handleDragStart(e, block)}
                      title={block.description}
                    >
                      <div className="block-label">{block.label}</div>
                      <div className="block-desc">{block.description}</div>
                    </div>
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
                    <div
                      key={block.id}
                      className="block-button control-block"
                      draggable
                      onDragStart={(e) => handleDragStart(e, block)}
                      title={block.description}
                    >
                      <div className="block-label">{block.label}</div>
                      <div className="block-desc">{block.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Code Workspace */}
          <div className="code-panel">
            <h3>Your Robot Code</h3>

            <div
              className="code-workspace"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {activeRobot && activeRobot.code.length === 0 ? (
                <div className="empty-workspace">
                  <p>Drag blocks from the left to build your robot's program</p>
                </div>
              ) : (
                <div className="code-blocks-display">
                  {activeRobot && activeRobot.code.map((block, index) => renderCodeBlock(block, index + 1))}
                </div>
              )}
            </div>

            {/* Code Preview */}
            <div className="code-preview">
              <h4>Python Preview:</h4>
              <pre>
                {activeRobot && activeRobot.code.length === 0 ? (
                  'No code yet...'
                ) : (
                  activeRobot && generatePython(activeRobot.code).trim()
                )}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="builder-actions">
              <button
                className="btn btn-secondary"
                onClick={handleClearCode}
                disabled={!activeRobot || activeRobot.code.length === 0}
              >
                Clear Code
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDeploy}
                disabled={!activeRobot || activeRobot.code.length === 0}
                style={{ backgroundColor: activeRobot ? activeRobot.color : '#4ECDC4' }}
              >
                Deploy Robot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotBuilder;
