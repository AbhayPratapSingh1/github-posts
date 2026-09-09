import { Route, Routes } from "react-router-dom"
import GoToTop from "./components/GoToTop"
import Home from "./pages/Home"
import Post from "./pages/Post"
import CreatePost from "./pages/CreatePost"
import Login from "./pages/Login"
import AdminLogin from "./pages/AdminLogin"
import AdminDashboard from "./pages/AdminDashboard"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/post/:id/edit" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/post/:id" element={<Post />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
      <GoToTop />
    </>
  )
}

export default App
