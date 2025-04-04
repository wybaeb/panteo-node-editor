# API Documentation

This document provides a comprehensive overview of the Panteo Node Editor API, including both frontend and backend methods.

## Frontend API

The frontend API is exposed through the `PanteoNodeEditor` module, which provides methods for initializing, configuring, and interacting with the editor.

### Core Methods

#### `init(container, options)`

Initializes the editor in the specified container with the given options.

**Parameters:**
- `container` (HTMLElement): The DOM element to render the editor in
- `options` (Object): Configuration options for the editor
  - `width` (number): Width of the editor in pixels
  - `height` (number): Height of the editor in pixels
  - `backgroundColor` (string): Background color of the editor
  - `gridSize` (number): Size of the grid in pixels
  - `snapToGrid` (boolean): Whether to snap nodes to the grid
  - `nodeTypes` (Object): Predefined node types to register

**Returns:**
- `Object`: The editor instance

**Example:**
```javascript
const editor = PanteoNodeEditor.init(document.getElementById('editor'), {
  width: 800,
  height: 600,
  backgroundColor: '#f5f5f5',
  gridSize: 20,
  snapToGrid: true,
  nodeTypes: {
    input_number: {
      title: 'Number Input',
      icon: 'input',
      inputs: [],
      outputs: [
        { id: 'output', label: 'Output' }
      ]
    }
  }
});
```

#### `registerNodeType(type, config)`

Registers a new node type with the editor.

**Parameters:**
- `type` (string): The type identifier for the node
- `config` (Object): Configuration for the node type
  - `title` (string): Display title for the node
  - `icon` (string): Material icon name or SVG path
  - `inputs` (Array): Array of input connector configurations
  - `outputs` (Array): Array of output connector configurations

**Returns:**
- `boolean`: Whether the registration was successful

**Example:**
```javascript
editor.registerNodeType('output_action', {
  title: 'Action',
  icon: 'play_arrow',
  inputs: [
    {
      id: 'input',
      label: 'Input',
      control: {
        type: 'modal',
        fields: [
          {
            name: 'text_value',
            label: 'Text Input',
            type: 'string',
            placeholder: 'Enter text value...',
            infoText: 'This is a simple text input field'
          },
          {
            name: 'number_value',
            label: 'Number Input',
            type: 'number',
            placeholder: '0',
            infoText: 'Enter a numeric value'
          }
        ]
      }
    }
  ],
  outputs: []
});
```

#### `setNodes(nodes)`

Sets the nodes in the editor, replacing any existing nodes.

**Parameters:**
- `nodes` (Array): Array of node objects to set

**Returns:**
- `boolean`: Whether the operation was successful

**Example:**
```javascript
editor.setNodes([
  {
    id: 'node1',
    type: 'input_number',
    x: 100,
    y: 100,
    title: 'Number Input',
    icon: 'input',
    inputs: [],
    outputs: [
      { id: 'output', label: 'Output' }
    ]
  },
  {
    id: 'node2',
    type: 'output_action',
    x: 400,
    y: 100,
    title: 'Action',
    icon: 'play_arrow',
    inputs: [
      {
        id: 'input',
        label: 'Input',
        control: {
          type: 'modal',
          fields: [
            {
              name: 'text_value',
              label: 'Text Input',
              type: 'string',
              placeholder: 'Enter text value...',
              infoText: 'This is a simple text input field'
            },
            {
              name: 'number_value',
              label: 'Number Input',
              type: 'number',
              placeholder: '0',
              infoText: 'Enter a numeric value'
            }
          ]
        },
        value: {
          text_value: 'Hello',
          number_value: '42'
        }
      }
    ],
    outputs: []
  }
]);
```

#### `setEdges(edges)`

Sets the edges in the editor, replacing any existing edges.

**Parameters:**
- `edges` (Array): Array of edge objects to set

**Returns:**
- `boolean`: Whether the operation was successful

**Example:**
```javascript
editor.setEdges([
  {
    id: 'edge1',
    sourceNodeId: 'node1',
    sourceConnectorId: 'output',
    targetNodeId: 'node2',
    targetConnectorId: 'input'
  }
]);
```

#### `getState()`

Gets the current state of the editor, including nodes and edges.

**Returns:**
- `Object`: The current editor state
  - `nodes` (Array): Array of node objects
  - `edges` (Array): Array of edge objects

**Example:**
```javascript
const state = editor.getState();
console.log(state.nodes);
console.log(state.edges);
```

#### `loadFromJSON(json)`

Loads the editor state from a JSON string or object.

**Parameters:**
- `json` (string|Object): JSON string or object representing the editor state

**Returns:**
- `boolean`: Whether the operation was successful

**Example:**
```javascript
const json = `{
  "nodes": [
    {
      "id": "node1",
      "type": "input_number",
      "x": 100,
      "y": 100,
      "title": "Number Input",
      "icon": "input",
      "inputs": [],
      "outputs": [
        { "id": "output", "label": "Output" }
      ]
    }
  ],
  "edges": []
}`;
editor.loadFromJSON(json);
```

#### `saveToJSON()`

Saves the current editor state to a JSON string.

**Returns:**
- `string`: JSON string representing the current editor state

**Example:**
```javascript
const json = editor.saveToJSON();
console.log(json);
```

### Modal Values

When working with modal inputs, the values entered by the user are stored in the `value` property of the input connector. These values are displayed in the connector label, separated by commas.

**Example:**
```javascript
// Get the value of a modal input
const node = editor.getNode('node2');
const input = node.inputs.find(input => input.id === 'input');
console.log(input.value);
// Output: { text_value: 'Hello', number_value: '42' }

// Set the value of a modal input
input.value = {
  text_value: 'World',
  number_value: '123'
};
editor.updateNode(node);
```

## Backend API

The backend API provides endpoints for saving and retrieving the editor state.

### Endpoints

#### `POST /api/editor/state`

Saves the editor state.

**Request Body:**
```json
{
  "nodes": [
    // Array of node objects
  ],
  "edges": [
    // Array of edge objects
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Editor state saved successfully"
}
```

#### `GET /api/editor/state`

Retrieves the editor state.

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      // Array of node objects
    ],
    "edges": [
      // Array of edge objects
    ]
  }
}
```

### Error Handling

The backend API returns appropriate HTTP status codes and error messages in case of failures:

- `400 Bad Request`: Invalid request body or parameters
- `404 Not Found`: Requested resource not found
- `500 Internal Server Error`: Server-side error

**Error Response Example:**
```json
{
  "success": false,
  "error": "Invalid node type: unknown_type"
}
```

## Data Schema

### Node Object

```javascript
{
  "id": "unique-node-id",        // Unique identifier for the node
  "type": "node-type",           // Type of node (must be registered)
  "x": 100,                      // X position in the editor
  "y": 100,                      // Y position in the editor
  "title": "Node Title",         // Display title
  "icon": "material-icon-name",  // Material icon name or SVG path
  "inputs": [                    // Array of input connectors
    {
      "id": "input-id",          // Unique identifier for the connector
      "label": "Input Label",    // Display label
      "control": {               // Optional control for the connector
        "type": "text|dropdown|modal", // Type of control
        "value": "current-value",      // Current value
        "placeholder": "Placeholder text", // Placeholder text for text inputs
        "options": [                   // Options for dropdown controls
          { "value": "option-value", "label": "Option Label" }
        ]
      }
    }
  ],
  "outputs": [                   // Array of output connectors
    {
      "id": "output-id",         // Unique identifier for the connector
      "label": "Output Label"    // Display label
    }
  ]
}
```

### Edge Object

```javascript
{
  "id": "unique-edge-id",            // Unique identifier for the edge
  "sourceNodeId": "source-node-id",  // ID of the source node
  "sourceConnectorId": "source-connector-id", // ID of the source connector
  "targetNodeId": "target-node-id",  // ID of the target node
  "targetConnectorId": "target-connector-id"  // ID of the target connector
}
```

### Editor State

```javascript
{
  "nodes": [
    // Node objects
  ],
  "edges": [
    // Edge objects
  ]
}
```
