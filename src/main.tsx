import React from 'react'
import ReactDOM from 'react-dom/client'
import RootComponent from './RootComponent'
import '@fontsource/jetbrains-mono'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
)
