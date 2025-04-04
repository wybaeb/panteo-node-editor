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
- **Edge Management**:  
  - Create/delete edges between node connectors.  
  - **Visual**: Smooth Bézier curves, enter connectors at 90° angles, minimize crossing nodes.  

### **2.2. Node Structure**  
- **Header**: Title + icon (Google Material Icons [loaded from official CDN] or SVG [placeholder paths for demo]).  
- **Connectors**:  
  - Input/output connectors with labels.  
  - **Dynamic Controls**: Per-connector fields:  
    - Text input / Dropdown / "…" button opening a modal.  
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

---

## **4. Implementation Details**  

### **4.1. Code Structure**  
- **Node Classes**: Each node type as a separate JS class (e.g., `InputNode`, `LogicNode`).  
- **SVG Icons**: Simple placeholders (e.g., `<svg><path d="..."></svg>`).  

### **4.2. Testing Data**  
- **Sample Nodes**:  
  - Categories: e.g., "Sources", "Filters".  
  - Varied fields: Mix text inputs, dropdowns, modals.  

---

## **5. Deployment**  

### **5.1. Files**  
- **`install.sh`**: Installs Node.js, npm, dependencies.  
- **`README.md`**:  
  - Setup instructions, API endpoints, environment variables.  
- **`.env`**: Stores secrets (e.g., `PORT=3000`).  
- **`.gitignore`**: Excludes `node_modules`, `.env`, logs.  

---

## **6. Critical Additions**  
**You missed**:  
1. **Data Schema**: Define exact JSON structure for nodes/edges (developer must document this).  
2. **Backend Framework**: Specify Express.js/Fastify for the Node.js backend.  
3. **Error Handling**: Frontend/backend error logging + user notifications.  
4. **Security**: Input validation, CORS, rate limiting (if public-facing).  
5. **SVG Fallbacks**: Plan for broken Material Icons (e.g., show text label).  

---

## **7. Deliverables**  
1. Editor component (native JS).  
2. Frontend/backend (Node.js).  
3. Full documentation + testing setup.  
4. Deployment scripts.  