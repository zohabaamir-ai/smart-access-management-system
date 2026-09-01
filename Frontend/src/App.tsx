import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import {
  AppPreferencesProvider,
} from './context/AppPreferencesContext'


import DashboardLayout from './layouts/DashboardLayout'

import FullyAuthenticatedRoute from './components/routing/FullyAuthenticatedRoute'
import LoginRoute from './components/routing/LoginRoute'
import PasswordChangeRoute from './components/routing/PasswordChangeRoute'
import RequirePermission from './components/common/RequirePermission'


import Dashboard from './pages/dashboard/Dashboard'
import Persons from './pages/persons/Persons'
import Cameras from './pages/cameras/Cameras'
import OpenCamera from './pages/cameras/OpenCamera'
import CameraRecognition from './pages/recognition/CameraRecognition'
import Activity from './pages/activity/Activity'
import Users from './pages/users/Users'
import Settings from './pages/settings/Settings'
import NotFound from './pages/NotFound'


/* =============================================================
   APPLICATION
============================================================= */

function App() {

  return (

    <AppPreferencesProvider>

      <BrowserRouter>

        <Routes>


          {/* =================================================
              AUTHENTICATION
          ================================================= */}

          <Route
            path="/login"
            element={
              <LoginRoute />
            }
          />


          <Route
            path="/change-password"
            element={
              <PasswordChangeRoute />
            }
          />


          {/* =================================================
              PUBLIC CAMERA RECOGNITION

              This route intentionally does NOT use
              FullyAuthenticatedRoute — the finalized backend
              endpoint POST /recognition/camera/{slug} is
              public.

              The Camera identifies itself through its URL
              slug alone — no session and no device credential.

              Example:

              /recognition/camera/main-gate
          ================================================= */}

          <Route
            path="/recognition/camera/:slug"
            element={
              <CameraRecognition />
            }
          />


          {/* =================================================
              MANAGEMENT APPLICATION

              Everything inside this route remains protected.

              Users must:

              - Be logged in
              - Have a valid access token
              - Have completed any required password change
          ================================================= */}

          <Route
            element={
              <FullyAuthenticatedRoute>

                <DashboardLayout />

              </FullyAuthenticatedRoute>
            }
          >


            {/* =================================================
                ROOT
            ================================================= */}

            <Route
              path="/"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />


            {/* =================================================
                MANAGEMENT ROUTES

                Each carries an explicit RequirePermission guard
                (not just a hidden nav item), so direct
                navigation by an unauthorized role renders the
                shared NotAuthorized surface. The backend
                enforces the same permission on every call.
                view_dashboard / view_persons / view_cameras /
                view_activity are held by every V1 role, so the
                guards are today a no-op — they exist to keep the
                gate explicit if the role model ever tightens.
            ================================================= */}

            <Route
              path="/dashboard"
              element={
                <RequirePermission permission="view_dashboard">
                  <Dashboard />
                </RequirePermission>
              }
            />


            <Route
              path="/persons"
              element={
                <RequirePermission permission="view_persons">
                  <Persons />
                </RequirePermission>
              }
            />


            <Route
              path="/cameras"
              element={
                <RequirePermission permission="view_cameras">
                  <Cameras />
                </RequirePermission>
              }
            />


            {/* Open Camera — live recognition workspace for one
                camera. Operators may open a camera at a post;
                the backend also gates POST /recognition. */}
            <Route
              path="/cameras/:cameraId/live"
              element={
                <RequirePermission permission="view_cameras">
                  <OpenCamera />
                </RequirePermission>
              }
            />


            <Route
              path="/activity"
              element={
                <RequirePermission permission="view_activity">
                  <Activity />
                </RequirePermission>
              }
            />


            {/* =================================================
                USERS & ROLES

                Route-level guard: management-user administration
                requires manage_users (Admin / Super Admin).
                Operator hits the shared NotAuthorized surface
                rather than a blank page. The backend enforces
                the same permission on every /users call.
            ================================================= */}

            <Route
              path="/users"
              element={
                <RequirePermission permission="manage_users">
                  <Users />
                </RequirePermission>
              }
            />


            {/* =================================================
                SETTINGS

                No route-level permission: the page itself is
                open to every authenticated role (App
                Preferences); the Super-Admin-only System
                section is gated inside the page.
            ================================================= */}

            <Route
              path="/settings"
              element={
                <Settings />
              }
            />


            {/* =================================================
                NOT FOUND

                Application-level catch-all. An unknown or
                retired route (/terminals, /reports,
                /terminal/:slug, …) for a signed-in user renders
                this inside the app shell; an unauthenticated
                user is redirected to /login by
                FullyAuthenticatedRoute first. No redirects.
            ================================================= */}

            <Route
              path="*"
              element={
                <NotFound />
              }
            />


          </Route>


        </Routes>

      </BrowserRouter>

    </AppPreferencesProvider>

  )

}


export default App