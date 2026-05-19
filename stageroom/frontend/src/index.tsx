import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={publishableKey}
      signInProps={{
        routing: 'hash',
        path: '/#/auth',
      }}
      signUpProps={{
        routing: 'hash',
        path: '/#/auth',
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
