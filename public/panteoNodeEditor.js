/**
 * panteoNodeEditor.js
 * A native JavaScript node-based editor component with backend/frontend integration
 */

const panteoNodeEditor = (function() {
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
      iconEl.onerror = function() {
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
          label.textContent = input.label;
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
              control.appendChild(selectEl);
            } else if (input.control.type === 'modal') {
              const buttonEl = document.createElement('button');
              buttonEl.innerHTML = '&hellip;';
              buttonEl.dataset.nodeId = this.id;
              buttonEl.dataset.connectorId = input.id;
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
          connector.className = 'panteo-connector';
          
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
    
    getConnectorPosition(connectorId, type) {
      if (!this.element) return null;
      console.log(`Getting position for connector ${connectorId} (${type}) on node ${this.id}`);
      
      const connectors = this.element.querySelectorAll(`.panteo-connector-${type}`);
      for (let i = 0; i < connectors.length; i++) {
        if (connectors[i].dataset.connectorId === connectorId) {
          const rect = connectors[i].getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const result = {
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.top + rect.height / 2 - containerRect.top
          };
          console.log(`  > Found connector, position:`, {x: result.x, y: result.y});
          return result;
        }
      }
      
      console.warn(`  > Connector ${connectorId} (${type}) not found on node ${this.id}`);
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
      
      ctx.strokeStyle = '#6c757d';
      ctx.lineWidth = 2;
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
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    // console.log('Mouse Position:', pos); // Optional: very verbose
    return pos;
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
    const clientX = x + containerRect.left;
    const clientY = y + containerRect.top;
    console.log(`  > Client coords: (${clientX}, ${clientY})`);

    const elements = document.elementsFromPoint(clientX, clientY);
    console.log(`  > Elements at point:`, elements);
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
     console.log(`  > No connector found at this point.`);
    return null;
  }
  
  function renderEdges() {
    if (!ctx || !canvas) return;
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

                ctx.strokeStyle = '#6c757d'; // Use appropriate color
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 3]); // Dashed line for temp edge
                ctx.stroke();
                ctx.setLineDash([]); // Reset line dash
            }
        }
    }
  }
  
  function createNodeFromType(type, x, y) {
    const nodeType = nodeTypes[type];
    if (!nodeType) return null;
    
    return new Node(
      type,
      null,
      x,
      y,
      nodeType.title,
      nodeType.icon,
      nodeType.inputs,
      nodeType.outputs
    );
  }
  
  function createPalette() {
    // Create palette container
    const paletteEl = document.createElement('div');
    paletteEl.className = 'panteo-palette';
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'panteo-palette-dropdown';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'panteo-palette-header';
    header.textContent = 'Add Node';
    dropdown.appendChild(header);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'panteo-palette-content';
    
    // Group node types by category
    const categories = {};
    Object.keys(nodeTypes).forEach(type => {
      const nodeType = nodeTypes[type];
      if (!categories[nodeType.category]) {
        categories[nodeType.category] = [];
      }
      categories[nodeType.category].push({
        type,
        title: nodeType.title,
        icon: nodeType.icon
      });
    });
    
    // Create categories
    Object.keys(categories).forEach(category => {
      const categoryEl = document.createElement('div');
      categoryEl.className = 'panteo-palette-category';
      
      // Create category header
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'panteo-palette-category-header';
      categoryHeader.textContent = category;
      categoryEl.appendChild(categoryHeader);
      
      // Create items container
      const items = document.createElement('div');
      items.className = 'panteo-palette-items';
      
      // Create items
      categories[category].forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'panteo-palette-item';
        itemEl.dataset.nodeType = item.type;
        
        // Add icon
        const iconEl = document.createElement('span');
        iconEl.className = 'panteo-palette-item-icon material-icons';
        iconEl.textContent = item.icon;
        itemEl.appendChild(iconEl);
        
        // Add title
        const titleEl = document.createElement('span');
        titleEl.textContent = item.title;
        itemEl.appendChild(titleEl);
        
        items.appendChild(itemEl);
      });
      
      categoryEl.appendChild(items);
      content.appendChild(categoryEl);
    });
    
    dropdown.appendChild(content);
    paletteEl.appendChild(dropdown);
    
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
      const formGroup = document.createElement('div');
      formGroup.className = 'panteo-form-group';
      
      // Add label
      const label = document.createElement('label');
      label.className = 'panteo-form-label';
      label.textContent = field.label;
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
      if (field.type === 'string' || field.type === 'number') {
        control = document.createElement('input');
        control.type = field.type === 'number' ? 'number' : 'text';
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
        
        (field.options || []).forEach(option => {
          const optionEl = document.createElement('option');
          optionEl.value = option.value;
          optionEl.textContent = option.label;
          if (option.value === field.value) {
            optionEl.selected = true;
          }
          control.appendChild(optionEl);
        });
      }
      
      formGroup.appendChild(control);
      bodyEl.appendChild(formGroup);
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
        inputs: node.inputs,
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
  function updateSelectionVisuals(newSelectedNode) {
    console.log(`Updating selection. Old: ${selectedNode?.id}, New: ${newSelectedNode?.id}`);
    if (selectedNode && selectedNode.element) {
        selectedNode.element.classList.remove('selected');
    }
    selectedNode = newSelectedNode;
    if (selectedNode && selectedNode.element) {
        selectedNode.element.classList.add('selected');
        // Bring selected node to front visually (optional, requires CSS z-index handling)
        // container.appendChild(selectedNode.element); // This changes DOM order
    }
     // Re-render edges maybe? Or handle z-index purely in CSS
  }
  
  // Event handlers
  function handleMouseDown(e) {
    console.log(`--- Mouse Down ---`);
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
        if (connector.type === 'output') {
            tempEdge = {
                sourceNodeId: connector.nodeId,
                sourceConnectorId: connector.connectorId,
                targetPos: pos
            };
            console.log(`    * Starting edge creation from ${connector.nodeId}/${connector.connectorId}`);
            updateSelectionVisuals(null);
        }
         // Prevent default to avoid text selection, etc.
        e.preventDefault();
        // Add move/up listeners for edge creation
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
        updateSelectionVisuals(node);

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

    // Clicked on background - deselect
    console.log(`  > Clicked on background.`);
    updateSelectionVisuals(null);
    selectedConnector = null; // Clear connector state too
    draggedNode = null; // Ensure nothing is dragged
    tempEdge = null; // Ensure no temp edge is drawn
    // No need to add move/up listeners if clicking background
  }
  
  function handleMouseMove(e) {
    // console.log('--- Mouse Move ---'); // Very verbose
    const pos = getMousePosition(e);

    // Handle node dragging
    if (draggedNode) {
        // console.log(`  > Dragging node ${draggedNode.id}`); // Verbose
        const newX = pos.x - dragOffset.x;
        const newY = pos.y - dragOffset.y;

        // Boundary check using node's stored height/width
        const nodeWidth = draggedNode.width;
        const nodeHeight = draggedNode.height;
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        draggedNode.x = Math.max(0, Math.min(containerWidth - nodeWidth, newX));
        draggedNode.y = Math.max(0, Math.min(containerHeight - nodeHeight, newY));
        // console.log(`    * New pos: (${draggedNode.x}, ${draggedNode.y})`); // Verbose

        draggedNode.element.style.left = `${draggedNode.x}px`;
        draggedNode.element.style.top = `${draggedNode.y}px`;

        renderEdges(); // Update edges connected to the dragged node
        e.preventDefault(); // Prevent text selection, etc.
        return; // Don't handle edge creation if dragging node
    }

    // Handle edge creation drag
    if (tempEdge) {
        tempEdge.targetPos = pos;
        renderEdges(); // Redraw the temporary edge
        e.preventDefault(); // Prevent text selection, etc.
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

    // Finalize edge creation
    if (tempEdge) {
        console.log(`  > Finalizing edge creation from ${tempEdge.sourceNodeId}/${tempEdge.sourceConnectorId}`);
        const targetConnector = findConnectorAt(pos.x, pos.y);

        if (targetConnector && targetConnector.type === 'input' && targetConnector.nodeId !== tempEdge.sourceNodeId) {
            console.log(`    * Target connector found:`, targetConnector);
            // Check if target connector is already connected
             const existingEdge = edges.find(edge =>
                 edge.targetNodeId === targetConnector.nodeId &&
                 edge.targetConnectorId === targetConnector.connectorId
             );

             // Check if source connector is already connected (assuming one output connection)
             const existingSourceEdge = edges.find(edge =>
                 edge.sourceNodeId === tempEdge.sourceNodeId &&
                 edge.sourceConnectorId === tempEdge.sourceConnectorId
             );

            if (!existingEdge && !existingSourceEdge) { // Only connect if target input and source output are free
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
                 console.log(`    * Edge creation aborted (connector busy). Existing Target: ${!!existingEdge}, Existing Source: ${!!existingSourceEdge}`);
            }
        } else {
             console.log(`    * No valid target connector found.`);
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
    if (!selectedNode) {
        console.log(`  > Aborted (no node selected)`);
        return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
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

        // Clear selection and update state
        updateSelectionVisuals(null); // Deselect
        renderEdges(); // Redraw edges after removal
        notifyChange();

        e.preventDefault(); // Prevent browser back navigation on Backspace
        console.log(`  > Node ${nodeToDelete.id} deleted.`);
    }
  }
  
  // Public API
  return {
    init: function(selector) {
      container = document.querySelector(selector);
      if (!container) {
        console.error('PanteoNodeEditor Error: Container element not found for selector:', selector);
        return;
      }
      
      // Clear container and set base class
      container.innerHTML = '';
      container.className = 'panteo-node-editor'; // Reset classes
      // Ensure container has position:relative or similar for absolute positioning of nodes/canvas
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      
      // Create canvas for edges
      canvas = document.createElement('canvas');
      canvas.className = 'panteo-canvas';
      // Set initial size - might need adjustment if container size changes later
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      container.appendChild(canvas);
      ctx = canvas.getContext('2d');
      
      // Create palette (ensure it's added to the DOM correctly)
      palette = createPalette();
      if (palette) {
        container.appendChild(palette);
        // Add palette item click handlers (ensure nodeTypes is populated before this)
        const paletteItems = palette.querySelectorAll('.panteo-palette-item');
        let newNodeOffset = 0; // Added to stagger nodes
        paletteItems.forEach(item => {
          item.addEventListener('click', e => {
            const nodeType = e.currentTarget.dataset.nodeType;
             // Position new node with an offset
             const initialX = 50 + newNodeOffset * 20; // Offset X
             const initialY = 50 + newNodeOffset * 20; // Offset Y
             newNodeOffset++; // Increment offset for next node

            const node = createNodeFromType(nodeType, initialX, initialY);
            if (node) {
              console.log(`Adding new node ${node.id} at (${initialX}, ${initialY})`);
              nodes.push(node);
              const nodeElement = node.render(); // Get the rendered element
              container.appendChild(nodeElement); // Append it
              console.log(` > Node element ${node.id} appended to container:`, nodeElement); // DEBUG: Verify append
              updateSelectionVisuals(node); // Select the new node
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
      
      // Handle window resize (or use ResizeObserver for container)
      window.addEventListener('resize', () => {
        if (canvas && container) {
          canvas.width = container.offsetWidth;
          canvas.height = container.offsetHeight;
          renderEdges(); // Redraw edges on resize
        }
      });
      
      return this; // Return the public API
    },
    
    registerNodeType: function(type, config) {
      nodeTypes[type] = config;
      return this;
    },
    
    setNodes: function(nodeData) {
      // Clear existing nodes visuals and state
      nodes.forEach(node => {
        if (node.element && node.element.parentNode) {
          node.element.parentNode.removeChild(node.element);
        }
      });
      nodes = [];
      updateSelectionVisuals(null); // Clear selection
      
      // Create new nodes
      (nodeData || []).forEach(data => {
        const nodeTypeConfig = nodeTypes[data.type];
        if (!nodeTypeConfig) {
          console.warn(`PanteoNodeEditor: Unknown node type "${data.type}"`);
          return;
        }
        const node = new Node(
          data.type,
          data.id,
          data.x,
          data.y,
          data.title || nodeTypeConfig.title, // Use defaults from config
          data.icon || nodeTypeConfig.icon,
          data.inputs || nodeTypeConfig.inputs,
          data.outputs || nodeTypeConfig.outputs
        );
        
        nodes.push(node);
        if (container) { // Ensure container exists before appending
          container.appendChild(node.render()); // Render returns the element
        }
      });
      
      if (ctx) renderEdges(); // Re-render edges after setting nodes
      return this;
    },
    
    setEdges: function(edgeData) {
      edges = (edgeData || []).map(data => new Edge(
        data.sourceNodeId,
        data.sourceConnectorId,
        data.targetNodeId,
        data.targetConnectorId
      ));
       if (ctx) renderEdges(); // Re-render edges after setting them
      return this;
    },
    
    getState: function() {
      return getEditorState();
    },
    
    onChangeListener: function(callback) {
      onChange = callback;
      return this;
    },
    
    loadFromJSON: function(json) {
      try {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        
        this.setNodes(data.nodes || []);
        this.setEdges(data.edges || []);
        
        return this;
      } catch (error) {
        console.error('Failed to load editor data:', error);
        return this;
      }
    },
    
    saveToJSON: function() {
      return JSON.stringify(getEditorState());
    },
    
    destroy: function() {
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
    }
  };
})();
