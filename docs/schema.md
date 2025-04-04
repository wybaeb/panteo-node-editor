# JSON Schema Documentation

This document defines the exact JSON structure for nodes and edges in the Panteo Node Editor.

## Editor State Schema

The complete editor state is represented as a JSON object with two main properties: `nodes` and `edges`.

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

## Node Schema

Each node in the editor is represented by a JSON object with the following properties:

```json
{
  "id": "string",
  "type": "string",
  "x": "number",
  "y": "number",
  "title": "string",
  "icon": "string",
  "inputs": [
    // Array of input connector objects
  ],
  "outputs": [
    // Array of output connector objects
  ]
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the node |
| `type` | string | Yes | Type of node (must be registered with the editor) |
| `x` | number | Yes | X coordinate position in the editor |
| `y` | number | Yes | Y coordinate position in the editor |
| `title` | string | Yes | Display title for the node |
| `icon` | string | Yes | Material icon name or SVG path |
| `inputs` | array | Yes | Array of input connector objects |
| `outputs` | array | Yes | Array of output connector objects |

## Connector Schema

Input and output connectors are represented by JSON objects with the following properties:

### Input Connector

```json
{
  "id": "string",
  "label": "string",
  "control": {
    // Optional control object
  },
  "value": {
    // Optional value object for storing modal input values
  }
}
```

### Output Connector

```json
{
  "id": "string",
  "label": "string"
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the connector within the node |
| `label` | string | Yes | Display label for the connector |
| `control` | object | No | Control configuration for input connectors |
| `value` | object | No | Values stored from modal inputs |

## Control Schema

Controls for input connectors can be of different types, each with its own schema:

### Text Input Control

```json
{
  "type": "text",
  "value": "string",
  "placeholder": "string"
}
```

### Dropdown Control

```json
{
  "type": "dropdown",
  "value": "string",
  "options": [
    {
      "value": "string",
      "label": "string"
    }
  ]
}
```

### Modal Control

```json
{
  "type": "modal",
  "fields": [
    {
      "name": "string",
      "label": "string",
      "type": "string",
      "value": "string",
      "placeholder": "string",
      "infoText": "string",
      "options": [
        {
          "value": "string",
          "label": "string"
        }
      ]
    }
  ]
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | Yes | Type of control: "text", "dropdown", or "modal" |
| `value` | string | No | Current value of the control |
| `placeholder` | string | No | Placeholder text for text inputs |
| `options` | array | No | Array of option objects for dropdown controls |
| `fields` | array | No | Array of field objects for modal controls |
| `infoText` | string | No | Help text displayed below the field label |

## Modal Values Schema

When a modal control is used, the values entered by the user are stored in the `value` property of the input connector:

```json
{
  "text_value": "string",
  "number_value": "number",
  "textarea_value": "string",
  "dropdown_value": "string"
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `text_value` | string | No | Value entered in the text input field |
| `number_value` | number | No | Value entered in the number input field |
| `textarea_value` | string | No | Value entered in the textarea field |
| `dropdown_value` | string | No | Value selected from the dropdown |

These values are displayed in the connector label, separated by commas.

## Edge Schema

Each edge in the editor is represented by a JSON object with the following properties:

```json
{
  "id": "string",
  "sourceNodeId": "string",
  "sourceConnectorId": "string",
  "targetNodeId": "string",
  "targetConnectorId": "string"
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the edge |
| `sourceNodeId` | string | Yes | ID of the source node |
| `sourceConnectorId` | string | Yes | ID of the source connector (must be an output connector) |
| `targetNodeId` | string | Yes | ID of the target node |
| `targetConnectorId` | string | Yes | ID of the target connector (must be an input connector) |

## Example

Here's a complete example of an editor state with two nodes connected by an edge:

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
        {
          "id": "output",
          "label": "Output"
        }
      ]
    },
    {
      "id": "node2",
      "type": "output_action",
      "x": 400,
      "y": 100,
      "title": "Action",
      "icon": "play_arrow",
      "inputs": [
        {
          "id": "input",
          "label": "Input",
          "control": {
            "type": "modal",
            "fields": [
              {
                "name": "text_value",
                "label": "Text Input",
                "type": "string",
                "placeholder": "Enter text value...",
                "infoText": "This is a simple text input field"
              },
              {
                "name": "number_value",
                "label": "Number Input",
                "type": "number",
                "placeholder": "0",
                "infoText": "Enter a numeric value"
              }
            ]
          },
          "value": {
            "text_value": "Hello",
            "number_value": "42"
          }
        }
      ],
      "outputs": []
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
