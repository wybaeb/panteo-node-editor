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
      this.height = 0; // Will be calculated when rendered
      this.element = null;
    }
    
    render() {
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
          
          outputGroup.appendChild(connector);
        });
        
        content.appendChild(outputGroup);
      }
      
      nodeEl.appendChild(content);
      this.element = nodeEl;
      
      // Calculate height
      this.height = nodeEl.offsetHeight;
      
      return nodeEl;
    }
    
    getConnectorPosition(connectorId, type) {
      if (!this.element) return null;
      
      const connectors = this.element.querySelectorAll(`.panteo-connector-${type}`);
      for (let i = 0; i < connectors.length; i++) {
        if (connectors[i].dataset.connectorId === connectorId) {
          const rect = connectors[i].getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.top + rect.height / 2 - containerRect.top
          };
        }
      }
      
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
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
  
  function findNodeAt(x, y) {
    // Search in reverse order to find the topmost node
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (
        x >= node.x &&
        x <= node.x + node.width &&
        y >= node.y &&
        y <= node.y + node.height
      ) {
        return node;
      }
    }
    return null;
  }
  
  function findConnectorAt(x, y) {
    const elements = document.elementsFromPoint(x, y);
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el.classList.contains('panteo-connector-point')) {
        return {
          nodeId: el.dataset.nodeId,
          connectorId: el.dataset.connectorId,
          type: el.dataset.connectorType
        };
      }
    }
    return null;
  }
  
  function renderEdges() {
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
          
          // Calculate control points for a smooth curve
          const dx = tempEdge.targetPos.x - sourcePos.x;
          const controlPointOffset = Math.min(Math.abs(dx) * 0.5, 150);
          
          ctx.bezierCurveTo(
            sourcePos.x + controlPointOffset, sourcePos.y,
            tempEdge.targetPos.x - controlPointOffset, tempEdge.targetPos.y,
            tempEdge.targetPos.x, tempEdge.targetPos.y
          );
          
          ctx.strokeStyle = '#6c757d';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
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
  
  // Event handlers
  function handleMouseDown(e) {
    const pos = getMousePosition(e);
    
    // Check if clicked on a connector
    const connector = findConnectorAt(e.clientX, e.clientY);
    if (connector) {
      selectedConnector = connector;
      
      // If output connector, start creating an edge
      if (connector.type === 'output') {
        tempEdge = {
          sourceNodeId: connector.nodeId,
          sourceConnectorId: connector.connectorId,
          targetPos: pos
        };
      }
      
      return;
    }
    
    // Check if clicked on a node
    const node = findNodeAt(pos.x, pos.y);
    if (node) {
      // Move node to the end of the array to render it on top
      const index = nodes.indexOf(node);
      nodes.splice(index, 1);
      nodes.push(node);
      
      // Start dragging
      draggedNode = node;
      dragOffset = {
        x: pos.x - node.x,
        y: pos.y - node.y
      };
      
      // Re-render nodes
      renderEdges();
      
      return;
    }
  }
  
  function handleMouseMove(e) {
    const pos = getMousePosition(e);
    
    // If dragging a node, update its position
    if (draggedNode) {
      draggedNode.x = pos.x - dragOffset.x;
      draggedNode.y = pos.y - dragOffset.y;
      
      // Update node element position
      draggedNode.element.style.left = `${draggedNode.x}px`;
      draggedNode.element.style.top = `${draggedNode.y}px`;
      
      // Re-render edges
      renderEdges();
      
      return;
    }
    
    // If creating an edge, update target position
    if (tempEdge) {
      tempEdge.targetPos = pos;
      renderEdges();
      
      return;
    }
  }
  
  function handleMouseUp(e) {
    // If dragging a node, stop dragging
    if (draggedNode) {
      draggedNode = null;
      notifyChange();
    }
    
    // If creating an edge, check if released on an input connector
    if (tempEdge) {
      const connector = findConnectorAt(e.clientX, e.clientY);
      
      if (connector && connector.type === 'input') {
        // Create new edge
        const edge = new Edge(
          tempEdge.sourceNodeId,
          tempEdge.sourceConnectorId,
          connector.nodeId,
          connector.connectorId
        );
        
        edges.push(edge);
        notifyChange();
      }
      
      tempEdge = null;
      renderEdges();
    }
    
    selectedConnector = null;
  }
  
  function handleKeyDown(e) {
    // Delete selected node with Delete or Backspace key
    if ((e.key === 'Delete' || e.key === 'Backspace') && draggedNode) {
      // Remove all edges connected to this node
      edges = edges.filter(edge => 
        edge.sourceNodeId !== draggedNode.id && edge.targetNodeId !== draggedNode.id
      );
      
      // Remove node element from DOM
      if (draggedNode.element && draggedNode.element.parentNode) {
        draggedNode.element.parentNode.removeChild(draggedNode.element);
      }
      
      // Remove node from array
      const index = nodes.indexOf(draggedNode);
      if (index !== -1) {
        nodes.splice(index, 1);
      }
      
      draggedNode = null;
      renderEdges();
      notifyChange();
    }
  }
  
  // Public API
  return {
    init: function(selector) {
      // Get container element
      container = document.querySelector(selector);
      if (!container) {
        console.error('Container element not found');
        return;
      }
      
      // Clear container
      container.innerHTML = '';
      container.className = 'panteo-node-editor';
      
      // Create canvas for edges
      canvas = document.createElement('canvas');
      canvas.className = 'panteo-canvas';
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      container.appendChild(canvas);
      
      // Get canvas context
      ctx = canvas.getContext('2d');
      
      // Create palette
      palette = createPalette();
      container.appendChild(palette);
      
      // Add event listeners
      container.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('keydown', handleKeyDown);
      
      // Add event listeners for palette
      const paletteItems = palette.querySelectorAll('.panteo-palette-item');
      paletteItems.forEach(item => {
        item.addEventListener('click', e => {
          const nodeType = e.currentTarget.dataset.nodeType;
          const pos = getMousePosition(e);
          
          // Create new node
          const node = createNodeFromType(nodeType, pos.x, pos.y);
          if (node) {
            nodes.push(node);
            container.appendChild(node.render());
            notifyChange();
          }
        });
      });
      
      // Handle window resize
      window.addEventListener('resize', () => {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        renderEdges();
      });
      
      return this;
    },
    
    registerNodeType: function(type, config) {
      nodeTypes[type] = config;
      return this;
    },
    
    setNodes: function(nodeData) {
      // Clear existing nodes
      nodes.forEach(node => {
        if (node.element && node.element.parentNode) {
          node.element.parentNode.removeChild(node.element);
        }
      });
      
      nodes = [];
      
      // Create new nodes
      nodeData.forEach(data => {
        const node = new Node(
          data.type,
          data.id,
          data.x,
          data.y,
          data.title,
          data.icon,
          data.inputs,
          data.outputs
        );
        
        nodes.push(node);
        container.appendChild(node.render());
      });
      
      renderEdges();
      return this;
    },
    
    setEdges: function(edgeData) {
      edges = edgeData.map(data => new Edge(
        data.sourceNodeId,
        data.sourceConnectorId,
        data.targetNodeId,
        data.targetConnectorId
      ));
      
      renderEdges();
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
    }
  };
})();
