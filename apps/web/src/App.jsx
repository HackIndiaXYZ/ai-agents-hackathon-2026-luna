import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid rgba(51, 65, 85, 0.5)',
            borderRadius: '0.75rem',
          },
        }}
      />
      <div className="min-h-screen bg-surface-950">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center animate-fade-in">
            <h1 className="text-5xl font-display font-bold text-gradient mb-4">
              TradeNexus
            </h1>
            <p className="text-surface-200 text-lg">
              Commodity Intelligence Platform — Coming Soon
            </p>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
