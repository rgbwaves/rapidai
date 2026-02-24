import { Routes, Route, Navigate } from 'react-router-dom'
import { AnalysisProvider } from './context/AnalysisContext'
import { RoleProvider } from './context/RoleContext'
import Layout from './components/Layout'
import RequestBuilder from './pages/RequestBuilder'
import OverviewDashboard from './pages/OverviewDashboard'
import AIBrief from './pages/AIBrief'
import ModuleExplorer from './pages/ModuleExplorer'
import ReliabilityView from './pages/ReliabilityView'

export default function App() {
  return (
    <AnalysisProvider>
      <RoleProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<RequestBuilder />} />
            <Route path="/results" element={<OverviewDashboard />} />
            <Route path="/brief" element={<AIBrief />} />
            <Route path="/modules" element={<ModuleExplorer />} />
            <Route path="/reliability" element={<ReliabilityView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </RoleProvider>
    </AnalysisProvider>
  )
}
