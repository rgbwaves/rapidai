import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import PipelineDashboard from './pages/PipelineDashboard'
import ModuleExplorer from './pages/ModuleExplorer'
import ReliabilityView from './pages/ReliabilityView'
import { scenarios } from './api/mockData'

export default function App() {
  const [activeId, setActiveId] = useState(scenarios[0].id)
  const activeScenario = scenarios.find((s) => s.id === activeId) || scenarios[0]

  return (
    <Layout
      scenarios={scenarios}
      activeScenario={activeId}
      onScenarioChange={setActiveId}
    >
      <Routes>
        <Route path="/" element={<PipelineDashboard scenario={activeScenario} />} />
        <Route path="/modules" element={<ModuleExplorer scenario={activeScenario} />} />
        <Route path="/reliability" element={<ReliabilityView scenario={activeScenario} />} />
      </Routes>
    </Layout>
  )
}
