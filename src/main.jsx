import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // <--- ВОТ ЭТА СТРОЧКА ОБЯЗАТЕЛЬНА!
import './mobile.css' // Mobile styles
import './responsive.css' // Global responsive overrides


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)