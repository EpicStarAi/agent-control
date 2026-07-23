import React from 'react'
import ReactDOM from 'react-dom/client'
import WebApp from '@twa-dev/sdk'
import App from './App'

WebApp.ready()
WebApp.expand()
WebApp.setHeaderColor('#0a0a14')
WebApp.setBackgroundColor('#0a0a14')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
