import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useSession } from "./lib/useSession";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PublicBooking from "./pages/PublicBooking";
import BookingConfirm from "./pages/BookingConfirm";

export default function App() {
  const session = useSession();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          session === undefined ? (
            <div className="px-6 py-10 text-sm text-ink/60">Loading…</div>
          ) : session ? (
            <Dashboard session={session} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/b/:slug" element={<PublicBooking />} />
      <Route path="/b/:slug/confirm/:bookingId" element={<BookingConfirm />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function Home() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-xl font-semibold text-ink mb-2">Service Booking</h1>
      <p className="text-sm text-ink/60 mb-6">
        Deposit-backed appointment booking for local service businesses.
      </p>
      <Link
        to="/login"
        className="inline-block bg-teal-600 hover:bg-teal-700 text-white rounded-md px-4 py-2 text-sm font-medium transition"
      >
        Business sign in
      </Link>
    </div>
  );
}

function NotFound() {
  return (
    <div className="px-6 py-20 text-center text-sm text-ink/60">
      Page not found.
    </div>
  );
}
