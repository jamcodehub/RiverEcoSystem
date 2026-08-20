import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Prevent pinch-zoom on the whole page - the sim canvas and UI aren't
// designed to be zoomed, and on iPad it lets the bottom control bar get
// scaled/dragged out of view. Setting this here (rather than relying on
// index.html) means it's enforced regardless of how the page is embedded.
let viewportMeta = document.querySelector('meta[name="viewport"]');
if (!viewportMeta) {
  viewportMeta = document.createElement('meta');
  viewportMeta.name = 'viewport';
  document.head.appendChild(viewportMeta);
}
viewportMeta.setAttribute(
  'content',
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
