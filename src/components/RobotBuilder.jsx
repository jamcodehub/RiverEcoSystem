import React, { useState, useEffect, useRef } from 'react';

// A quick tap-and-drag on a block should scroll the list like any other
// touch surface. Only a brief hold (no real finger movement) picks the
// block up for dragging - this mirrors how Scratch/Blockly-style block
// editors resolve the "scroll vs. drag" ambiguity on touch screens.
const LONG_PRESS_MS = 150;
const MOVE_CANCEL_PX = 10;

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

  // Custom Touch Drag State for iPad Safari Support (drives the ghost block UI)
  const [touchDragState, setTouchDragState] = useState(null);

  // Mutable, non-rendering copy of the touch gesture in progress. Using a
  // ref (rather than only the state above) lets the native touchmove/touchend
  // listeners below read the latest position without being recreated on
  // every frame, and lets us tell a scroll apart from a drag before any
  // re-render happens.
  const touchStateRef = useRef(null);
  const modalRef = useRef(null);

  const robots = robotPlans;
  const setRobots = setRobotPlans;
  const activeRobot = robots.find(r => r.id === activeRobotId);

  // Native (non-passive) touch listeners so preventDefault() reliably takes
  // over the gesture once a block is actually picked up - React's synthetic
  // touch handlers aren't guaranteed non-passive, so calling preventDefault
  // there can silently no-op on some browsers/versions.
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    const onTouchMoveNative = (e) => {
      const st = touchStateRef.current;
      if (!st) return;
      const touch = e.touches[0];
      if (!touch) return;

      if (!st.dragging) {
        const dx = Math.abs(touch.clientX - st.startX);
        const dy = Math.abs(touch.clientY - st.startY);
        if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
          // The finger moved before the long-press fired - this is a scroll,
          // not a drag. Cancel the pending pickup and let the browser scroll.
          clearTimeout(st.timer);
          touchStateRef.current = null;
        }
        return;
      }

      // A block is actively being dragged - take over the gesture so the
      // page doesn't scroll underneath it.
      e.preventDefault();
      st.x = touch.clientX;
      st.y = touch.clientY;
      setTouchDragState(prev => (prev ? { ...prev, x: touch.clientX, y: touch.clientY } : prev));
    };

    const onTouchEndNative = () => {
      resolveTouchDrop();
    };

    el.addEventListener('touchmove', onTouchMoveNative, { passive: false });
    el.addEventListener('touchend', onTouchEndNative, { passive: true });
    el.addEventListener('touchcancel', onTouchEndNative, { passive: true });

    return () => {
      el.removeEventListener('touchmove', onTouchMoveNative);
      el.removeEventListener('touchend', onTouchEndNative);
      el.removeEventListener('touchcancel', onTouchEndNative);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // Starting a touch never immediately grabs the block - that would fight
  // with finger-scrolling. Instead we arm a short timer; if the finger is
  // still roughly in place when it fires, the block is picked up. If the
  // finger moves first (see onTouchMoveNative above), it's treated as a
  // normal scroll and the timer is cancelled.
  const handleTouchStart = (e, block, source, originalIndex = null) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();

    if (touchStateRef.current?.timer) {
      clearTimeout(touchStateRef.current.timer);
    }

    const startX = touch.clientX;
    const startY = touch.clientY;
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    const timer = setTimeout(() => {
      if (!touchStateRef.current) return;
      touchStateRef.current.dragging = true;
      setTouchDragState({
        block,
        source,
        originalIndex,
        offsetX,
        offsetY,
        x: startX,
        y: startY,
      });
    }, LONG_PRESS_MS);

    touchStateRef.current = {
      block,
      source,
      originalIndex,
      startX,
      startY,
      offsetX,
      offsetY,
      x: startX,
      y: startY,
      dragging: false,
      timer,
    };
  };

  const resolveTouchDrop = () => {
    const st = touchStateRef.current;
    if (!st) return;

    if (st.timer) clearTimeout(st.timer);

    if (st.dragging) {
      const { block, source, originalIndex, x, y } = st;

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
    }

    touchStateRef.current = null;
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
            &times;
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
      ref={modalRef}
      className="modal-overlay"
      onClick={onClose}
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
        <div className="modal-header" style={{ padding: '10px 20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Robot Builder</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Robot Tabs & Colors Compressed */}
        <div className="robot-tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #eee' }}>
          <div className="tabs-container" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            {robots.map(robot => (
              <div
                key={robot.id}
                className={`robot-tab ${activeRobotId === robot.id ? 'active' : ''}`}
                style={{
                  backgroundColor: activeRobotId === robot.id ? robot.color : 'transparent',
                  borderColor: robot.color,
                  marginBottom: 0
                }}
              >
                <button
                  className="tab-button"
                  onClick={() => setActiveRobotId(robot.id)}
                  style={{ color: activeRobotId === robot.id ? '#fff' : robot.color }}
                >
                  {robot.name}
                </button>
                {robots.length > 1 && (
                  <button
                    className="tab-delete"
                    onClick={() => deleteRobot(robot.id)}
                    title="Delete this robot"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button className="btn-new-robot" style={{ marginBottom: 0 }} onClick={createNewRobot} title="Create new robot">
              + New
            </button>
          </div>
          
          {activeRobot && (
            <div className="robot-settings" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <label style={{ margin: 0, fontSize: '14px' }}>Color:</label>
              <div className="color-picker" style={{ gap: '4px' }}>
                {ROBOT_COLORS.slice(0, 5).map(color => (
                  <button
                    key={color}
                    className="color-option"
                    style={{
                      width: '20px', height: '20px',
                      backgroundColor: color,
                      border: activeRobot.color === color ? '2px solid #333' : '1px solid #ddd'
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
            {/* Removed the "Blocks Library" header and description to save vertical space */}
            
            <div className="block-categories">
              {/* Sensor Blocks */}
              <div className="block-category">
                <h4 className="category-title" style={{ color: '#ff6b6b' }}>
                  Sensors
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
                      {/* block-desc is visually hidden on mobile via the injected CSS */}
                      <div className="block-desc">{block.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Motor Blocks */}
              <div className="block-category">
                <h4 className="category-title" style={{ color: '#4ecdc4' }}>
                  Motors
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
                  Control
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
            {/* Added inline style to compact header spacing */}
            <h3 style={{ margin: '10px 0', fontSize: '16px' }}>Your Robot Code</h3>

            <div
              className="code-workspace"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {activeRobot && activeRobot.code.length === 0 && (
                <div className="empty-workspace">
                  <p>Drag blocks from the left to build your program</p>
                </div>
              )}
              {activeRobot && activeRobot.code.map((block, index) => renderCodeBlock(block, index))}
            </div>

            {/* Action Buttons */}
            <div className="builder-actions" style={{ padding: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={handleClearCode}
                disabled={!activeRobot || activeRobot.code.length === 0}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDeploy}
                disabled={!activeRobot || activeRobot.code.length === 0}
                style={{ backgroundColor: activeRobot ? activeRobot.color : '#4ECDC4' }}
              >
                Deploy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotBuilder;
