
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Ensure the root element exists
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found. Cannot mount React application.");
} else {
  createRoot(rootElement).render(<App />);
}
