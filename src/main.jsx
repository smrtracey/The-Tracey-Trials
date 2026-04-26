import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

let touchStartX = 0
let touchStartY = 0

function handleTouchStart(event) {
  if (event.touches.length !== 1) {
    return
  }

  touchStartX = event.touches[0].clientX
  touchStartY = event.touches[0].clientY
}

function handleTouchMove(event) {
  if (event.touches.length !== 1) {
    return
  }

  const deltaX = event.touches[0].clientX - touchStartX
  const deltaY = event.touches[0].clientY - touchStartY

  if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
    event.preventDefault()
    resetHorizontalScroll()
  }
}

function resetHorizontalScroll() {
  const rootElement = document.getElementById('root')

  if (rootElement && rootElement.scrollLeft !== 0) {
    rootElement.scrollLeft = 0
  }

  if (document.documentElement.scrollLeft !== 0) {
    document.documentElement.scrollLeft = 0
  }

  if (document.body.scrollLeft !== 0) {
    document.body.scrollLeft = 0
  }
}

document.addEventListener('touchstart', handleTouchStart, { passive: true })
document.addEventListener('touchmove', handleTouchMove, { passive: false })
document.addEventListener('scroll', resetHorizontalScroll, { passive: true, capture: true })
window.addEventListener('scroll', resetHorizontalScroll, { passive: true })

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
