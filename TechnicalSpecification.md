# Technical Specification: Node-Based Editor Component  

## **1. Overview**  
Develop a native JavaScript node-based editor component with backend/frontend integration. Single iteration - precise implementation is critical.  

---

## **2. Component Requirements**  

### **2.1. Core Functionality**  
- **Initialization**:  
  ```javascript  
  panteoNodeEditor.init(cssSelector) // Replaces DOM element with editor  
  ```  
- **Node Management**:  
  - Add/delete/move nodes via drag-and-drop or palette.  
  - **Keyboard Support**: Delete nodes with `Delete`/`Backspace` keys.  
  - Create, delete, and move nodes  
  - Support for different node types with customizable inputs and outputs  
  - Modal input support for complex data entry  
  - Values from modal inputs displayed in connector labels  
- **Edge Management**:  
  - Create/delete edges between node connectors.  
  - **Visual**: Smooth Bézier curves, enter connectors at 90° angles, minimize crossing nodes.  
  - Validate connections based on node types  
  - Visual feedback for valid and invalid connections  
- **State Management**:  
  - Save and load editor state  
  - Track changes to nodes and edges  
  - Persist modal input values  

### **2.2. Node Structure**  
- **Header**: Title + icon (Google Material Icons [loaded from official CDN] or SVG [placeholder paths for demo]).  
- **Connectors**:  
  - Input/output connectors with labels.  
  - **Dynamic Controls**: Per-connector fields:  
    - Text input / Dropdown / "…" button opening a modal.  
  - Modal input support with multiple field types  
  - Values displayed in connector labels  
- **Modal Properties**:  
  - Form fields: `string`, `number`, `textarea`, `dropdown`.  
  - Each field: `label`, `infoText`, `placeholder`.  
  - Buttons: `Submit` (saves state), `Cancel` (discards changes).  

### **2.3. Node Palette**  
- **Categorized Dropdown**:  
  - Group nodes by categories (e.g., "Inputs", "Logic").  
  - Each category: Header + list of nodes (icon + label).  

### **2.4. Data Handling**  
- **onChange Event**:  
  - Triggered on any structural change (node position, connections, properties).  
  - **Payload**: JSON representing full editor state.  
- **Backend Integration**:  
  - **Frontend (Node.js)**: Loads/saves data via API or static JSON.  
  - **Backend (Node.js)**: REST API to save/retrieve JSON.  
- **State Persistence**:  
  - Save editor state to backend  
  - Load editor state from backend  
  - Handle modal input values  
- **Validation**:  
  - Validate node connections  
  - Validate modal input values  
  - Prevent invalid operations  

---

## **3. UI/UX Requirements**  

### **3.1. Styling**  
- **CSS-Only**: No inline styles.  
- **Visual Identity**:  
  - **Logo Gradient**: `linear-gradient(90deg, #F63C40 0%, #6652E3 100%)` for accents.  
  - **Font**: Inter (loaded via Google Fonts).  
  - **Color Scheme**: Grayscale base with gradient accents; subtle shadows/reflections.  

### **3.2. Responsiveness**  
- Tested on macOS (local) + Ubuntu (remote).  
- **Layout**:  
  - Adapt to container size  
  - Maintain usability at different zoom levels  
  - Support for touch devices  
- **Performance**:  
  - Smooth animations  
  - Efficient rendering of large graphs  
  - Responsive modal dialogs  

### **3.3. Interaction**  
- **Node Operations**:  
  - Drag and drop for moving nodes  
  - Click and drag for creating edges  
  - Double-click for opening modal inputs  
  - Keyboard shortcuts for common operations  
- **Modal Inputs**:  
  - Open on connector click  
  - Save on button click or Enter key  
  - Cancel on Escape key or clicking outside  
  - Real-time validation  

### **3.4. Visual Design**  
- **Nodes**:  
  - Clean, modern appearance  
  - Clear visual hierarchy  
  - Distinct input and output connectors  
  - Modal input values displayed in connector labels  
- **Edges**:  
  - Smooth Bézier curves  
  - Visual feedback for connection states  
  - Clear indication of connection points  
- **Modal Dialogs**:  
  - Consistent with overall design  
  - Clear field labels and help text  
  - Validation feedback  
  - Easy to use interface  

---

## **4. Implementation Details**  

### **4.1. Code Structure**  
- **Node Classes**: Each node type as a separate JS class (e.g., `InputNode`, `LogicNode`).  
- **SVG Icons**: Simple placeholders (e.g., `<svg><path d="..."></svg>`).  
- **Frontend**:  
  - **Core Components**:  
    - Node class for managing node behavior  
    - Edge class for managing edge behavior  
    - Modal class for managing modal dialogs  
    - Editor class for managing the overall editor  
  - **State Management**:  
    - Track node and edge state  
    - Handle modal input values  
    - Manage undo/redo history  
  - **Event Handling**:  
    - Mouse and keyboard events  
    - Touch events for mobile devices  
    - Custom events for state changes  

### **4.2. Testing Data**  
- **Sample Nodes**:  
  - Categories: e.g., "Sources", "Filters".  
  - Varied fields: Mix text inputs, dropdowns, modals.  

### **4.3. Backend**  
- **API Endpoints**:  
  - Save editor state  
  - Load editor state  
  - Handle modal input values  
- **Data Storage**:  
  - Store editor state in database  
  - Handle modal input values  
  - Support for versioning  
- **Security**:  
  - Validate input data  
  - Sanitize output data  
  - Handle authentication and authorization  

---

## **5. Deployment**  

### **5.1. Files**  
- **`install.sh`**: Installs Node.js, npm, dependencies.  
- **`README.md`**:  
  - Setup instructions, API endpoints, environment variables.  
- **`.env`**: Stores secrets (e.g., `PORT=3000`).  
- **`.gitignore`**: Excludes `node_modules`, `.env`, logs.  

### **5.2. Environment Setup**  
- **Development**:  
  - Local development server  
  - Hot reloading  
  - Debug tools  
- **Production**:  
  - Optimized build  
  - CDN deployment  
  - Error tracking  

### **5.3. Monitoring**  
- **Performance**:  
  - Track rendering performance  
  - Monitor memory usage  
  - Log error rates  
- **Usage**:  
  - Track user interactions  
  - Monitor modal usage  
  - Analyze error patterns  

---

## **6. Critical Additions**  
**You missed**:  
1. **Data Schema**: Define exact JSON structure for nodes/edges (developer must document this).  
2. **Backend Framework**: Specify Express.js/Fastify for the Node.js backend.  
3. **Error Handling**: Frontend/backend error logging + user notifications.  
4. **Security**: Input validation, CORS, rate limiting (if public-facing).  
5. **SVG Fallbacks**: Plan for broken Material Icons (e.g., show text label).  

### **6.1. Modal Input Support**  
- **Field Types**:  
  - Text input  
  - Number input  
  - Textarea  
  - Dropdown  
- **Validation**:  
  - Required fields  
  - Type validation  
  - Custom validation rules  
- **Value Storage**:  
  - Store values in node state  
  - Display values in connector labels  
  - Handle value updates  

### **6.2. Value Display**  
- **Connector Labels**:  
  - Display modal input values  
  - Format values for readability  
  - Handle multiple values  
- **Updates**:  
  - Update labels on value changes  
  - Handle value removal  
  - Maintain label consistency  

---

## **7. Deliverables**  
1. Editor component (native JS).  
2. Frontend/backend (Node.js).  
3. Full documentation + testing setup.  
4. Deployment scripts.  

## **8. Testing**  

### **8.1. Unit Tests**  
- **Components**:  
  - Node class  
  - Edge class  
  - Modal class  
  - Editor class  
- **State Management**:  
  - Node state  
  - Edge state  
  - Modal state  

### **8.2. Integration Tests**  
- **User Interactions**:  
  - Node operations  
  - Edge operations  
  - Modal operations  
- **State Persistence**:  
  - Save state  
  - Load state  
  - Handle modal values  

### **8.3. End-to-End Tests**  
- **Workflows**:  
  - Create and connect nodes  
  - Use modal inputs  
  - Save and load state  
- **Error Handling**:  
  - Invalid operations  
  - Network errors  
  - Validation errors  