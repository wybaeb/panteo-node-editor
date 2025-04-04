# API Documentation

## Frontend API

The `panteoNodeEditor` object provides a comprehensive API for interacting with the node editor component.

### Core Methods

#### `init(selector)`
Initializes the editor in the specified DOM element.

- **Parameters:**
  - `selector` (string): CSS selector for the container element

- **Returns:** The panteoNodeEditor object for chaining

- **Example:**
```javascript
panteoNodeEditor.init('#editor');
```

#### `registerNodeType(type, config)`
Registers a new node type with the specified configuration.

- **Parameters:**
  - `type` (string): Unique identifier for the node type
  - `config` (object): Configuration object for the node type
    - `category` (string): Category for grouping in the palette
    - `title` (string): Display title for the node
    - `icon` (string): Material icon name or SVG path
    - `inputs` (array): Array of input connector objects
    - `outputs` (array): Array of output connector objects

- **Returns:** The panteoNodeEditor object for chaining

- **Example:**
```javascript
panteoNodeEditor.registerNodeType('input_number', {
  category: 'Sources',
  title: 'Number Input',
  icon: 'input',
  inputs: [],
  outputs: [
    { id: 'output', label: 'Output' }
  ]
});
```

#### `setNodes(nodeData)`
Sets the nodes in the editor.

- **Parameters:**
  - `nodeData` (array): Array of node objects

- **Returns:** The panteoNodeEditor object for chaining

- **Example:**
```javascript
panteoNodeEditor.setNodes([
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
  }
]);
```

#### `setEdges(edgeData)`
Sets the edges in the editor.

- **Parameters:**
  - `edgeData` (array): Array of edge objects

- **Returns:** The panteoNodeEditor object for chaining

- **Example:**
```javascript
panteoNodeEditor.setEdges([
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
Returns the current state of the editor.

- **Returns:** Object containing nodes and edges arrays

- **Example:**
```javascript
const state = panteoNodeEditor.getState();
console.log(state.nodes, state.edges);
```

#### `onChangeListener(callback)`
Sets a callback function to be called when the editor state changes.

- **Parameters:**
  - `callback` (function): Function to call with the new state

- **Returns:** The panteoNodeEditor object for chaining

- **Example:**
```javascript
panteoNodeEditor.onChangeListener(function(data) {
  console.log('Editor state changed:', data);
});
```

#### `loadFromJSON(json)`
Loads the editor state from a JSON object or string.

- **Parameters:**
  - `json` (object|string): Editor state as JSON object or string

- **Returns:** The panteoNodeEditor object for chaining

- **Example:**
```javascript
panteoNodeEditor.loadFromJSON({
  nodes: [...],
  edges: [...]
});
```

#### `saveToJSON()`
Returns the editor state as a JSON string.

- **Returns:** JSON string representing the editor state

- **Example:**
```javascript
const jsonState = panteoNodeEditor.saveToJSON();
localStorage.setItem('editorState', jsonState);
```

## Backend API

The backend provides REST endpoints for saving and retrieving the editor state.

### Endpoints

#### `GET /api/editor-data`
Retrieves the current editor state.

- **Response:**
  - 200 OK: Returns the editor state as JSON
  - 500 Internal Server Error: If an error occurs

- **Example Response:**
```json
{
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
  "edges": [
    {
      "id": "edge1",
      "sourceNodeId": "node1",
      "sourceConnectorId": "output",
      "targetNodeId": "node2",
      "targetConnectorId": "input"
    }
  ]
}
```

#### `POST /api/editor-data`
Saves the editor state.

- **Request Body:**
  - JSON object containing nodes and edges arrays

- **Response:**
  - 200 OK: Returns success message
  - 400 Bad Request: If the request body is invalid
  - 500 Internal Server Error: If an error occurs

- **Example Request:**
```json
{
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
  "edges": [
    {
      "id": "edge1",
      "sourceNodeId": "node1",
      "sourceConnectorId": "output",
      "targetNodeId": "node2",
      "targetConnectorId": "input"
    }
  ]
}
```

- **Example Response:**
```json
{
  "success": true,
  "message": "Editor data saved successfully"
}
```

#### `GET /api/health`
Health check endpoint.

- **Response:**
  - 200 OK: Returns status message

- **Example Response:**
```json
{
  "status": "ok"
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
