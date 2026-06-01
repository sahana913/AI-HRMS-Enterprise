import React from 'react';
import { Bounce, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppRouter from './routes/AppRouter'; // All your <Route> logic should be in here
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        {/* 
          All your Routes like /login, /signup, and /dashboard/screening 
          should be defined INSIDE this AppRouter component.
        */}
        <AppRouter />
      </ErrorBoundary>

      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        theme="dark" 
        transition={Bounce}
        closeButton
        pauseOnFocusLoss
        pauseOnHover={false} 
        closeOnClick
        draggable
        draggablePercent={80}
        draggableDirection="x"
        role="alert"
      />
    </AuthProvider>
  );
}

export default App;
