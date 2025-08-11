import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './components/ui/NotificationProvider';
import SessionWarning from './components/ui/SessionWarning';
import { AdminProvider } from './contexts/AdminContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import LearnerLogin from './pages/auth/LearnerLogin';
import LearnerRegister from './pages/auth/LearnerRegister';
import TutorLogin from './pages/auth/TutorLogin';
import TutorRegister from './pages/auth/TutorRegister';
import LearnerDashboard from './pages/dashboard/LearnerDashboard';
import TutorDashboard from './pages/dashboard/TutorDashboard';
import BackpanelLogin from './pages/backpanel/AdminLogin';
import BackpanelDashboard from './pages/backpanel/AdminDashboard';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AuthCallback from './pages/auth/AuthCallback';
import VerifyOTP from './pages/auth/VerifyOTP';
import Courses from './pages/Courses';
import CourseDetails from './pages/CourseDetails';
import Payment from './pages/Payment';
import ContactUs from './pages/ContactUs';
import AboutUs from './pages/AboutUs';
import SitePolicies from './pages/SitePolicies';
import FAQ from './pages/FAQ';
import JoinAsLearner from './pages/JoinAsLearner';
import JoinAsTutor from './pages/JoinAsTutor';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';

// Scroll to top component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Smooth scroll to top when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <SessionWarning />
        <AdminProvider>
          <AdminAuthProvider>
            <Router>
              <div className="min-h-screen bg-gray-50">
                <ScrollToTop />
                <Routes>
                  {/* Backpanel Routes (No Navbar/Footer) */}
                  <Route path="/backpanel/login" element={<BackpanelLogin />} />
                  <Route path="/backpanel/dashboard" element={
                    <AdminProtectedRoute>
                      <BackpanelDashboard />
                    </AdminProtectedRoute>
                  } />
                  
                  {/* Main App Routes (With Navbar/Footer) */}
                  <Route path="/*" element={
                    <>
                      <Navbar />
                      <main className="pt-16">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          
                          {/* Static Pages */}
                          <Route path="/contact" element={<ContactUs />} />
                          <Route path="/about" element={<AboutUs />} />
                          <Route path="/policies" element={<SitePolicies />} />
                          <Route path="/faq" element={<FAQ />} />
                          <Route path="/join-learner" element={<JoinAsLearner />} />
                          <Route path="/join-tutor" element={<JoinAsTutor />} />
                          
                          {/* Learner Routes */}
                          <Route path="/learner/login" element={<LearnerLogin />} />
                          <Route path="/learner/register" element={<LearnerRegister />} />
                          <Route path="/learner/dashboard" element={
                            <ProtectedRoute userType="learner">
                              <LearnerDashboard />
                            </ProtectedRoute>
                          } />
                          
                          {/* Tutor Routes */}
                          <Route path="/tutor/login" element={<TutorLogin />} />
                          <Route path="/tutor/register" element={<TutorRegister />} />
                          <Route path="/tutor/dashboard" element={
                            <ProtectedRoute userType="tutor">
                              <TutorDashboard />
                            </ProtectedRoute>
                          } />
                          
                          {/* Course Routes */}
                          <Route path="/courses" element={<Courses />} />
                          <Route path="/courses/:courseId" element={<CourseDetails />} />
                          
                          {/* Shared Routes */}
                          <Route path="/forgot-password" element={<ForgotPassword />} />
                          <Route path="/reset-password" element={<ResetPassword />} />
                          <Route path="/auth/callback" element={<AuthCallback />} />
                          <Route path="/verify-otp" element={<VerifyOTP />} />
                          <Route path="/payment" element={<Payment />} />
                          
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </main>
                      <Footer />
                    </>
                  } />
                </Routes>
              </div>
            </Router>
          </AdminAuthProvider>
        </AdminProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;