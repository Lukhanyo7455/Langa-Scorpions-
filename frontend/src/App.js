import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/context/AuthContext";
import HomePage from "@/pages/HomePage";
import AboutPage from "@/pages/AboutPage";
import ProgramsPage from "@/pages/ProgramsPage";
import StoriesPage from "@/pages/StoriesPage";
import EventsPage from "@/pages/EventsPage";
import GalleryPage from "@/pages/GalleryPage";
import DonatePage from "@/pages/DonatePage";
import DonateSuccessPage from "@/pages/DonateSuccessPage";
import RegisterAthletePage from "@/pages/RegisterAthletePage";
import VolunteerPage from "@/pages/VolunteerPage";
import ContactPage from "@/pages/ContactPage";

import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import {
  AdminGuard, AdminLayout, AdminOverview,
  AdminDonations, AdminAthletes, AdminVolunteers,
  AdminMessages, AdminNewsletter,
  AdminEvents, AdminStories, AdminGallery, AdminSponsors,
} from "@/pages/admin/AdminPages";

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Toaster position="top-center" richColors closeButton />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/donate/success" element={<DonateSuccessPage />} />
            <Route path="/register" element={<RegisterAthletePage />} />
            <Route path="/volunteer" element={<VolunteerPage />} />
            <Route path="/contact" element={<ContactPage />} />

            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
              <Route index element={<AdminOverview />} />
              <Route path="donations" element={<AdminDonations />} />
              <Route path="athletes" element={<AdminAthletes />} />
              <Route path="volunteers" element={<AdminVolunteers />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="newsletter" element={<AdminNewsletter />} />
              <Route path="events" element={<AdminEvents />} />
              <Route path="stories" element={<AdminStories />} />
              <Route path="gallery" element={<AdminGallery />} />
              <Route path="sponsors" element={<AdminSponsors />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
