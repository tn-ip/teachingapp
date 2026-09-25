import { Home } from './pages/Home'
import { CountingTree } from './pages/CountingTree'
import { Permutations } from './pages/Permutations'
import { Combinations } from './pages/Combinations'
import { Probability } from './pages/Probability'
import { ProbabilityHub } from './pages/ProbabilityHub'
import { MutuallyExclusive } from './pages/MutuallyExclusive'
import { IndependentEvents } from './pages/IndependentEvents'
import { SequenceHub } from './pages/SequenceHub'
import { SequenceQuestionPage } from './pages/SequenceQuestion'
import { Interest } from './pages/Interest'
import { DroneHub } from './pages/DroneHub'
import { DroneLab } from './pages/DroneLab'
import { PrintHub } from './pages/PrintHub'
import { DualTextLab } from './pages/DualTextLab'
import { GadgetLab } from './pages/GadgetLab'
import { AiPrintLab } from './pages/AiPrintLab'
import { useHashRoute } from './lib/routes'

export default function App() {
  const route = useHashRoute()

  return (
    <div className="app">
      {route.id === 'home' && <Home />}
      {route.id === 'counting' && <CountingTree />}
      {route.id === 'permutations' && <Permutations />}
      {route.id === 'combinations' && <Combinations />}
      {route.id === 'probability' && route.view === null && <ProbabilityHub />}
      {route.id === 'probability' && route.view === 'sample' && <Probability />}
      {route.id === 'probability' && route.view === 'exclusive' && <MutuallyExclusive />}
      {route.id === 'probability' && route.view === 'independent' && <IndependentEvents />}
      {route.id === 'sequence' &&
        (route.question ? <SequenceQuestionPage id={route.question} /> : <SequenceHub />)}
      {route.id === 'interest' && <Interest mode={route.mode} />}
      {route.id === 'drone' && route.view === null && <DroneHub />}
      {route.id === 'drone' && route.view !== null && <DroneLab view={route.view} />}
      {route.id === 'print3d' && route.view === null && <PrintHub />}
      {route.id === 'print3d' && route.view === 'dual-text' && <DualTextLab />}
      {route.id === 'print3d' && route.view === 'gadget' && <GadgetLab />}
      {route.id === 'print3d' && route.view === 'ai' && <AiPrintLab />}
    </div>
  )
}
