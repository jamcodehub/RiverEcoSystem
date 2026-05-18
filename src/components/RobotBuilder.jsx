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

const RobotBuilder = ({ onDeploy, onClose, selectedCode, setSelectedCode }) => {
  const [draggedBlock, setDraggedBlock] = useState(null);

  const handleAddBlock = (block) => {
    setSelectedCode([...selectedCode, { ...block, children: [] }]);
  };

  const handleRemoveBlock = (index) => {
    setSelectedCode(selectedCode.filter((_, i) => i !== index));
  };

  const handleAddChildBlock = (parentIndex, block) => {
    const updated = [...selectedCode];
    if (!updated[parentIndex].children) {
      updated[parentIndex].children = [];
    }
    updated[parentIndex].children.push({ ...block, children: [] });
    setSelectedCode(updated);
  };

  const handleRemoveChildBlock = (parentIndex, childIndex) => {
    const updated = [...selectedCode];
    updated[parentIndex].children.splice(childIndex, 1);
    setSelectedCode(updated);
  };

  const handleClearCode = () => {
    setSelectedCode([]);
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
    const pythonCode = generatePython(selectedCode);
    onDeploy(pythonCode.split('\n').filter(l => l.trim()));
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

        <div className="builder-container fullscreen-layout">
          {/* LEFT: Available Blocks */}
          <div className="blocks-panel">
            <h3>Blocks Library</h3>
            <p className="panel-description">Click a block to add it</p>

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
                  {selectedCode.map((block, index) => renderCodeBlock(block, index + 1))}
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
                  generatePython(selectedCode).trim()
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
            <li><strong>Sensors</strong> detect threats - click inside them to add actions</li>
            <li><strong>Motors</strong make robots move or act - swim/trap/kill</li>
            <li><strong>Repeat</strong> blocks can contain other blocks for complex logic</li>
            <li>Deploy multiple robots with different strategies to protect the river</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RobotBuilder;
