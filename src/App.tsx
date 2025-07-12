import React from 'react'
import ReactDOM from 'react-dom/client'
import BOMManager from './main.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BOMManager />
  </React.StrictMode>,
)
