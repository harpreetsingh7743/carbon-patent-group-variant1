import './App.css'
import SiteHeader from './components/site-header'
import HeroSection from './pages/hero-section'
import IntroSection from './pages/intro-section'

function App() {
  return (
    <main className="app-shell">
      <div className="app-shell__header">
        <SiteHeader />
      </div>
      <HeroSection />
      <IntroSection />
    </main>
  )
}

export default App
