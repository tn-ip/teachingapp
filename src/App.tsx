import { Home } from './pages/Home'
import { CountingTree } from './pages/CountingTree'
import { Permutations } from './pages/Permutations'
import { Combinations } from './pages/Combinations'
import { Probability } from './pages/Probability'
import { SequenceHub } from './pages/SequenceHub'
import { SequenceQuestionPage } from './pages/SequenceQuestion'
import { useHashRoute } from './lib/routes'

export default function App() {
  const route = useHashRoute()

  return (
    <div className="app">
      {route.id === 'home' && <Home />}
      {route.id === 'counting' && <CountingTree />}
      {route.id === 'permutations' && <Permutations />}
      {route.id === 'combinations' && <Combinations />}
      {route.id === 'probability' && <Probability />}
      {route.id === 'sequence' &&
        (route.question ? <SequenceQuestionPage id={route.question} /> : <SequenceHub />)}
    </div>
  )
}
