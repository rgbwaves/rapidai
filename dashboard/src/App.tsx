import { Routes, Route, Navigate } from 'react-router-dom'
import { AnalysisProvider } from './context/AnalysisContext'
import Layout from './components/Layout'
import RequestBuilder from './pages/RequestBuilder'
import PipelineDashboard from './pages/PipelineDashboard'
import ModuleExplorer from './pages/ModuleExplorer'
import ReliabilityView from './pages/ReliabilityView'

export default function App() {
  return (
    <AnalysisProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<RequestBuilder />} />
          <Route path="/results" element={<PipelineDashboard />} />
          <Route path="/modules" element={<ModuleExplorer />} />
          <Route path="/reliability" element={<ReliabilityView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AnalysisProvider>
  )
}
