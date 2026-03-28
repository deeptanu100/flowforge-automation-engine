import React from 'react';
import Canvas from './components/Canvas';

function App() {
  return (
    <div className="w-full h-screen bg-canvas-bg overflow-hidden text-text-primary antialiased selection:bg-accent/30 tracking-tight">
      <Canvas />
    </div>
  );
}

export default App;
