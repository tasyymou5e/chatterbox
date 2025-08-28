import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Force complete rebuild and deployment - v2.0.1
// Ensure proper mounting and error handling
const root = createRoot(document.getElementById("root")!);

try {
  root.render(<App />);
} catch (error) {
  console.error('Failed to render app:', error);
}
