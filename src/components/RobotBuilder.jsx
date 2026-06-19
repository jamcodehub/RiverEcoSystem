import React, { useState, useEffect } from 'react';

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
    id: 'motor-eat',
    label: 'motor rotate (eat)',
    description: 'Capture and eat target',
    category: 'motor',
    code: '  > motor rotate (eat)',
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

const RobotBuilder = ({ onDeploy, onClose, robotPlans, setRobotPlans, activeRobotId, setActiveRobotId }) => {
  const [draggedBlock, setDraggedBlock] = useState(null);
  
  // Custom Touch Drag State for iPad Safari Support
  const [touchDragState, setTouchDragState] = useState(null);

  const robots = robotPlans;
  const setRobots = setRobotPlans;
  const activeRobot = robots.find(r => r.id === activeRobotId);
  
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'ipad-builder-fix';
    style.textContent = `
      @media (hover:none), (pointer:coarse) {
        .builder-container.fullscreen-layout {
          display:grid !important;
          grid-template-columns: 42% 58% !important;
          overflow:hidden !important;
        }
        .blocks-panel,
        .code-panel {
          overflow:hidden !important;
          -webkit-overflow-scrolling:auto !important;
          touch-action:none;
        }
        
        /* Compress the blocks panel slightly on iPad so they all fit on one screen without scrolling */
        .blocks-panel {
          padding: 10px 15px !important;
        }
        .category-title {
          margin: 6px 0 !important;
          font-size: 15px !important;
        }
        .block-button {
          padding: 8px 10px !important;
          margin-bottom: 5px !important;
          min-height: auto !important;
        }
        .block-label {
          font-size: 13px !important;
        }
        .block-desc {
          font-size: 11px !important;
          margin-top: 2px !important;
        }

        .block-button,
        .block-label,
        .block-desc,
        .code-workspace,
        .code-block-item {
          -webkit-user-select:none !important;
          user-select:none !important;
          -webkit-touch-callout:none !important;
        }
        .block-categories,
        .blocks-list {
          overflow:visible !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existing = document.getElementById('ipad-builder-fix');
      if (existing) existing.remove();
    };
  }, []);

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

  const handleAddBlock = (block, x = 20, y = 20) => {
    if (activeRobot) {
      updateRobotCode([...activeRobot.code, { ...block, children: [], x, y }]);
    }
  };

  const handleRemoveBlock = (index) => {
    if (activeRobot) {
      updateRobotCode(activeRobot.code.filter((_, i) => i !== index));
    }
  };

  const handleMoveBlock = (index, x, y) => {
    if (activeRobot) {
      const updated = [...activeRobot.code];
      updated[index] = { ...updated[index], x, y };
      updateRobotCode(updated);
    }
  };

  const handleAddChildBlock = (containerLocator, block) => {
    if (activeRobot) {
      const updated = [...activeRobot.code];
      let container;
      if (containerLocator.isTopLevel) {
        container = updated[containerLocator.index];
      } else {
        container = updated[containerLocator.parentIndex].children[containerLocator.childIndex];
      }
      if (!container.children) {
        container.children = [];
      }
      container.children.push({ ...block, children: [] });
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

  // --- STANDARD DESKTOP DRAG EVENTS ---
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
      if (draggedBlock.originalIndex === undefined) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        handleAddBlock(draggedBlock, x, y);
      }
      setDraggedBlock(null);
    }
  };

  const handleDropOnContainer = (e, containerLocator) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = 'transparent';
    e.currentTarget.style.backgroundColor = 'transparent';
    if (draggedBlock && activeRobot) {
      if (draggedBlock.originalIndex !== undefined && draggedBlock.originalIndex === containerLocator.index) {
        setDraggedBlock(null);
        return;
      }
      if (draggedBlock.originalIndex === undefined) {
        handleAddChildBlock(containerLocator, draggedBlock);
      }
      setDraggedBlock(null);
    }
  };

  const handleContainerDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.backgroundColor = 'rgba(78, 205, 196, 0.2)';
  };

  const handleContainerDragLeave = (e) => {
    e.currentTarget.style.backgroundColor = 'transparent';
  };

  // --- IPAD SAFARI TOUCH EVENTS ---
  const handleTouchStart = (e, block, source, originalIndex = null) => {
    const touch = e.touches[0];
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();

    setTouchDragState({
      block,
      source,
      originalIndex,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
      x: touch.clientX,
      y: touch.clientY,
    });
  };

  const handleGlobalTouchMove = (e) => {
    if (!touchDragState) return;
    const touch = e.touches[0];
    setTouchDragState(prev => ({
      ...prev,
      x: touch.clientX,
      y: touch.clientY
    }));
  };

  const handleGlobalTouchEnd = (e) => {
    if (!touchDragState) return;

    const { block, source, originalIndex, x, y } = touchDragState;
    
    // Find what is under the finger (ghost is pointer-events: none, so it won't block this)
    const dropTarget = document.elementFromPoint(x, y);
    
    if (dropTarget) {
      const containerDropZone = dropTarget.closest('.children-list');
      const workspace = dropTarget.closest('.code-workspace');

      if (containerDropZone) {
        const isTop = containerDropZone.dataset.istoplevel === 'true';
        const idx = parseInt(containerDropZone.dataset.index, 10);
        const pIdx = parseInt(containerDropZone.dataset.parentindex, 10);
        const cIdx = parseInt(containerDropZone.dataset.childindex, 10);
        
        const locator = isTop 
          ? { isTopLevel: true, index: idx } 
          : { isTopLevel: false, parentIndex: pIdx, childIndex: cIdx };
        
        if (source === 'workspace' && originalIndex === locator.index) {
            // Cannot drop a container into itself
        } else if (source === 'library') {
            handleAddChildBlock(locator, block);
        }
      } else if (workspace) {
        const rect = workspace.getBoundingClientRect();
        const relativeX = x - rect.left;
        const relativeY = y - rect.top;
        
        if (source === 'library') {
            handleAddBlock(block, relativeX, relativeY);
        } else if (source === 'workspace' && originalIndex !== null) {
            handleMoveBlock(originalIndex, relativeX, relativeY);
        }
      }
    }
    
    setTouchDragState(null);
  };

  const getBlockColor = (category) => {
    switch (category) {
      case 'sensor': return '#ff6b6b';
      case 'motor': return '#4ecdc4';
      case 'control': return '#ffe66d';
      default: return '#95a5a6';
    }
  };

  const renderCodeBlock = (block, index, parentIndex = null, childIndex = null) => {
    const isContainer = block.isContainer;
    const isTopLevel = parentIndex === null;
    
    return (
      <div
        key={`${parentIndex}-${index}`}
        className="code-block-wrapper"
        style={isTopLevel ? { position: 'absolute', left: `${block.x || 20}px`, top: `${block.y || 20}px` } : {}}
        draggable={isTopLevel}
        onDragStart={(e) => {
          if (isTopLevel) {
            e.dataTransfer.effectAllowed = 'move';
            setDraggedBlock({ ...block, originalIndex: index });
          }
        }}
        onDragEnd={(e) => {
          if (isTopLevel && e.dataTransfer.dropEffect === 'move') {
            const codespace = document.querySelector('.code-workspace');
            if (codespace) {
              const rect = codespace.getBoundingClientRect();
              const x = Math.max(0, e.clientX - rect.left);
              const y = Math.max(0, e.clientY - rect.top);
              handleMoveBlock(index, x, y);
            }
          }
        }}
        // iPad Touch Support
        onTouchStart={(e) => {
          if (isTopLevel) handleTouchStart(e, block, 'workspace', index);
        }}
      >
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
            // Prevent touch drag from firing when tapping remove
            onTouchStart={(e) => e.stopPropagation()} 
          >
            ✕
          </button>
        </div>
        
        {isContainer && (
          <div className="container-body">
            <div
              className="children-list"
              // Data attributes used by touch detection
              data-istoplevel={isTopLevel}
              data-index={index}
              data-parentindex={parentIndex !== null ? parentIndex : ""}
              data-childindex={childIndex !== null ? childIndex : ""}
              onDragOver={handleContainerDragOver}
              onDragLeave={handleContainerDragLeave}
              onDrop={(e) => {
                const containerLocator = isTopLevel
                  ? { isTopLevel: true, index }
                  : { isTopLevel: false, parentIndex, childIndex };
                handleDropOnContainer(e, containerLocator);
              }}
            >
              {block.children && block.children.length > 0 && (
                block.children.map((child, cIdx) => renderCodeBlock(child, cIdx + 1, parentIndex !== null ? parentIndex : index, cIdx))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      // Attach global touch move/end to handle dragging outside element bounds
      onTouchMove={handleGlobalTouchMove}
      onTouchEnd={handleGlobalTouchEnd}
      onTouchCancel={handleGlobalTouchEnd}
    >
      {/* GHOST ELEMENT FOR IPAD TOUCH DRAGGING */}
      {touchDragState && (
        <div 
          style={{
            position: 'fixed',
            left: `${touchDragState.x - touchDragState.offsetX}px`,
            top: `${touchDragState.y - touchDragState.offsetY}px`,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}
        >
          <div 
            className={`block-button ${touchDragState.block.category}-block`} 
            style={{ 
              margin: 0,
              padding: '12px',
              background: 'white',
              border: `2px solid ${getBlockColor(touchDragState.block.category)}`,
              borderRadius: '8px',
              fontWeight: 'bold',
              color: '#333'
            }}
          >
            {touchDragState.block.label}
          </div>
        </div>
      )}

      <div className="robot-builder-modal fullscreen-builder" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 Robot Builder</h2>
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
                      onTouchStart={(e) => handleTouchStart(e, block, 'library')}
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
                      onTouchStart={(e) => handleTouchStart(e, block, 'library')}
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
                      onTouchStart={(e) => handleTouchStart(e, block, 'library')}
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
              {activeRobot && activeRobot.code.length === 0 && (
                <div className="empty-workspace">
                  <p>Drag blocks from the left to build your robot's program</p>
                </div>
              )}
              {activeRobot && activeRobot.code.map((block, index) => renderCodeBlock(block, index))}
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