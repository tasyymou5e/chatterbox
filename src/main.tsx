import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Force complete rebuild and deployment - v3.0.0 - Admin Portal Fix
// Comprehensive fix for admin authentication and deployment issues
console.log('🚀 Application starting - Version 3.0.0');
const root = createRoot(document.getElementById("root")!);

try {
  root.render(<App />);
} catch (error) {
  console.error('Failed to render app:', error);
}
