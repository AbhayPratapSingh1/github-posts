import { Route, Routes } from "react-router-dom"
import GoToTop from "./components/GoToTop"
import FeedbackButton from "./components/FeedbackButton"
import Home from "./pages/Home"
import Post from "./pages/Post"
import CreatePost from "./pages/CreatePost"
import Login from "./pages/Login"
import Liked from "./pages/Liked"
import Users from "./pages/Users"
import UserProfile from "./pages/UserProfile"
import Feedback from "./pages/Feedback"
import CustomEditPage from "./pages/CustomEditPage"
import AdminLogin from "./pages/AdminLogin"
import AdminDashboard from "./pages/AdminDashboard"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/liked" element={<ProtectedRoute><Liked /></ProtectedRoute>} />
        <Route path="/users" element={<Users />} />
        <Route path="/user/:username" element={<UserProfile />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/custom-edit-page" element={<CustomEditPage />} />
        <Route path="/custom-quill" element={<CustomEditPage />} />
        <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/post/:id/edit" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/post/:id" element={<Post />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/post/:id/edit" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <GoToTop />
      <FeedbackButton />
    </>
  )
}

export default App
