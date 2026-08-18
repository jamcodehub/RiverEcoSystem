import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// Block definitions
// ============================================================================
const AVAILABLE_BLOCKS = [
  {
    id: 'sensor-mosquito',
    label: 'if sensor < mosquito_fish >',
    description: 'Detect mosquito fish nearby',
    category: 'sensor',
    code: 'if sensor <mosquito_fish>:',
    canContain: ['motor', 'control'],
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
    canContain: ['sensor', 'motor', 'control'],
    isContainer: true,
  },
  {
    id: 'loop-times',
    label: 'repeat 3 times',
    description: 'Repeat actions 3 times',
    category: 'control',
    code: 'repeat 3 times:',
    canContain: ['motor', 'control'],
    isContainer: true,
  },
];

const ROBOT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181',
  '#AA96DA', '#FCBAD3', '#A8D8EA', '#FFA07A', '#98D8C8'
];

// ============================================================================
// Pure tree helpers - the whole program is a tree of block instances.
// Every instance gets a stable instanceId when it's created, so blocks can be
// found/removed/inserted anywhere in the tree without relying on brittle
// (parentIndex, childIndex) coordinates that only worked one level deep.
// ============================================================================
let uidCounter = 0;
const genId = () => `blk_${Date.now().toString(36)}_${(uidCounter++).toString(36)}`;

const createInstance = (blockDef) => ({
  ...blockDef,
  instanceId: genId(),
  ...(blockDef.isContainer ? { children: [] } : {}),
});

const findNode = (nodes, id) => {
  for (const n of nodes) {
    if (n.instanceId === id) return n;
    if (n.children) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Where a node currently lives: { parentId, index } (parentId null = top level)
const findLocation = (nodes, id, parentId = null) => {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.instanceId === id) return { parentId, index: i };
    if (n.children) {
      const found = findLocation(n.children, id, n.instanceId);
      if (found) return found;
    }
  }
  return null;
};

// Does `node`'s subtree contain a descendant with this instanceId?
const containsDescendant = (node, id) => {
  if (!node.children) return false;
  for (const child of node.children) {
    if (child.instanceId === id || containsDescendant(child, id)) return true;
  }
  return false;
};

// Returns [newTree, removedNode]
const removeNode = (nodes, id) => {
  let removed = null;
  const result = [];
  for (const n of nodes) {
    if (n.instanceId === id) {
      removed = n;
      continue;
    }
    if (n.children) {
      const [newChildren, childRemoved] = removeNode(n.children, id);
      if (childRemoved) removed = childRemoved;
      result.push({ ...n, children: newChildren });
    } else {
      result.push(n);
    }
  }
  return [result, removed];
};

// Insert `node` into the list under `containerId` (null = top level) at `index`.
const insertNode = (nodes, containerId, index, node) => {
  if (containerId === null) {
    const copy = [...nodes];
    copy.splice(Math.max(0, Math.min(index, copy.length)), 0, node);
    return copy;
  }
  return nodes.map(n => {
    if (n.instanceId === containerId) {
      const children = [...(n.children || [])];
      children.splice(Math.max(0, Math.min(index, children.length)), 0, node);
      return { ...n, children };
    }
    if (n.children) {
      return { ...n, children: insertNode(n.children, containerId, index, node) };
    }
    return n;
  });
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

const getBlockColor = (category) => {
  switch (category) {
    case 'sensor': return '#ff6b6b';
    case 'motor': return '#4ecdc4';
    case 'control': return '#ffe66d';
    default: return '#95a5a6';
  }
};

const RobotBuilder = ({ onDeploy, onClose, robotPlans, setRobotPlans, activeRobotId, setActiveRobotId }) => {
  const robots = robotPlans;
  const setRobots = setRobotPlans;
  const activeRobot = robots.find(r => r.id === activeRobotId);

  // What's currently being dragged (mouse or touch):
  //   { kind: 'new', blockDef }              - a fresh block from the library
  //   { kind: 'move', instanceId }           - an existing block being relocated
  const [dragPayload, setDragPayload] = useState(null);
  const [hoveredSlotKey, setHoveredSlotKey] = useState(null);
  // Floating preview shown under the finger while touch-dragging.
  const [touchGhost, setTouchGhost] = useState(null);

  const touchDragRef = useRef(null); // { payload, offsetX, offsetY, x, y }
  const modalRef = useRef(null);

  // Kept in a ref so the native (mount-once) touch listeners below always act
  // on whichever robot is active right now, not whichever was active when
  // they were first attached.
  const activeRobotIdRef = useRef(activeRobotId);
  useEffect(() => {
    activeRobotIdRef.current = activeRobotId;
  }, [activeRobotId]);

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

  const updateRobotColor = (color) => {
    setRobots(robots.map(r =>
      r.id === activeRobotId ? { ...r, color } : r
    ));
  };

  const handleClearCode = () => {
    setRobots(current => current.map(r =>
      r.id === activeRobotIdRef.current ? { ...r, code: [] } : r
    ));
  };

  const handleRemoveNode = (instanceId) => {
    setRobots(current => current.map(r => {
      if (r.id !== activeRobotIdRef.current) return r;
      const [newTree] = removeNode(r.code, instanceId);
      return { ...r, code: newTree };
    }));
  };

  // The single source of truth for "drop this thing at this spot". Reads the
  // active robot fresh via the ref and writes with a functional update, so
  // it stays correct even when called from a touch listener that was
  // attached long before this specific drop happened.
  const performDrop = (containerId, index, payload) => {
    if (!payload) return;

    setRobots(current => current.map(r => {
      if (r.id !== activeRobotIdRef.current) return r;

      let tree = r.code;
      let nodeToInsert;
      let targetIndex = index;

      if (payload.kind === 'move') {
        const { instanceId } = payload;
        if (instanceId === containerId) return r; // dropped onto itself

        const original = findNode(tree, instanceId);
        if (!original) return r;

        // Can't drop a container into its own descendant.
        if (containerId !== null && containsDescendant(original, containerId)) {
          return r;
        }

        // Does the target container accept this category of block?
        if (containerId !== null) {
          const containerNode = findNode(tree, containerId);
          if (!containerNode || !containerNode.canContain ||
              !containerNode.canContain.includes(original.category)) {
            return r;
          }
        }

        const loc = findLocation(tree, instanceId);
        const [treeAfterRemoval, removed] = removeNode(tree, instanceId);
        if (!removed) return r;
        tree = treeAfterRemoval;
        nodeToInsert = removed;

        // Removing an earlier sibling from the same list shifts everything
        // after it back by one - correct the target index to compensate.
        if (loc && loc.parentId === containerId && loc.index < index) {
          targetIndex = index - 1;
        }
      } else if (payload.kind === 'new') {
        if (containerId !== null) {
          const containerNode = findNode(tree, containerId);
          if (!containerNode || !containerNode.canContain ||
              !containerNode.canContain.includes(payload.blockDef.category)) {
            return r;
          }
        }
        nodeToInsert = createInstance(payload.blockDef);
      } else {
        return r;
      }

      const newTree = insertNode(tree, containerId, targetIndex, nodeToInsert);
      return { ...r, code: newTree };
    }));
  };

  const handleDeploy = () => {
    if (!activeRobot) return;
    const pythonCode = generatePython(activeRobot.code);
    onDeploy(pythonCode.split('\n').filter(l => l.trim()), activeRobot.color);
  };

  // ---- Desktop mouse drag (HTML5 DnD) ----
  const startMouseDrag = (e, payload, effect) => {
    e.dataTransfer.effectAllowed = effect;
    setDragPayload(payload);
  };

  // ---- Touch drag - instantaneous, no long-press ----
  // The blocks library is a static (non-scrolling) panel and the workspace
  // itself scrolls from empty space, not from the blocks, so there's no
  // scroll-vs-drag ambiguity to resolve here: touching a block always picks
  // it up immediately.
  const handleTouchStart = (e, payload) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    touchDragRef.current = {
      payload,
      offsetX,
      offsetY,
      x: touch.clientX,
      y: touch.clientY,
    };

    setDragPayload(payload);
    setTouchGhost({
      label: payload.kind === 'new' ? payload.blockDef.label : payload.node.label,
      category: payload.kind === 'new' ? payload.blockDef.category : payload.node.category,
      x: touch.clientX,
      y: touch.clientY,
      offsetX,
      offsetY,
    });
  };

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    const onTouchMoveNative = (e) => {
      const st = touchDragRef.current;
      if (!st) return;
      const touch = e.touches[0];
      if (!touch) return;

      e.preventDefault();
      st.x = touch.clientX;
      st.y = touch.clientY;
      setTouchGhost(prev => (prev ? { ...prev, x: touch.clientX, y: touch.clientY } : prev));

      const el2 = document.elementFromPoint(touch.clientX, touch.clientY);
      const slotEl = el2 ? el2.closest('.drop-slot') : null;
      if (slotEl) {
        const containerId = slotEl.dataset.slotContainer === 'root' ? null : slotEl.dataset.slotContainer;
        const index = parseInt(slotEl.dataset.slotIndex, 10);
        setHoveredSlotKey(`${containerId ?? 'root'}:${index}`);
      } else {
        setHoveredSlotKey(null);
      }
    };

    const onTouchEndNative = () => {
      const st = touchDragRef.current;
      if (st) {
        const el2 = document.elementFromPoint(st.x, st.y);
        const slotEl = el2 ? el2.closest('.drop-slot') : null;
        if (slotEl) {
          const containerId = slotEl.dataset.slotContainer === 'root' ? null : slotEl.dataset.slotContainer;
          const index = parseInt(slotEl.dataset.slotIndex, 10);
          performDrop(containerId, index, st.payload);
        }
      }
      touchDragRef.current = null;
      setDragPayload(null);
      setTouchGhost(null);
      setHoveredSlotKey(null);
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

  // ---- A drop target between (or at the start/end of) a list of blocks ----
  const renderSlot = (containerId, index) => {
    const key = `${containerId ?? 'root'}:${index}`;
    const isActive = hoveredSlotKey === key && dragPayload;
    return (
      <div
        key={`slot-${key}`}
        className={`drop-slot${isActive ? ' drop-slot-active' : ''}`}
        data-slot-container={containerId ?? 'root'}
        data-slot-index={index}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHoveredSlotKey(key);
        }}
        onDragLeave={() => setHoveredSlotKey(prev => (prev === key ? null : prev))}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          performDrop(containerId, index, dragPayload);
          setDragPayload(null);
          setHoveredSlotKey(null);
        }}
      />
    );
  };

  const renderBlockRow = (node, displayIndex) => {
    const isContainer = !!node.isContainer;
    return (
      <div className="code-block-wrapper" key={node.instanceId}>
        <div
          className={`code-block-item category-${node.category} ${isContainer ? 'container-block' : ''}`}
          style={{ borderLeftColor: getBlockColor(node.category) }}
          draggable
          onDragStart={(e) => startMouseDrag(e, { kind: 'move', instanceId: node.instanceId, node }, 'move')}
          onDragEnd={() => setDragPayload(null)}
          onTouchStart={(e) => handleTouchStart(e, { kind: 'move', instanceId: node.instanceId, node })}
        >
          <span className="block-index">{displayIndex}</span>
          <span className="block-content">{node.label}</span>
          <button
            className="remove-btn"
            onClick={() => handleRemoveNode(node.instanceId)}
            onTouchStart={(e) => e.stopPropagation()}
            title="Remove this block"
          >
            &times;
          </button>
        </div>

        {isContainer && (
          <div className="container-body">
            <div className="children-list">
              {renderBlockList(node.children || [], node.instanceId)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBlockList = (nodes, containerId) => (
    <React.Fragment>
      {renderSlot(containerId, 0)}
      {nodes.map((node, i) => (
        <React.Fragment key={node.instanceId}>
          {renderBlockRow(node, i + 1)}
          {renderSlot(containerId, i + 1)}
        </React.Fragment>
      ))}
    </React.Fragment>
  );

  const renderLibraryBlock = (block, className) => (
    <div
      key={block.id}
      className={`block-button ${className}`}
      draggable
      onDragStart={(e) => startMouseDrag(e, { kind: 'new', blockDef: block }, 'copy')}
      onDragEnd={() => setDragPayload(null)}
      onTouchStart={(e) => handleTouchStart(e, { kind: 'new', blockDef: block })}
      title={block.description}
    >
      <div className="block-label">{block.label}</div>
    </div>
  );

  return (
    <div
      ref={modalRef}
      className="modal-overlay"
      onClick={onClose}
    >
      {/* Floating preview shown under the finger while touch-dragging */}
      {touchGhost && (
        <div
          style={{
            position: 'fixed',
            left: `${touchGhost.x - touchGhost.offsetX}px`,
            top: `${touchGhost.y - touchGhost.offsetY}px`,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.9,
          }}
        >
          <div
            className={`block-button ${touchGhost.category}-block`}
            style={{ margin: 0, boxShadow: '0 10px 25px rgba(0,0,0,0.25)' }}
          >
            <div className="block-label">{touchGhost.label}</div>
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
          {/* LEFT: Available Blocks - static, no scrolling */}
          <div className="blocks-panel">
            <div className="block-categories">
              <div className="block-category">
                <h4 className="category-title" style={{ color: '#ff6b6b' }}>Sensors</h4>
                <div className="blocks-list">
                  {AVAILABLE_BLOCKS.filter(b => b.category === 'sensor').map(block =>
                    renderLibraryBlock(block, 'sensor-block')
                  )}
                </div>
              </div>

              <div className="block-category">
                <h4 className="category-title" style={{ color: '#4ecdc4' }}>Motors</h4>
                <div className="blocks-list">
                  {AVAILABLE_BLOCKS.filter(b => b.category === 'motor').map(block =>
                    renderLibraryBlock(block, 'motor-block')
                  )}
                </div>
              </div>

              <div className="block-category">
                <h4 className="category-title" style={{ color: '#ffe66d' }}>Control</h4>
                <div className="blocks-list">
                  {AVAILABLE_BLOCKS.filter(b => b.category === 'control').map(block =>
                    renderLibraryBlock(block, 'control-block')
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Code Workspace - a single ordered vertical program, like
              SPIKE/Scratch: blocks stack top-to-bottom, containers indent
              their children in place. No manual x/y placement, so a block
              can never render on top of / hide another block. */}
          <div className="code-panel">
            <h3 style={{ margin: '10px 0', fontSize: '16px' }}>Your Robot Code</h3>

            <div className="code-workspace">
              {activeRobot && activeRobot.code.length === 0 && (
                <div className="empty-workspace">
                  <p>Drag blocks from the left to build your program</p>
                </div>
              )}
              {activeRobot && renderBlockList(activeRobot.code, null)}
            </div>

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
