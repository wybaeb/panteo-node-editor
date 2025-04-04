# Panteo Node Editor

A native JavaScript node-based editor component with backend/frontend integration. This component allows users to create, edit, and manage node-based workflows with a clean, modern interface.

![Panteo Node Editor](https://via.placeholder.com/800x400?text=Panteo+Node+Editor)

## Features

- **Native JavaScript**: No external dependencies for the core editor component
- **Node Management**: Add, delete, and move nodes via drag-and-drop or palette
- **Edge Management**: Create and delete edges between node connectors with smooth Bézier curves
- **Keyboard Support**: Delete nodes with Delete/Backspace keys
- **Dynamic Controls**: Per-connector fields including text input, dropdown, and modal buttons
- **Node Palette**: Categorized dropdown for adding new nodes
- **Backend Integration**: REST API for saving and retrieving editor state
- **Modern UI**: Clean design with gradient accents and subtle shadows

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/panteo-node-editor.git
cd panteo-node-editor
```

2. Run the installation script:
```bash
chmod +x install.sh
./install.sh
```

Alternatively, you can install dependencies manually:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```
PORT=3000
NODE_ENV=development
```

## Usage

### Starting the Server

```bash
npm start
```

The server will start on port 3000 (or the port specified in your `.env` file). Open your browser and navigate to `http://localhost:3000` to see the editor in action.

### Frontend Component Usage

To use the node editor component in your own project:

1. Include the CSS and JS files:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<link rel="stylesheet" href="panteoNodeEditor.css">
<script src="panteoNodeEditor.js"></script>
```

2. Create a container element:
```html
<div id="editor" style="width: 100%; height: 600px;"></div>
```

3. Initialize the editor:
```javascript
// Register node types
panteoNodeEditor.registerNodeType('input_number', {
  category: 'Sources',
  title: 'Number Input',
  icon: 'input',
  inputs: [],
  outputs: [
    { id: 'output', label: 'Output' }
  ]
});

// Initialize editor
panteoNodeEditor.init('#editor');

// Set up onChange event
panteoNodeEditor.onChangeListener(function(data) {
  console.log('Editor state changed:', data);
});
```

### API Reference

#### Frontend API

The `panteoNodeEditor` object provides the following methods:

- **init(selector)**: Initializes the editor in the specified DOM element
- **registerNodeType(type, config)**: Registers a new node type with the specified configuration
- **setNodes(nodeData)**: Sets the nodes in the editor
- **setEdges(edgeData)**: Sets the edges in the editor
- **getState()**: Returns the current state of the editor
- **onChangeListener(callback)**: Sets a callback function to be called when the editor state changes
- **loadFromJSON(json)**: Loads the editor state from a JSON object or string
- **saveToJSON()**: Returns the editor state as a JSON string

#### Backend API

The backend provides the following REST endpoints:

- **GET /api/editor-data**: Retrieves the current editor state
- **POST /api/editor-data**: Saves the editor state
- **GET /api/health**: Health check endpoint

## Data Schema

### Node Structure

```javascript
{
  "id": "unique-node-id",
  "type": "node-type",
  "x": 100,
  "y": 100,
  "title": "Node Title",
  "icon": "material-icon-name",
  "inputs": [
    {
      "id": "input-id",
      "label": "Input Label",
      "control": {
        "type": "text|dropdown|modal",
        "value": "current-value",
        "placeholder": "Placeholder text",
        "options": [
          { "value": "option-value", "label": "Option Label" }
        ]
      }
    }
  ],
  "outputs": [
    {
      "id": "output-id",
      "label": "Output Label"
    }
  ]
}
```

### Edge Structure

```javascript
{
  "id": "unique-edge-id",
  "sourceNodeId": "source-node-id",
  "sourceConnectorId": "source-connector-id",
  "targetNodeId": "target-node-id",
  "targetConnectorId": "target-connector-id"
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

## Customization

### Styling

The editor uses CSS variables for easy customization:

```css
:root {
  --panteo-gradient: linear-gradient(90deg, #F63C40 0%, #6652E3 100%);
  --panteo-bg-color: #f8f9fa;
  --panteo-node-bg: #ffffff;
  --panteo-node-border: #e9ecef;
  --panteo-text-primary: #212529;
  --panteo-text-secondary: #6c757d;
  --panteo-connector-input: #6652E3;
  --panteo-connector-output: #F63C40;
  --panteo-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}
```

### Adding Custom Node Types

```javascript
panteoNodeEditor.registerNodeType('custom_node', {
  category: 'Custom',
  title: 'Custom Node',
  icon: 'extension',
  inputs: [
    { 
      id: 'input1', 
      label: 'Input 1',
      control: {
        type: 'text',
        placeholder: 'Enter value'
      }
    }
  ],
  outputs: [
    { id: 'output1', label: 'Output 1' }
  ]
});
```

## Security Considerations

The backend implementation includes several security features:

- **Input Validation**: All API requests are validated to ensure they contain the required data in the correct format
- **CORS**: Cross-Origin Resource Sharing is enabled to control which domains can access the API
- **Rate Limiting**: API requests are limited to 100 requests per minute per IP address
- **Error Handling**: Detailed error messages are only shown in development mode

## Testing

To test the application:

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to `http://localhost:3000`

3. Try the following operations:
   - Add nodes from the palette
   - Connect nodes by dragging from output to input connectors
   - Move nodes by dragging their headers
   - Delete nodes by selecting them and pressing Delete or Backspace
   - Save and load the editor state using the buttons

## Troubleshooting

### Common Issues

- **Icons not loading**: Ensure you have included the Google Material Icons CSS link in your HTML
- **Nodes not connecting**: Check that you're dragging from an output connector to an input connector
- **Backend not saving data**: Verify that the data directory exists and is writable

### Error Logging

The backend logs errors to the console. Check the server logs for detailed error messages.

## License

This project is licensed under the ISC License.

## Acknowledgements

- [Inter Font](https://fonts.google.com/specimen/Inter) by Rasmus Andersson
- [Material Icons](https://material.io/resources/icons/) by Google
