import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
//import {elevate} from './infrastructure/elevator';
import registerServiceWorker from './registerServiceWorker';

//elevate();

ReactDOM.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  document.getElementById('root'),
);
registerServiceWorker();
