import './App.css'
import SiteHeader from './components/site-header'
import HeroSection from './pages/hero-section'

function App() {
  return (
    <main className="app-shell">
      <div className="app-shell__header">
        <SiteHeader />
      </div>
      <HeroSection />
    </main>
  )
}

export default App
