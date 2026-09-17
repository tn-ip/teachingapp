import { Home } from './pages/Home'
import { CountingTree } from './pages/CountingTree'
import { Permutations } from './pages/Permutations'
import { Combinations } from './pages/Combinations'
import { Probability } from './pages/Probability'
import { useHashRoute } from './lib/routes'

export default function App() {
  const route = useHashRoute()

  return (
    <div className="app">
      {route === 'home' && <Home />}
      {route === 'counting' && <CountingTree />}
      {route === 'permutations' && <Permutations />}
      {route === 'combinations' && <Combinations />}
      {route === 'probability' && <Probability />}
    </div>
  )
}
