import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/common/Layout'
import Calendar from './pages/Calendar'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/" element={<Navigate to="/calendar" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

