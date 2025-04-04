# Panteo Node Editor

A powerful, native JavaScript node-based editor for creating visual programming interfaces.

## Features

- **Native JavaScript Implementation**: No dependencies on external libraries or frameworks
- **Node and Edge Management**: Create, connect, and manage nodes and edges with ease
- **Keyboard Support**: Full keyboard navigation and shortcuts for efficient editing
- **Backend Integration**: Seamless integration with backend services for data persistence
- **Modal Input Support**: Rich input controls with modal dialogs for complex data entry
- **Responsive Design**: Adapts to different screen sizes and resolutions
- **Customizable Styling**: Easily customize the appearance to match your application's theme

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/panteo-node-editor.git
   cd panteo-node-editor
   ```

2. Run the installation script:
   ```bash
   ./install.sh
   ```

3. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Usage

### Starting the Server

```bash
npm start
```

The editor will be available at `http://localhost:3000`.

### Integrating the Editor

1. Include the necessary files in your HTML:
   ```html
   <link rel="stylesheet" href="/public/panteoNodeEditor.css">
   <script src="/public/panteoNodeEditor.js"></script>
   ```

2. Create a container for the editor:
   ```html
   <div id="editor"></div>
   ```

3. Initialize the editor:
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

### Working with Modal Inputs

The editor supports modal inputs for complex data entry. Here's how to work with them:

1. Register a node type with modal inputs:
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

2. Access and modify modal input values:
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

3. The values will be displayed in the connector label, separated by commas.

## API Reference

See [API Documentation](docs/api.md) for a comprehensive overview of the available methods and endpoints.

## Data Schema

See [Schema Documentation](docs/schema.md) for detailed information about the JSON structure for nodes and edges.

## Customization

### Styling

The editor's appearance can be customized by modifying the CSS variables in `public/panteoNodeEditor.css`:

```css
:root {
  --panteo-node-background: #ffffff;
  --panteo-node-border: #e0e0e0;
  --panteo-node-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --panteo-connector-background: #f5f5f5;
  --panteo-connector-border: #e0e0e0;
  --panteo-edge-color: #2196f3;
  --panteo-edge-width: 2px;
  --panteo-grid-color: #f0f0f0;
  --panteo-grid-size: 20px;
}
```

### Node Types

You can register custom node types with the editor:

```javascript
editor.registerNodeType('custom_node', {
  title: 'Custom Node',
  icon: 'star',
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
          }
        ]
      }
    }
  ],
  outputs: [
    { id: 'output', label: 'Output' }
  ]
});
```

## Security Considerations

- **Input Validation**: All user inputs are validated to prevent injection attacks
- **Data Sanitization**: Data is sanitized before being saved or displayed
- **CORS**: Cross-Origin Resource Sharing is properly configured
- **Authentication**: API endpoints are protected with authentication
- **HTTPS**: All communications are encrypted using HTTPS

## Testing

The editor includes a comprehensive test suite:

```bash
npm test
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgements

- [Inter Font](https://fonts.google.com/specimen/Inter) by Rasmus Andersson
- [Material Icons](https://material.io/resources/icons/) by Google
