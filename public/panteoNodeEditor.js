/**
 * panteoNodeEditor.js
 * A native JavaScript node-based editor component with backend/frontend integration
 */

const panteoNodeEditor = (function () {
  // Private variables
  let container = null;
  let canvas = null;
  let ctx = null;
  let nodes = [];
  let edges = [];
  let draggedNode = null;
  let dragOffset = { x: 0, y: 0 };
  let selectedConnector = null;
  let tempEdge = null;
  let palette = null;
  let nodeTypes = {};
  let onChange = null;
  let selectedNode = null;
  let selectedEdge = null; // Added for edge selection
  let clipboard = null; // Simple clipboard for copy/paste
  let pasteOffsetStep = 20;
  let currentPasteOffset = 0;
  let history = [];
  let historyIndex = -1;
  const maxHistory = 100;
  let historyDebounceTimer = null;
  let isRestoring = false;
  let contentLayer = null; // Wrapper for nodes and canvas (palette stays outside)
  let overlayLayer = null; // Non-zooming overlay for pinned UI (palette, floating buttons)
  let overlayHost = null;   // Host element for overlay (parent of container), not scrolling with content
  let zoom = 1;
  const minZoom = 0.25;
  const maxZoom = 3;
  const zoomFactor = 1.1; // 10% per step

  // Added for palette dragging
  let isDraggingPalette = false;
  let paletteDragOffset = { x: 0, y: 0 };

  // Node class definition
  class Node {
    constructor(type, id, x, y, title, icon, inputs, outputs) {
      this.type = type;
      this.id = id || generateId();
      this.x = x || 100;
      this.y = y || 100;
      this.title = title || 'Node';
      this.icon = icon || 'extension';
      this.inputs = inputs || [];
      this.outputs = outputs || [];
      this.width = 200;
      this.height = 100;
      this.element = null;
      console.log(`Node created: ${this.id} (${this.type}) at (${this.x}, ${this.y})`);
    }

    render() {
      console.log(`Rendering node: ${this.id}`);
      if (this.element) {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
        return this.element;
      }

      // Create node element
      const nodeEl = document.createElement('div');
      nodeEl.className = 'panteo-node';
      nodeEl.style.left = `${this.x}px`;
      nodeEl.style.top = `${this.y}px`;
      nodeEl.style.position = 'absolute'; // FORCE absolute positioning

      // Create header
      const header = document.createElement('div');
      header.className = 'panteo-node-header';

      // Add icon
      const iconEl = document.createElement('span');
      iconEl.className = 'panteo-node-header-icon material-icons';
      iconEl.textContent = this.icon;

      // Add fallback for icon
      iconEl.onerror = function () {
        this.textContent = this.title.charAt(0).toUpperCase();
        this.style.width = '24px';
        this.style.height = '24px';
        this.style.display = 'flex';
        this.style.alignItems = 'center';
        this.style.justifyContent = 'center';
        this.style.backgroundColor = '#6652E3';
        this.style.borderRadius = '50%';
        this.style.color = 'white';
      };

      header.appendChild(iconEl);

      // Add title
      const titleEl = document.createElement('span');
      titleEl.textContent = this.title;
      header.appendChild(titleEl);

      nodeEl.appendChild(header);

      // Create content
      const content = document.createElement('div');
      content.className = 'panteo-node-content';

      // Add inputs
      if (this.inputs.length > 0) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'panteo-connector-group';

        this.inputs.forEach(input => {
          const connector = document.createElement('div');
          connector.className = 'panteo-connector';

          // Add connector point
          const connectorPoint = document.createElement('div');
          connectorPoint.className = 'panteo-connector-point panteo-connector-input';
          connectorPoint.dataset.nodeId = this.id;
          connectorPoint.dataset.connectorId = input.id;
          connectorPoint.dataset.connectorType = 'input';
          connector.appendChild(connectorPoint);
          console.log(`    Added input connector point for ${this.id}/${input.id}`); // DEBUG

          // Add label
          const label = document.createElement('div');
          label.className = 'panteo-connector-label';

          // Display saved values for modal inputs
          if (input.control?.type === 'modal' && input.value) {
            const values = Object.values(input.value).filter(Boolean);
            const displayText = values.length ? `: ${values.join(', ')}` : '';
            const fullText = input.label + displayText;

            // Set the text and title
            label.textContent = fullText;
            label.title = fullText;

            // Add a small delay to check if text is multiline
            requestAnimationFrame(() => {
              if (label.scrollHeight > label.clientHeight || label.offsetHeight > 24) {
                label.style.paddingTop = '0';
              }
            });
          } else {
            label.textContent = input.label;
            label.title = input.label;
          }

          connector.appendChild(label);

          // Add control if specified
          if (input.control) {
            const control = document.createElement('div');
            control.className = 'panteo-connector-control';

            if (input.control.type === 'text') {
              const inputEl = document.createElement('input');
              inputEl.type = 'text';
              inputEl.value = input.control.value || '';
              inputEl.placeholder = input.control.placeholder || '';
              // Добавляем обработчик события для сохранения значения при вводе
              inputEl.addEventListener('input', (e) => {
                input.control.value = e.target.value;
                notifyChange();
              });
              control.appendChild(inputEl);
            } else if (input.control.type === 'dropdown') {
              const selectEl = document.createElement('select');
              (input.control.options || []).forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.label;
                if (option.value === input.control.value) {
                  optionEl.selected = true;
                }
                selectEl.appendChild(optionEl);
              });
              // Добавляем обработчик события для сохранения выбранного значения
              selectEl.addEventListener('change', (e) => {
                input.control.value = e.target.value;
                notifyChange();
              });
              control.appendChild(selectEl);
            } else if (input.control.type === 'modal') {
              const buttonEl = document.createElement('button');
              buttonEl.innerHTML = '&hellip;';
              buttonEl.dataset.nodeId = this.id;
              buttonEl.dataset.connectorId = input.id;
              buttonEl.addEventListener('click', () => {
                // Check if the node type has modal_fields defined
                const nodeTypeInfo = nodeTypes[this.type];
                let modalFields = [];

                // Try to get modal fields from component metadata
                if (nodeTypeInfo && nodeTypeInfo.inputs) {
                  const inputDef = nodeTypeInfo.inputs.find(i => i.id === input.id);
                  if (inputDef && inputDef.modal_fields) {
                    console.log("Using modal_fields from component metadata:", inputDef.modal_fields);
                    // Map modal_fields to the format expected by createModal
                    modalFields = inputDef.modal_fields.map(field => ({
                      type: field.type,
                      name: field.name,
                      label: field.label,
                      value: input.value?.[field.name] || field.default || '',
                      placeholder: field.placeholder || '',
                      infoText: field.info_text || '',
                      options: field.options
                    }));
                  }
                }

                // Fallback to default fields if no modal_fields defined
                if (modalFields.length === 0) {
                  console.log("Using default modal fields");
                  modalFields = [
                    {
                      type: 'string',
                      name: 'text_value',
                      label: 'Text Input',
                      value: input.value?.text_value || '',
                      placeholder: 'Enter text value...',
                      infoText: 'This is a simple text input field'
                    },
                    {
                      type: 'number',
                      name: 'number_value',
                      label: 'Number Input',
                      value: input.value?.number_value || '',
                      placeholder: '0',
                      infoText: 'Enter a numeric value'
                    },
                    {
                      type: 'textarea',
                      name: 'textarea_value',
                      label: 'Text Area',
                      value: input.value?.textarea_value || '',
                      placeholder: 'Enter multiline text...',
                      infoText: 'This field supports multiple lines of text'
                    },
                    {
                      type: 'dropdown',
                      name: 'dropdown_value',
                      label: 'Dropdown Select',
                      value: input.value?.dropdown_value || '',
                      infoText: 'Select one option from the list',
                      options: [
                        { value: 'option1', label: 'Option 1' },
                        { value: 'option2', label: 'Option 2' },
                        { value: 'option3', label: 'Option 3' }
                      ]
                    }
                  ];
                }

                const modal = createModal('Edit Values', modalFields);
                document.body.appendChild(modal.element);

                modal.submitButton.addEventListener('click', () => {
                  const formControls = modal.element.querySelectorAll('.panteo-form-control');
                  const values = {};

                  formControls.forEach(control => {
                    values[control.name] = control.value;
                  });

                  // Сохраняем значения в input
                  input.value = values;

                  // Обновляем отображение значения в контроле
                  const displayValues = Object.values(values)
                    .filter(Boolean)
                    .join(', ');

                  const controlLabel = buttonEl.parentElement.previousElementSibling;
                  if (controlLabel && controlLabel.classList.contains('panteo-connector-label')) {
                    controlLabel.textContent = input.label + (displayValues ? `: ${displayValues}` : '');
                  }

                  document.body.removeChild(modal.element);
                  notifyChange();
                });
              });
              control.appendChild(buttonEl);
            }

            connector.appendChild(control);
          }

          inputGroup.appendChild(connector);
        });

        content.appendChild(inputGroup);
      }

      // Add outputs
      if (this.outputs.length > 0) {
        const outputGroup = document.createElement('div');
        outputGroup.className = 'panteo-connector-group';

        this.outputs.forEach(output => {
          const connector = document.createElement('div');
          connector.className = 'panteo-connector panteo-connector-output';

          // Add label
          const label = document.createElement('div');
          label.className = 'panteo-connector-label';
          label.textContent = output.label;
          connector.appendChild(label);

          // Add connector point
          const connectorPoint = document.createElement('div');
          connectorPoint.className = 'panteo-connector-point panteo-connector-output';
          connectorPoint.dataset.nodeId = this.id;
          connectorPoint.dataset.connectorId = output.id;
          connectorPoint.dataset.connectorType = 'output';
          connector.appendChild(connectorPoint);
          console.log(`    Added output connector point for ${this.id}/${output.id}`); // DEBUG

          outputGroup.appendChild(connector);
        });

        content.appendChild(outputGroup);
      }

      nodeEl.appendChild(content);
      this.element = nodeEl;

      console.log(`Node ${this.id} element created.`);
      return nodeEl;
    }

    updateSizeFromElement() {
      if (!this.element) return;
      // Measure actual rendered size including connectors/content
      this.width = this.element.offsetWidth || this.width;
      this.height = this.element.offsetHeight || this.height;
    }

    getConnectorPosition(connectorId, type) {
      if (!this.element) return null;
      console.log(`Getting position for connector ${connectorId} (${type}) on node ${this.id}`);

      // CORRECTED SELECTOR: Find the specific point element
      const connectorPoint = this.element.querySelector(`.panteo-connector-point[data-connector-id="${connectorId}"][data-connector-type="${type}"]`);

      if (connectorPoint) {
        const rect = connectorPoint.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        // Convert client (scaled) -> editor coords: xe = (xc - left)/zoom + scrollLeft
        const result = {
          x: (rect.left + rect.width / 2 - containerRect.left) / zoom + container.scrollLeft,
          y: (rect.top + rect.height / 2 - containerRect.top) / zoom + container.scrollTop
        };
        console.log(`  > Found connector point, position:`, { x: result.x, y: result.y });
        return result;
      }

      console.warn(`  > Connector point ${connectorId} (${type}) not found on node ${this.id}`);
      return null;
    }
  }

  // Edge class definition
  class Edge {
    constructor(sourceNodeId, sourceConnectorId, targetNodeId, targetConnectorId) {
      this.id = generateId();
      this.sourceNodeId = sourceNodeId;
      this.sourceConnectorId = sourceConnectorId;
      this.targetNodeId = targetNodeId;
      this.targetConnectorId = targetConnectorId;
    }

    render() {
      const sourceNode = nodes.find(node => node.id === this.sourceNodeId);
      const targetNode = nodes.find(node => node.id === this.targetNodeId);

      if (!sourceNode || !targetNode) return;

      const sourcePos = sourceNode.getConnectorPosition(this.sourceConnectorId, 'output');
      const targetPos = targetNode.getConnectorPosition(this.targetConnectorId, 'input');

      if (!sourcePos || !targetPos) return;

      // Draw Bézier curve
      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);

      // Calculate control points for a smooth curve
      const dx = targetPos.x - sourcePos.x;
      const controlPointOffset = Math.min(Math.abs(dx) * 0.5, 150);

      ctx.bezierCurveTo(
        sourcePos.x + controlPointOffset, sourcePos.y,
        targetPos.x - controlPointOffset, targetPos.y,
        targetPos.x, targetPos.y
      );

      // Выделяем выбранное ребро другим цветом и толщиной
      if (selectedEdge && selectedEdge.id === this.id) {
        ctx.strokeStyle = '#007bff'; // Синий цвет для выбранного ребра
        ctx.lineWidth = 3; // Более толстая линия
      } else {
        ctx.strokeStyle = '#6c757d'; // Стандартный цвет
        ctx.lineWidth = 2; // Стандартная толщина
      }

      ctx.stroke();
    }
  }

  // Utility functions
  function generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  function getMousePosition(e) {
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const pos = {
      // client (scaled) -> editor coords
      x: (e.clientX - rect.left) / zoom + container.scrollLeft,
      y: (e.clientY - rect.top) / zoom + container.scrollTop
    };
    return pos;
  }

  function isEditableElement(el) {
    if (!el) return false;
    const editableTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    if (editableTags.includes(el.tagName)) return true;
    if (el.isContentEditable) return true;
    // Inside connector controls or modal content
    if (el.closest('.panteo-connector-control')) return true;
    if (el.closest('.panteo-modal')) return true;
    return false;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function pushHistoryNow() {
    if (isRestoring) return;
    const state = getEditorState();
    const snapshot = deepClone(state);
    // Truncate future states if any
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    history.push(snapshot);
    if (history.length > maxHistory) {
      history.shift();
      // Ensure index stays at last element after shift
      historyIndex = history.length - 1;
    } else {
      historyIndex = history.length - 1;
    }
  }

  function scheduleHistoryPush(delay = 150) {
    if (isRestoring) return;
    if (historyDebounceTimer) clearTimeout(historyDebounceTimer);
    historyDebounceTimer = setTimeout(() => {
      pushHistoryNow();
    }, delay);
  }

  function applyEditorState(state) {
    // Clear existing nodes visuals and state
    nodes.forEach(node => {
      if (node.element && node.element.parentNode) {
        node.element.parentNode.removeChild(node.element);
      }
    });
    nodes = [];
    edges = [];
    updateSelectionVisuals(null, null);

    const createdNodes = [];
    (state.nodes || []).forEach(data => {
      const nodeTypeConfig = nodeTypes[data.type] || {};

      // Merge saved inputs with config inputs to preserve values
      const mergedInputs = (data.inputs || []).map(savedInput => {
        const configInput = (nodeTypeConfig.inputs || []).find(i => i.id === savedInput.id) || {};
        const mergedInput = { ...configInput, ...savedInput };
        if ((mergedInput.type === 'modal' || configInput.modal_fields) && !mergedInput.control) {
          mergedInput.control = { type: 'modal' };
        }
        if (savedInput.control) {
          mergedInput.control = { ...configInput.control, ...savedInput.control };
        } else if (configInput.control) {
          mergedInput.control = { ...configInput.control };
        }
        if (savedInput.value && mergedInput.control && !mergedInput.control.value) {
          mergedInput.control.value = savedInput.value;
        }
        return mergedInput;
      });

      const node = new Node(
        data.type,
        data.id,
        data.x,
        data.y,
        data.title || nodeTypeConfig.title,
        data.icon || nodeTypeConfig.icon,
        mergedInputs,
        data.outputs || nodeTypeConfig.outputs
      );
      createdNodes.push(node);
    });

    nodes = createdNodes;
    if (contentLayer) {
      nodes.forEach(n => {
        const el = n.render();
        contentLayer.appendChild(el);
        n.updateSizeFromElement();
      });
    } else if (container) {
      nodes.forEach(n => {
        const el = n.render();
        container.appendChild(el);
        n.updateSizeFromElement();
      });
    }

    // Update canvas and layer size
    if (canvas && container) {
      updateStageSize();
    }

    edges = (state.edges || []).map(data => new Edge(
      data.sourceNodeId,
      data.sourceConnectorId,
      data.targetNodeId,
      data.targetConnectorId
    ));

    if (ctx) {
      // Defer render to ensure DOM/layout settled before drawing edges
      requestAnimationFrame(() => renderEdges());
    }
  }

  function cloneNodeToData(node) {
    return {
      id: node.id,
      type: node.type,
      x: node.x,
      y: node.y,
      title: node.title,
      icon: node.icon,
      inputs: deepClone(node.inputs || []),
      outputs: deepClone(node.outputs || [])
    };
  }

  function deleteSelectedInternal() {
    if (selectedEdge) {
      edges = edges.filter(edge => edge.id !== selectedEdge.id);
      updateSelectionVisuals(null, null);
      renderEdges();
      notifyChange();
      return true;
    }
    if (selectedNode) {
      const nodeToDelete = selectedNode;
      // Remove edges connected to the node
      edges = edges.filter(edge =>
        edge.sourceNodeId !== nodeToDelete.id && edge.targetNodeId !== nodeToDelete.id
      );
      // Remove node element from DOM
      if (nodeToDelete.element && nodeToDelete.element.parentNode) {
        nodeToDelete.element.parentNode.removeChild(nodeToDelete.element);
      }
      // Remove node from array
      const index = nodes.indexOf(nodeToDelete);
      if (index !== -1) nodes.splice(index, 1);
      updateSelectionVisuals(null, null);
      renderEdges();
      notifyChange();
      return true;
    }
    return false;
  }

  // Internal operations for toolbar and hotkeys
  function performCopy() {
    if (selectedNode) {
      clipboard = { type: 'node', data: { ...cloneNodeToData(selectedNode), zoomAtCopy: zoom } };
      currentPasteOffset = 0;
      return true;
    }
    if (selectedEdge) {
      clipboard = {
        type: 'edge',
        data: {
          sourceNodeId: selectedEdge.sourceNodeId,
          sourceConnectorId: selectedEdge.sourceConnectorId,
          targetNodeId: selectedEdge.targetNodeId,
          targetConnectorId: selectedEdge.targetConnectorId
        }
      };
      currentPasteOffset = 0;
      return true;
    }
    return false;
  }

  function performPaste() {
    if (!clipboard) return false;
    if (clipboard.type === 'node') {
      const data = deepClone(clipboard.data);
      const nodeTypeConfig = nodeTypes[data.type];
      if (!nodeTypeConfig) return false;
      // Maintain a consistent on-screen offset regardless of current zoom level
      const visibleOffset = pasteOffsetStep / (zoom || 1);
      const newNode = new Node(
        data.type,
        null,
        (data.x || 100) + visibleOffset * (currentPasteOffset + 1),
        (data.y || 100) + visibleOffset * (currentPasteOffset + 1),
        data.title || nodeTypeConfig.title,
        data.icon || nodeTypeConfig.icon,
        deepClone(data.inputs || nodeTypeConfig.inputs || []),
        deepClone(data.outputs || nodeTypeConfig.outputs || [])
      );
      nodes.push(newNode);
      if (contentLayer) {
        const el = newNode.render();
        contentLayer.appendChild(el);
        newNode.updateSizeFromElement();
      } else if (container) {
        const el = newNode.render();
        container.appendChild(el);
        newNode.updateSizeFromElement();
      }
      updateStageSize();
      updateSelectionVisuals(newNode, null);
      renderEdges();
      notifyChange();
      currentPasteOffset += 1;
      return true;
    }
    if (clipboard.type === 'edge') {
      const { sourceNodeId, sourceConnectorId, targetNodeId, targetConnectorId } = clipboard.data;
      const sourceExists = nodes.some(n => n.id === sourceNodeId);
      const targetExists = nodes.some(n => n.id === targetNodeId);
      if (!sourceExists || !targetExists) return false;
      const existingEdge = edges.find(e => e.targetNodeId === targetNodeId && e.targetConnectorId === targetConnectorId);
      if (existingEdge) return false;
      const newEdge = new Edge(sourceNodeId, sourceConnectorId, targetNodeId, targetConnectorId);
      edges.push(newEdge);
      updateSelectionVisuals(null, newEdge);
      renderEdges();
      notifyChange();
      return true;
    }
    return false;
  }

  function performUndo() {
    if (history.length === 0) return false;
    if (historyIndex <= 0) return false;
    isRestoring = true;
    historyIndex -= 1;
    const state = deepClone(history[historyIndex]);
    applyEditorState(state);
    isRestoring = false;
    return true;
  }

  function performRedo() {
    if (history.length === 0) return false;
    if (historyIndex >= history.length - 1) return false;
    isRestoring = true;
    historyIndex += 1;
    const state = deepClone(history[historyIndex]);
    applyEditorState(state);
    isRestoring = false;
    return true;
  }

  function findNodeAt(x, y) {
    // console.log(`Finding node at (${x}, ${y})`); // Optional: verbose
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (
        x >= node.x &&
        x <= node.x + node.width && // Use defined width
        y >= node.y &&
        y <= node.y + node.height // Use defined height
      ) {
        // console.log(`  > Found node: ${node.id}`);
        return node;
      }
    }
    // console.log(`  > No node found.`);
    return null;
  }

  function findConnectorAt(x, y) {
    console.log(`Finding connector at (${x}, ${y}) relative to container`);
    if (!container) return null;
    const containerRect = container.getBoundingClientRect();
    // Convert editor (unscaled) -> client (scaled)
    const clientX = containerRect.left + (x - container.scrollLeft) * zoom;
    const clientY = containerRect.top + (y - container.scrollTop) * zoom;
    console.log(`  > Client coords: (${clientX}, ${clientY})`);

    const elements = document.elementsFromPoint(clientX, clientY);
    console.log(`  > Elements at point:`, elements);
    // 1) Try exact hit on the small connector point
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el.classList.contains('panteo-connector-point')) {
        const nodeId = el.dataset.nodeId;
        const connectorId = el.dataset.connectorId;
        const type = el.dataset.connectorType;
        console.log(`    * Found potential connector element:`, el, `NodeID: ${nodeId}, ConnID: ${connectorId}, Type: ${type}`);

        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          console.log(`  > Confirmed connector: Node ${nodeId}, Connector ${connectorId} (${type})`);
          return { nodeId, connectorId, type };
        } else {
          console.log(`    * Connector node ${nodeId} not found in current nodes list.`);
        }
      }
    }

    // 2) Fallback: if user releases on the connector row, treat it as hitting the point
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el.classList.contains('panteo-connector')) {
        const point = el.querySelector('.panteo-connector-point');
        if (point) {
          const nodeId = point.dataset.nodeId;
          const connectorId = point.dataset.connectorId;
          const type = point.dataset.connectorType;
          console.log(`    * Using connector row hit; resolved to point:`, point, `NodeID: ${nodeId}, ConnID: ${connectorId}, Type: ${type}`);

          const node = nodes.find(n => n.id === nodeId);
          if (node) {
            console.log(`  > Confirmed connector from row: Node ${nodeId}, Connector ${connectorId} (${type})`);
            return { nodeId, connectorId, type };
          }
        }
      }
    }
    console.log(`  > No connector found at this point.`);
    return null;
  }

  // Added function to find edge near a point
  function findEdgeNearPoint(x, y, threshold = 10) {
    console.log(`Finding edge near (${x}, ${y}) with threshold ${threshold}`);
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const sourceNode = nodes.find(node => node.id === edge.sourceNodeId);
      const targetNode = nodes.find(node => node.id === edge.targetNodeId);

      if (!sourceNode || !targetNode) continue;

      const sourcePos = sourceNode.getConnectorPosition(edge.sourceConnectorId, 'output');
      const targetPos = targetNode.getConnectorPosition(edge.targetConnectorId, 'input');

      if (!sourcePos || !targetPos) continue;

      // Calculate approximate midpoint of the edge
      // For a Bézier curve, the true midpoint is complex, let's approximate with the line segment midpoint
      const midX = (sourcePos.x + targetPos.x) / 2;
      const midY = (sourcePos.y + targetPos.y) / 2;

      // Calculate distance from click point to midpoint
      const dx = x - midX;
      const dy = y - midY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      console.log(`  > Checking edge ${edge.id}: Midpoint (${midX.toFixed(1)}, ${midY.toFixed(1)}), Distance: ${distance.toFixed(1)}`);

      if (distance <= threshold) {
        console.log(`  > Found edge near point: ${edge.id}`);
        return edge;
      }
    }
    console.log(`  > No edge found near point.`);
    return null;
  }

  function renderEdges() {
    if (!ctx || !canvas) return;
    // Canvas is inside the scaled contentLayer; draw in editor coords without extra transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Render all edges
    edges.forEach(edge => edge.render());

    // Render temporary edge if dragging
    if (tempEdge) {
      const sourceNode = nodes.find(node => node.id === tempEdge.sourceNodeId);
      if (sourceNode) {
        const sourcePos = sourceNode.getConnectorPosition(tempEdge.sourceConnectorId, 'output');
        if (sourcePos) {
          ctx.beginPath();
          ctx.moveTo(sourcePos.x, sourcePos.y);

          const dx = tempEdge.targetPos.x - sourcePos.x;
          const controlPointOffset = Math.min(Math.abs(dx) * 0.5, 150);

          ctx.bezierCurveTo(
            sourcePos.x + controlPointOffset, sourcePos.y,
            tempEdge.targetPos.x - controlPointOffset, tempEdge.targetPos.y,
            tempEdge.targetPos.x, tempEdge.targetPos.y
          );

          // Если мы удаляем ребро, используем красный цвет и пунктирную линию
          if (tempEdge.isDeleting) {
            ctx.strokeStyle = '#dc3545'; // Красный цвет для удаления
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]); // Пунктирная линия
          } else {
            ctx.strokeStyle = '#6c757d'; // Стандартный цвет
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]); // Пунктирная линия для временного ребра
          }

          ctx.stroke();
          ctx.setLineDash([]); // Сбрасываем пунктирную линию
        }
      }
    }
  }

  function createNodeFromType(type, x, y) {
    const nodeType = nodeTypes[type];
    if (!nodeType) return null;

    // Подготавливаем входы, добавляя control для модальных окон
    const preparedInputs = (nodeType.inputs || []).map(input => {
      const inputCopy = { ...input };

      // Если input имеет type="modal", но не имеет control, добавляем его
      if ((input.type === 'modal' || input.modal_fields) && !input.control) {
        inputCopy.control = { type: 'modal' };
        console.log(`Added modal control to input ${input.id} for node type ${type}`);
      }

      return inputCopy;
    });

    return new Node(
      type,
      null,
      x,
      y,
      nodeType.title,
      nodeType.icon,
      preparedInputs,
      nodeType.outputs
    );
  }

  function createPalette() {
    console.log("Creating palette...");
    const paletteEl = document.createElement('div');
    paletteEl.className = 'panteo-palette';
    // Ensure palette is non-zooming, draggable overlay element
    paletteEl.style.position = 'absolute';
    paletteEl.style.left = '12px';
    paletteEl.style.top = '12px';
    paletteEl.style.zIndex = '1100';
    paletteEl.style.pointerEvents = 'auto';

    // Add Header (draggable area) with search toggle
    const header = document.createElement('div');
    header.className = 'panteo-palette-header';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '8px 10px';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'panteo-palette-title';
    titleWrap.innerHTML = `<span class="title-text">Node Palette</span>`;

    const searchWrap = document.createElement('div');
    searchWrap.className = 'panteo-palette-search';
    searchWrap.style.display = 'flex';
    searchWrap.style.alignItems = 'center';
    searchWrap.style.gap = '6px';
    searchWrap.style.flex = '1';
    searchWrap.style.minWidth = '0';
    searchWrap.style.marginLeft = 'auto';
    searchWrap.style.justifyContent = 'flex-end';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'material-icons search-icon';
    searchIcon.textContent = 'search';
    searchIcon.style.cursor = 'pointer';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-input';
    searchInput.placeholder = 'Search...';
    searchInput.style.display = 'none';
    searchInput.style.flex = '1';
    searchInput.style.minWidth = '0';
    searchInput.style.width = '100%';
    searchInput.style.padding = '2px 6px';
    searchInput.style.fontSize = '13px';
    searchInput.style.border = 'none';
    searchInput.style.outline = 'none';
    searchInput.style.background = 'transparent';
    searchInput.style.boxShadow = 'none';

    // Put input first so it never overflows to the right; icon stays on the far right
    searchWrap.appendChild(searchInput);
    searchWrap.appendChild(searchIcon);

    header.appendChild(titleWrap);
    header.appendChild(searchWrap);
    paletteEl.appendChild(header);

    // Add Dropdown or list container
    const listContainer = document.createElement('div');
    listContainer.className = 'panteo-palette-list'; // Add class for styling
    paletteEl.appendChild(listContainer);

    // Group nodes by category
    const categories = {};
    for (const type in nodeTypes) {
      const config = nodeTypes[type];
      if (!categories[config.category]) {
        categories[config.category] = [];
      }
      categories[config.category].push({ type, config });
    }

    // Collapsible categories + filtering support
    let collapseSnapshot = null; // will store { categoryName: booleanCollapsed }

    function snapshotCollapseState(root) {
      const snap = {};
      const sections = root.querySelectorAll('.panteo-palette-category');
      sections.forEach(section => {
        const name = section.querySelector('.panteo-palette-category-title .label')?.textContent || '';
        const content = section.querySelector('.panteo-palette-category-content');
        snap[name] = content && content.style.display === 'none';
      });
      return snap;
    }

    function applyCollapseSnapshot(root, snap) {
      const sections = root.querySelectorAll('.panteo-palette-category');
      sections.forEach(section => {
        const name = section.querySelector('.panteo-palette-category-title .label')?.textContent || '';
        const content = section.querySelector('.panteo-palette-category-content');
        const caret = section.querySelector('.panteo-palette-category-title .caret');
        const collapsed = !!snap[name];
        if (content && caret) {
          content.style.display = collapsed ? 'none' : 'block';
          caret.textContent = collapsed ? '▸' : '▾';
        }
        section.style.display = 'block'; // make sure all visible when restoring
      });
    }

    function filterPalette(query) {
      const q = (query || '').toLowerCase().trim();
      const sections = listContainer.querySelectorAll('.panteo-palette-category');
      let anyVisible = false;
      sections.forEach(section => {
        const items = section.querySelectorAll('.panteo-palette-item');
        let visibleCount = 0;
        items.forEach(item => {
          const label = item.querySelector('.panteo-palette-item-label')?.textContent.toLowerCase() || '';
          const type = item.dataset.nodeType?.toLowerCase() || '';
          const match = q === '' || label.includes(q) || type.includes(q);
          item.style.display = match ? '' : 'none';
          if (match) visibleCount++;
        });
        if (q === '') {
          // Show all categories, items already reset above
          section.style.display = 'block';
        } else {
          // Hide empty categories, expand non-empty to show results
          const hasAny = visibleCount > 0;
          section.style.display = hasAny ? 'block' : 'none';
          if (hasAny) {
            const content = section.querySelector('.panteo-palette-category-content');
            const caret = section.querySelector('.panteo-palette-category-title .caret');
            if (content && caret) { content.style.display = 'block'; caret.textContent = '▾'; }
          }
        }
        anyVisible = anyVisible || section.style.display !== 'none';
      });
      return anyVisible;
    }

    function startSearch() {
      if (!collapseSnapshot) collapseSnapshot = snapshotCollapseState(listContainer);
      // Replace title with inline input
      titleWrap.style.display = 'none';
      searchInput.style.display = 'block';
      searchInput.style.flex = '1';
      searchInput.style.width = '100%';
      setTimeout(() => { searchInput.focus(); searchInput.select(); }, 0);
    }

    function endSearch() {
      searchInput.value = '';
      filterPalette('');
      if (collapseSnapshot) applyCollapseSnapshot(listContainer, collapseSnapshot);
      collapseSnapshot = null;
      searchInput.style.display = 'none';
      titleWrap.style.display = '';
    }

    searchIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      if (searchInput.style.display === 'none') {
        startSearch();
      } else {
        endSearch();
      }
    });

    searchInput.addEventListener('input', () => {
      filterPalette(searchInput.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        endSearch();
      }
    });
    // prevent header drag when interacting with search UI
    searchInput.addEventListener('mousedown', (e) => e.stopPropagation());
    searchIcon.addEventListener('mousedown', (e) => e.stopPropagation());

    // Create category sections (collapsible)
    for (const categoryName in categories) {
      const categorySection = document.createElement('div');
      categorySection.className = 'panteo-palette-category';

      const categoryTitle = document.createElement('div');
      categoryTitle.className = 'panteo-palette-category-title';
      categoryTitle.style.cursor = 'pointer';
      categoryTitle.innerHTML = `
        <span class="caret" style="display:inline-block;width:1em;text-align:center;">▾</span>
        <span class="label">${categoryName}</span>
      `;
      categorySection.appendChild(categoryTitle);

      // Body wrapper for items
      const categoryContent = document.createElement('div');
      categoryContent.className = 'panteo-palette-category-content';

      categories[categoryName].forEach(({ type, config }) => {
        const item = document.createElement('div');
        item.className = 'panteo-palette-item';
        item.dataset.nodeType = type;
        item.innerHTML = `
                <span class="material-icons panteo-palette-item-icon">${config.icon || 'settings'}</span>
                <span class="panteo-palette-item-label">${config.title}</span>
            `;
        categoryContent.appendChild(item);
      });
      categorySection.appendChild(categoryContent);

      // Restore collapsed state from localStorage
      const collapsedKey = `panteo_palette_collapsed_${categoryName}`;
      let isCollapsed = false;
      try { isCollapsed = localStorage.getItem(collapsedKey) === '1'; } catch (err) { /* ignore */ }

      const updateCollapseVisual = () => {
        const caret = categoryTitle.querySelector('.caret');
        if (caret) caret.textContent = isCollapsed ? '▸' : '▾';
        categoryContent.style.display = isCollapsed ? 'none' : 'block';
      };

      updateCollapseVisual();

      categoryTitle.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        isCollapsed = !isCollapsed;
        updateCollapseVisual();
        try { localStorage.setItem(collapsedKey, isCollapsed ? '1' : '0'); } catch (err) { /* ignore */ }
      });

      listContainer.appendChild(categorySection); // Append category to list container
    }

    // Add event listener for the palette itself (delegated mousedown)
    paletteEl.addEventListener('mousedown', handlePaletteMouseDown);
    console.log("Palette created with header and categories.");
    return paletteEl;
  }

  function createModal(title, fields) {
    // Create modal container
    const modalEl = document.createElement('div');
    modalEl.className = 'panteo-modal';

    // Create modal content
    const contentEl = document.createElement('div');
    contentEl.className = 'panteo-modal-content';

    // Create header
    const headerEl = document.createElement('div');
    headerEl.className = 'panteo-modal-header';

    // Add title
    const titleEl = document.createElement('div');
    titleEl.className = 'panteo-modal-title';
    titleEl.textContent = title;
    headerEl.appendChild(titleEl);

    // Add close button
    const closeEl = document.createElement('button');
    closeEl.className = 'panteo-modal-close';
    closeEl.innerHTML = '&times;';
    closeEl.addEventListener('click', () => {
      document.body.removeChild(modalEl);
    });
    headerEl.appendChild(closeEl);

    contentEl.appendChild(headerEl);

    // Create body
    const bodyEl = document.createElement('div');
    bodyEl.className = 'panteo-modal-body';

    // Add fields
    fields.forEach(field => {
      if (!field) {
        console.warn('Undefined field in modal form, skipping');
        return;
      }

      const formGroup = document.createElement('div');
      formGroup.className = 'panteo-form-group';

      // Add label
      const label = document.createElement('label');
      label.className = 'panteo-form-label';
      label.textContent = field.label || 'Field';
      formGroup.appendChild(label);

      // Add info text if provided
      if (field.infoText) {
        const info = document.createElement('div');
        info.className = 'panteo-form-info';
        info.textContent = field.infoText;
        formGroup.appendChild(info);
      }

      // Add control
      let control;
      if (field.type === 'string' || field.type === 'text' || field.type === 'password') {
        control = document.createElement('input');
        control.type = field.type === 'password' ? 'password' : 'text';
        control.className = 'panteo-form-control';
        control.name = field.name;
        control.value = field.value || '';
        control.placeholder = field.placeholder || '';
      } else if (field.type === 'number') {
        control = document.createElement('input');
        control.type = 'number';
        control.className = 'panteo-form-control';
        control.name = field.name;
        control.value = field.value || '';
        control.placeholder = field.placeholder || '';
      } else if (field.type === 'textarea') {
        control = document.createElement('textarea');
        control.className = 'panteo-form-control';
        control.name = field.name;
        control.value = field.value || '';
        control.placeholder = field.placeholder || '';
        control.rows = 4;
      } else if (field.type === 'dropdown') {
        control = document.createElement('select');
        control.className = 'panteo-form-control';
        control.name = field.name;

        if (Array.isArray(field.options)) {
          field.options.forEach(option => {
            if (option && typeof option === 'object') {
              const optionEl = document.createElement('option');
              optionEl.value = option.value;
              optionEl.textContent = option.label;
              if (option.value === field.value) {
                optionEl.selected = true;
              }
              control.appendChild(optionEl);
            }
          });
        }
      }

      if (control) {
        formGroup.appendChild(control);
        bodyEl.appendChild(formGroup);
      } else {
        console.warn(`Unsupported field type: ${field.type}`);
      }
    });

    contentEl.appendChild(bodyEl);

    // Create footer
    const footerEl = document.createElement('div');
    footerEl.className = 'panteo-modal-footer';

    // Add cancel button
    const cancelEl = document.createElement('button');
    cancelEl.className = 'panteo-btn panteo-btn-secondary';
    cancelEl.textContent = 'Cancel';
    cancelEl.addEventListener('click', () => {
      document.body.removeChild(modalEl);
    });
    footerEl.appendChild(cancelEl);

    // Add submit button
    const submitEl = document.createElement('button');
    submitEl.className = 'panteo-btn panteo-btn-primary';
    submitEl.textContent = 'Submit';
    footerEl.appendChild(submitEl);

    contentEl.appendChild(footerEl);
    modalEl.appendChild(contentEl);

    return {
      element: modalEl,
      submitButton: submitEl
    };
  }

  function notifyChange() {
    if (typeof onChange === 'function') {
      // Debounce or throttle this if it causes performance issues
      onChange(getEditorState());
    }
    scheduleHistoryPush();
  }

  function getEditorState() {
    return {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        x: node.x,
        y: node.y,
        title: node.title,
        icon: node.icon,
        inputs: node.inputs.map(input => {
          // Создаем копию входа для сохранения
          const inputData = {
            id: input.id,
            label: input.label
          };

          // Сохраняем значение из модального окна, если оно есть
          if (input.value) {
            inputData.value = input.value;
          }

          // Сохраняем control с его значением, если он есть
          if (input.control) {
            inputData.control = { ...input.control };
            // Для совместимости также сохраняем значение контрола в корне input
            if (input.control.value) {
              inputData.value = input.control.value;
            }
          }

          return inputData;
        }),
        outputs: node.outputs
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        sourceNodeId: edge.sourceNodeId,
        sourceConnectorId: edge.sourceConnectorId,
        targetNodeId: edge.targetNodeId,
        targetConnectorId: edge.targetConnectorId
      }))
    };
  }

  // Helper to update selection visuals
  function updateSelectionVisuals(newSelectedNode, newSelectedEdge) {
    console.log(`Updating selection. Old: ${selectedNode?.id}, New: ${newSelectedNode?.id}, Old Edge: ${selectedEdge?.id}, New Edge: ${newSelectedEdge?.id}`);

    // Обновляем выбранный узел
    if (selectedNode && selectedNode.element) {
      selectedNode.element.classList.remove('selected');
    }
    selectedNode = newSelectedNode;
    if (selectedNode && selectedNode.element) {
      selectedNode.element.classList.add('selected');
    }

    // Обновляем выбранное ребро
    selectedEdge = newSelectedEdge;

    // Перерисовываем ребра, чтобы обновить их визуальное состояние
    renderEdges();
  }

  // Add this function to calculate required canvas size
  function calculateRequiredCanvasSize() {
    if (!nodes.length) {
      return {
        width: container.offsetWidth,
        height: container.offsetHeight
      };
    }

    const padding = 100; // Padding around nodes
    let maxX = 0;
    let maxY = 0;

    nodes.forEach(node => {
      const nodeRight = node.x + node.width;
      const nodeBottom = node.y + node.height;
      maxX = Math.max(maxX, nodeRight);
      maxY = Math.max(maxY, nodeBottom);
    });

    return {
      width: Math.max(maxX + padding, container.offsetWidth),
      height: Math.max(maxY + padding, container.offsetHeight)
    };
  }

  // Keep canvas and contentLayer sized to content so #workflow-editor can scroll to reveal all nodes
  function updateStageSize() {
    if (!canvas || !container || !contentLayer) return;
    const { width, height } = calculateRequiredCanvasSize();
    // Provide generous extra scroll space equal to the current viewport
    const viewportW = container.clientWidth || container.offsetWidth;
    const viewportH = container.clientHeight || container.offsetHeight;
    const totalW = Math.ceil(width + viewportW);
    const totalH = Math.ceil(height + viewportH);

    // Canvas pixel size and CSS size
    canvas.width = totalW;
    canvas.height = totalH;
    canvas.style.width = `${totalW}px`;
    canvas.style.height = `${totalH}px`;
    // Content layer size defines scrollable area (transform doesn't affect layout)
    contentLayer.style.width = `${totalW}px`;
    contentLayer.style.height = `${totalH}px`;
  }

  // Event handlers
  function handleMouseDown(e) {
    console.log(`--- Mouse Down ---`);
    // If the click started on the palette, let the palette handler take over
    if (e.target.closest('.panteo-palette')) {
      console.log(" > Click originated on palette, ignoring for node/edge.");
      return;
    }
    // Ignore mouse down on editable controls (don't start drags or selection)
    if (isEditableElement(e.target)) {
      return;
    }
    if (!container || e.button !== 0) {
      console.log(`  > Aborted (no container or not left button)`);
      return;
    }

    const pos = getMousePosition(e);
    console.log(`  > Position: (${pos.x}, ${pos.y})`);

    // Check click on connector first
    const connector = findConnectorAt(pos.x, pos.y);
    if (connector) {
      console.log(`  > Clicked on connector:`, connector);
      selectedConnector = connector;

      // Проверяем, есть ли уже соединение с этим коннектором
      if (connector.type === 'input') {
        // Если кликнули на входной коннектор, ищем ребро, которое к нему подключено
        const connectedEdge = edges.find(edge =>
          edge.targetNodeId === connector.nodeId &&
          edge.targetConnectorId === connector.connectorId
        );

        if (connectedEdge) {
          console.log(`  > Found connected edge: ${connectedEdge.id}, starting edge deletion drag`);
          // Начинаем перетаскивание для удаления ребра
          tempEdge = {
            sourceNodeId: connectedEdge.sourceNodeId,
            sourceConnectorId: connectedEdge.sourceConnectorId,
            targetNodeId: connectedEdge.targetNodeId,
            targetConnectorId: connectedEdge.targetConnectorId,
            isDeleting: true // Флаг, указывающий, что мы удаляем ребро
          };
          // Удаляем ребро из массива, так как мы его перетаскиваем
          edges = edges.filter(edge => edge.id !== connectedEdge.id);
          updateSelectionVisuals(null, null);
          renderEdges();
        } else if (connector.type === 'output') {
          // Если кликнули на выходной коннектор, начинаем создание нового ребра
          tempEdge = {
            sourceNodeId: connector.nodeId,
            sourceConnectorId: connector.connectorId,
            targetPos: pos
          };
          console.log(`    * Starting edge creation from ${connector.nodeId}/${connector.connectorId}`);
          updateSelectionVisuals(null, null);
        }
      } else if (connector.type === 'output') {
        // Если кликнули на выходной коннектор, начинаем создание нового ребра
        tempEdge = {
          sourceNodeId: connector.nodeId,
          sourceConnectorId: connector.connectorId,
          targetPos: pos
        };
        console.log(`    * Starting edge creation from ${connector.nodeId}/${connector.connectorId}`);
        updateSelectionVisuals(null, null);
      }

      // Prevent default to avoid text selection, etc.
      e.preventDefault();
      // Add move/up listeners for edge creation/deletion
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      console.log(`  > Added mousemove/mouseup listeners for edge.`);
      return;
    }

    // Check click on node
    const node = findNodeAt(pos.x, pos.y);
    if (node) {
      // Update selection state
      console.log(`  > Clicked on node: ${node.id}`);
      updateSelectionVisuals(node, null);

      // Check if click is on the header for dragging
      if (e.target.closest('.panteo-node-header')) {
        console.log(`    * Clicked on header - starting drag`);
        draggedNode = node;
        dragOffset = {
          x: pos.x - node.x,
          y: pos.y - node.y
        };
        console.log(`    * Drag offset:`, dragOffset);
        // Bring node to front rendering-wise
        const index = nodes.indexOf(node);
        if (index !== -1) {
          nodes.splice(index, 1);
          nodes.push(node);
        }
        // Add dragging class
        node.element.classList.add('dragging');
      } else {
        console.log(`    * Clicked on node body/content.`);
      }
      // Prevent default to avoid text selection, etc.
      e.preventDefault();
      // Add move/up listeners for node dragging or just selection interaction
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      console.log(`  > Added mousemove/mouseup listeners for node.`);
      return;
    }

    // Clicked on background - deselect nodes, but check for edges first
    console.log(`  > Clicked on background.`);
    const edge = findEdgeNearPoint(pos.x, pos.y, 15);
    if (edge) {
      console.log(`  > Selecting edge: ${edge.id}`);
      updateSelectionVisuals(null, edge); // Pass edge to selection function
    } else {
      console.log(`  > Deselecting everything.`);
      updateSelectionVisuals(null, null); // Deselect both node and edge
    }

    // Clear other states regardless of finding an edge
    selectedConnector = null;
    draggedNode = null;
    tempEdge = null;
  }

  function handleMouseMove(e) {
    const pos = getMousePosition(e);

    // Handle node dragging
    if (draggedNode) {
      const newX = pos.x - dragOffset.x;
      const newY = pos.y - dragOffset.y;

      // Allow nodes to be dragged beyond visible area
      draggedNode.x = Math.max(0, newX);
      draggedNode.y = Math.max(0, newY);

      draggedNode.element.style.left = `${draggedNode.x}px`;
      draggedNode.element.style.top = `${draggedNode.y}px`;

      // Update canvas size based on actual content
      if (canvas) {
        updateStageSize();
      }

      renderEdges();
      e.preventDefault();
      return;
    }

    // Handle edge creation drag
    if (tempEdge) {
      tempEdge.targetPos = pos;
      renderEdges();
      e.preventDefault();
    }
  }

  function handleMouseUp(e) {
    console.log(`--- Mouse Up ---`);
    if (e.button !== 0) {
      console.log(`  > Aborted (not left button)`);
      return;
    }
    const pos = getMousePosition(e);
    console.log(`  > Position: (${pos.x}, ${pos.y})`);

    // Finalize node dragging
    if (draggedNode) {
      console.log(`  > Finalizing drag for node ${draggedNode.id}`);
      draggedNode.element.classList.remove('dragging');
      draggedNode = null; // Stop dragging state
      notifyChange(); // Notify state change after drag ends
    }

    // Finalize edge creation or deletion
    if (tempEdge) {
      console.log(`  > Finalizing edge operation from ${tempEdge.sourceNodeId}/${tempEdge.sourceConnectorId}`);
      const targetConnector = findConnectorAt(pos.x, pos.y);

      if (tempEdge.isDeleting) {
        // Если мы удаляем ребро и отпустили мышь на другом коннекторе, восстанавливаем ребро
        if (targetConnector && targetConnector.type === 'input' &&
          targetConnector.nodeId !== tempEdge.sourceNodeId) {
          console.log(`    * Restoring edge to new target:`, targetConnector);

          // Проверяем, не занят ли целевой коннектор
          const existingEdge = edges.find(edge =>
            edge.targetNodeId === targetConnector.nodeId &&
            edge.targetConnectorId === targetConnector.connectorId
          );

          if (!existingEdge) {
            // Создаем новое ребро с новым целевым коннектором
            const newEdge = new Edge(
              tempEdge.sourceNodeId,
              tempEdge.sourceConnectorId,
              targetConnector.nodeId,
              targetConnector.connectorId
            );
            edges.push(newEdge);
            console.log(`    * Edge restored with new target.`);
            notifyChange();
          } else {
            console.log(`    * Cannot restore edge: target connector is busy.`);
          }
        } else {
          console.log(`    * Edge deletion confirmed.`);
          // Ребро уже удалено из массива в handleMouseDown
          notifyChange();
        }
      } else {
        // Стандартное создание ребра
        if (targetConnector && targetConnector.type === 'input' && targetConnector.nodeId !== tempEdge.sourceNodeId) {
          console.log(`    * Target connector found:`, targetConnector);
          // Разрешаем несколько исходящих рёбер с одного выходного коннектора,
          // но по-прежнему запрещаем более одного входящего ребра на один входной коннектор
          const existingEdge = edges.find(edge =>
            edge.targetNodeId === targetConnector.nodeId &&
            edge.targetConnectorId === targetConnector.connectorId
          );

          if (!existingEdge) { // Connect only if target input is free
            console.log(`    * Creating new edge.`);
            const newEdge = new Edge(
              tempEdge.sourceNodeId,
              tempEdge.sourceConnectorId,
              targetConnector.nodeId,
              targetConnector.connectorId
            );
            edges.push(newEdge);
            notifyChange();
          } else {
            console.log(`    * Edge creation aborted (target input busy).`);
          }
        } else {
          console.log(`    * No valid target connector found.`);
        }
      }
      tempEdge = null; // Clear temporary edge state
      renderEdges(); // Redraw to remove temporary edge or show final edge
    }

    console.log(`  > Removing mousemove/mouseup listeners.`);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    selectedConnector = null; // Clear selected connector state
  }

  function handleKeyDown(e) {
    console.log(`--- Key Down: ${e.key} ---`);

    // Do not handle hotkeys when user is typing in inputs/modals
    if (isEditableElement(document.activeElement)) {
      return; // let the control handle keys like Backspace, Cmd+Z, etc.
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const meta = isMac ? e.metaKey : e.ctrlKey;
    // Hotkeys: Copy (Cmd/Ctrl+C), Paste (Cmd/Ctrl+V), Undo (Cmd/Ctrl+Z), Redo (Shift+Cmd/Ctrl+Z)
    if (meta && !e.shiftKey && (e.key === 'c' || e.key === 'C')) {
      if (performCopy()) e.preventDefault();
      return;
    }
    if (meta && !e.shiftKey && (e.key === 'v' || e.key === 'V')) {
      if (performPaste()) e.preventDefault();
      return;
    }
    if (meta && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      if (performUndo()) e.preventDefault();
      return;
    }
    if (meta && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      if (performRedo()) e.preventDefault();
      return;
    }

    // Обработка удаления выбранного ребра
    if (selectedEdge && (e.key === 'Delete' || e.key === 'Backspace')) {
      console.log(`  > Delete requested for edge ${selectedEdge.id}`);

      // Удаляем ребро из массива
      edges = edges.filter(edge => edge.id !== selectedEdge.id);

      // Обновляем визуальное состояние
      updateSelectionVisuals(null, null);
      renderEdges();
      notifyChange();

      e.preventDefault(); // Предотвращаем стандартное поведение браузера
      console.log(`  > Edge ${selectedEdge.id} deleted.`);
      return;
    }

    // Обработка удаления выбранного узла
    if (selectedNode && (e.key === 'Delete' || e.key === 'Backspace')) {
      console.log(`  > Delete requested for node ${selectedNode.id}`);
      const nodeToDelete = selectedNode; // Keep reference

      // Remove edges connected to the node
      edges = edges.filter(edge =>
        edge.sourceNodeId !== nodeToDelete.id && edge.targetNodeId !== nodeToDelete.id
      );

      // Remove node element from DOM
      if (nodeToDelete.element && nodeToDelete.element.parentNode) {
        nodeToDelete.element.parentNode.removeChild(nodeToDelete.element);
      }

      // Remove node from array
      const index = nodes.indexOf(nodeToDelete);
      if (index !== -1) {
        nodes.splice(index, 1);
      }

      // Clear selection and update visuals
      updateSelectionVisuals(null, null); // Deselect both node and edge
      renderEdges(); // Redraw edges after removal
      notifyChange();

      e.preventDefault(); // Prevent browser back navigation on Backspace
      console.log(`  > Node ${nodeToDelete.id} deleted.`);
    }
  }

  // --- Palette Dragging Handlers ---

  function handlePaletteMouseDown(e) {
    // Only drag if clicking the palette header/handle
    if (!e.target.closest('.panteo-palette-header') || e.button !== 0) return;

    console.log("--- Palette Mouse Down ---");
    isDraggingPalette = true;
    const rect = palette.getBoundingClientRect();
    const hostRect = (overlayHost || container).getBoundingClientRect();
    // Use viewport-relative position within the editor viewport (ignore zoom)
    const mousePos = {
      x: e.clientX - hostRect.left,
      y: e.clientY - hostRect.top
    };

    // Calculate offset relative to the palette's top-left corner
    paletteDragOffset = {
      x: mousePos.x - (rect.left - hostRect.left),
      y: mousePos.y - (rect.top - hostRect.top)
    };
    console.log(`  > Palette Offset:`, paletteDragOffset);

    palette.classList.add('dragging');
    e.preventDefault();
    document.addEventListener('mousemove', handlePaletteMouseMove);
    document.addEventListener('mouseup', handlePaletteMouseUp);
    console.log("  > Added palette move/up listeners");
  }

  function handlePaletteMouseMove(e) {
    if (!isDraggingPalette) return;

    // Use viewport-relative position within the editor viewport (ignore zoom)
    const hostRect = (overlayHost || container).getBoundingClientRect();
    const mousePos = {
      x: e.clientX - hostRect.left,
      y: e.clientY - hostRect.top
    };
    let newX = mousePos.x - paletteDragOffset.x;
    let newY = mousePos.y - paletteDragOffset.y;

    // Basic boundary check (keep palette within container)
    const paletteWidth = palette.offsetWidth;
    const paletteHeight = palette.offsetHeight;
    const containerWidth = (overlayHost || container).clientWidth;
    const containerHeight = (overlayHost || container).clientHeight;

    newX = Math.max(0, Math.min(containerWidth - paletteWidth, newX));
    newY = Math.max(0, Math.min(containerHeight - paletteHeight, newY));

    palette.style.left = `${newX}px`;
    palette.style.top = `${newY}px`;
    e.preventDefault();
  }

  function handlePaletteMouseUp(e) {
    if (!isDraggingPalette || e.button !== 0) return;

    console.log("--- Palette Mouse Up ---");
    isDraggingPalette = false;
    palette.classList.remove('dragging');
    document.removeEventListener('mousemove', handlePaletteMouseMove);
    document.removeEventListener('mouseup', handlePaletteMouseUp);
    console.log("  > Removed palette move/up listeners");
  }

  // Public API
  return {
    init: function (selector) {
      container = document.querySelector(selector);
      if (!container) {
        console.error('PanteoNodeEditor Error: Container element not found for selector:', selector);
        return;
      }

      // Clear container and set base class
      container.innerHTML = '';
      container.className = 'panteo-node-editor';
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }

      // Create content layer to zoom nodes and canvas together
      contentLayer = document.createElement('div');
      contentLayer.className = 'panteo-content-layer';
      contentLayer.style.position = 'absolute';
      contentLayer.style.left = '0';
      contentLayer.style.top = '0';
      contentLayer.style.transformOrigin = '0 0';
      // Size is controlled dynamically to enable scrolling beyond viewport
      contentLayer.style.width = '100%';
      contentLayer.style.height = '100%';
      container.appendChild(contentLayer);

      // Create overlay layer above content to host non-zooming UI (palette, floating controls)
      overlayLayer = document.createElement('div');
      overlayLayer.className = 'panteo-overlay-layer';
      overlayLayer.style.position = 'absolute';
      overlayLayer.style.left = '0';
      overlayLayer.style.top = '0';
      overlayLayer.style.width = '100%';
      overlayLayer.style.height = '100%';
      overlayLayer.style.pointerEvents = 'none'; // let clicks pass unless child enables
      overlayLayer.style.zIndex = '1050';
      // Host overlay on the non-scrolling parent (.editor-body), so it won't scroll with content
      overlayHost = container.parentElement || container;
      if (getComputedStyle(overlayHost).position === 'static') {
        overlayHost.style.position = 'relative';
      }
      overlayHost.appendChild(overlayLayer);

      // Create canvas for edges inside content layer
      canvas = document.createElement('canvas');
      canvas.className = 'panteo-canvas';

      // Set initial canvas size to container size, then adjust by content
      canvas.width = container.scrollWidth || container.offsetWidth;
      canvas.height = container.scrollHeight || container.offsetHeight;
      canvas.style.width = `${canvas.width}px`;
      canvas.style.height = `${canvas.height}px`;

      contentLayer.appendChild(canvas);
      ctx = canvas.getContext('2d');

      // Create palette (ensure it's added to the DOM correctly)
      palette = createPalette();
      if (palette) {
        // Prefer overlay layer so palette doesn't scroll or zoom
        const host = overlayLayer || container;
        host.appendChild(palette);
        // Add palette item click handlers (ensure nodeTypes is populated before this)
        const paletteItems = palette.querySelectorAll('.panteo-palette-item');
        let newNodeOffset = 0; // Added to stagger nodes
        paletteItems.forEach(item => {
          item.addEventListener('click', e => {
            const nodeType = e.currentTarget.dataset.nodeType;
            // Position new node further away from corner, with offset
            const initialX = 150 + newNodeOffset * 25; // Start further right
            const initialY = 100 + newNodeOffset * 25; // Start further down
            newNodeOffset++; // Increment offset for next node

            const node = createNodeFromType(nodeType, initialX, initialY);
            if (node) {
              console.log(`Adding new node ${node.id} at (${initialX}, ${initialY})`);
              nodes.push(node);
              const nodeElement = node.render(); // Get the rendered element
              contentLayer.appendChild(nodeElement); // Append into zoomable layer
              node.updateSizeFromElement();
              updateStageSize();
              console.log(` > Node element ${node.id} appended to container:`, nodeElement); // DEBUG: Verify append
              updateSelectionVisuals(node, null); // Select the new node
              notifyChange();
            }
            // Optionally close palette dropdown here
          });
        });
      } else {
        console.warn("PanteoNodeEditor: Palette could not be created.");
      }

      // Add core event listeners
      container.addEventListener('mousedown', handleMouseDown); // Mouse down on container/nodes/connectors
      // mousemove and mouseup are added dynamically to document now
      window.addEventListener('keydown', handleKeyDown); // Keydown listener

      // Update window resize handler
      window.addEventListener('resize', () => {
        if (canvas && container) {
          updateStageSize();
          if (contentLayer) contentLayer.style.transform = `scale(${zoom})`;
          // Defer render to allow DOM/layout to settle under new size
          requestAnimationFrame(() => renderEdges());
        }
      });

      // History will be seeded either here (empty) or by loadFromJSON if data provided later
      if (history.length === 0) {
        isRestoring = true;
        history = [deepClone(getEditorState())];
        historyIndex = 0;
        isRestoring = false;
      }

      // Defer first render to next frame to ensure DOM measured, then size stage and render
      requestAnimationFrame(() => {
        nodes.forEach(n => n.updateSizeFromElement());
        updateStageSize();
        renderEdges();
      });
      return this; // Return the public API
    },

    registerNodeType: function (type, config) {
      nodeTypes[type] = config;
      return this;
    },

    setNodes: function (nodeData) {
      // Clear existing nodes visuals and state
      nodes.forEach(node => {
        if (node.element && node.element.parentNode) {
          node.element.parentNode.removeChild(node.element);
        }
      });
      nodes = [];
      updateSelectionVisuals(null, null); // Clear selection

      // Create new nodes
      (nodeData || []).forEach(data => {
        const nodeTypeConfig = nodeTypes[data.type];
        if (!nodeTypeConfig) {
          console.warn(`PanteoNodeEditor: Unknown node type "${data.type}"`);
          return;
        }

        // Merge saved inputs with config inputs to preserve values
        const mergedInputs = (data.inputs || []).map(savedInput => {
          const configInput = (nodeTypeConfig.inputs || []).find(i => i.id === savedInput.id);
          if (configInput) {
            // Создаем базовый вход на основе конфигурации
            const mergedInput = {
              ...configInput,
              ...savedInput
            };

            // Если вход имеет тип modal, но не имеет контрола, добавляем его
            if ((mergedInput.type === 'modal' || configInput.modal_fields) && !mergedInput.control) {
              mergedInput.control = { type: 'modal' };
              console.log(`Added modal control to input ${mergedInput.id} for node ${data.id}`);
            }

            // Если есть control в сохраненных данных, используем его
            if (savedInput.control) {
              mergedInput.control = {
                ...configInput.control,
                ...savedInput.control
              };
            } else if (configInput.control) {
              // Иначе используем control из конфигурации
              mergedInput.control = { ...configInput.control };
            }

            // Если у сохраненного входа есть value и нет control.value, перенесем его в control.value
            if (savedInput.value && mergedInput.control && !mergedInput.control.value) {
              mergedInput.control.value = savedInput.value;
            }

            return mergedInput;
          }
          return savedInput;
        });

        const node = new Node(
          data.type,
          data.id,
          data.x,
          data.y,
          data.title || nodeTypeConfig.title,
          data.icon || nodeTypeConfig.icon,
          mergedInputs,
          data.outputs || nodeTypeConfig.outputs
        );

        nodes.push(node);
        if (container && contentLayer) {
          contentLayer.appendChild(node.render());
        }
      });

      // Update canvas and layer size based on loaded nodes
      if (canvas && container) {
        // Ensure all node sizes are measured before sizing stage
        requestAnimationFrame(() => {
          nodes.forEach(n => n.updateSizeFromElement());
          updateStageSize();
        });
      }

      if (ctx) requestAnimationFrame(() => renderEdges());
      return this;
    },

    setEdges: function (edgeData) {
      edges = (edgeData || []).map(data => new Edge(
        data.sourceNodeId,
        data.sourceConnectorId,
        data.targetNodeId,
        data.targetConnectorId
      ));
      if (ctx) requestAnimationFrame(() => renderEdges()); // Re-render edges after setting them
      return this;
    },

    getState: function () {
      return getEditorState();
    },

    onChangeListener: function (callback) {
      onChange = callback;
      return this;
    },

    // Toolbar API
    copy: function () {
      return performCopy();
    },

    paste: function () { return performPaste(); },

    deleteSelected: function () {
      return deleteSelectedInternal();
    },

    // Undo/Redo
    undo: function () { return performUndo(); },
    redo: function () { return performRedo(); },
    zoomIn: function () {
      zoom = Math.min(maxZoom, zoom * zoomFactor);
      if (contentLayer) contentLayer.style.transform = `scale(${zoom})`;
      updateStageSize();
      requestAnimationFrame(() => renderEdges());
    },
    zoomOut: function () {
      zoom = Math.max(minZoom, zoom / zoomFactor);
      if (contentLayer) contentLayer.style.transform = `scale(${zoom})`;
      updateStageSize();
      requestAnimationFrame(() => renderEdges());
    },
    fitToView: function () {
      if (!container) return;
      // Compute required area
      const { width, height } = calculateRequiredCanvasSize();
      const viewW = container.clientWidth || container.offsetWidth;
      const viewH = container.clientHeight || container.offsetHeight;
      const scaleX = viewW / Math.max(width, 1);
      const scaleY = viewH / Math.max(height, 1);
      zoom = Math.max(minZoom, Math.min(maxZoom, Math.min(scaleX, scaleY)));
      if (contentLayer) contentLayer.style.transform = `scale(${zoom})`;
      updateStageSize();
      requestAnimationFrame(() => renderEdges());
    },

    loadFromJSON: function (json) {
      try {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        // Seed editor with provided data without polluting undo history
        isRestoring = true;
        this.setNodes(data.nodes || []);
        this.setEdges(data.edges || []);
        // Reset history baseline to the loaded state so first Undo doesn't wipe everything
        history = [deepClone(getEditorState())];
        historyIndex = 0;
        isRestoring = false;

        return this;
      } catch (error) {
        console.error('Failed to load editor data:', error);
        return this;
      }
    },

    saveToJSON: function () {
      return JSON.stringify(getEditorState());
    },

    destroy: function () {
      // Remove event listeners
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove); // Ensure these are removed if active
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', renderEdges); // Assuming resize listener was added to window

      // Clear DOM
      container.innerHTML = '';

      // Reset state variables
      container = null;
      canvas = null;
      ctx = null;
      nodes = [];
      edges = [];
      draggedNode = null;
      selectedConnector = null;
      tempEdge = null;
      palette = null;
      nodeTypes = {};
      onChange = null;
      selectedNode = null;
      console.log("PanteoNodeEditor destroyed.");

      // Ensure palette listeners are removed
      if (palette) {
        palette.removeEventListener('mousedown', handlePaletteMouseDown);
      }
      document.removeEventListener('mousemove', handlePaletteMouseMove);
      document.removeEventListener('mouseup', handlePaletteMouseUp);
    }
  };
})();

// Экспортируем panteoNodeEditor как глобальный объект для доступа из шаблонов
window.PanteoNodeEditor = panteoNodeEditor;
