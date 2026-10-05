import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.");
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === "signup"
          ? await supabase.auth.signUp({ email: email.trim(), password })
          : await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (result.error) {
        setError(getAuthErrorMessage(result.error));
        return;
      }

      if (mode === "signup" && !result.data.session) {
        setNotice("Account created. Check your email for a confirmation link, then sign in.");
        setMode("signin");
        return;
      }

      navigate("/dashboard");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-xl font-semibold text-ink mb-1">
        {mode === "signup" ? "Create your account" : "Sign in"}
      </h1>
      <p className="text-sm text-ink/60 mb-6">
        {mode === "signup"
          ? "Set up your business's booking page."
          : "Manage your bookings."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 text-sm"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 text-sm"
          required
          minLength={6}
        />

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-md bg-teal-50 border border-teal-100 px-3 py-2 text-sm text-teal-700">
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-md py-2.5 text-sm font-medium transition"
        >
          {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        className="w-full text-center text-sm text-teal-600 mt-4"
      >
        {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </div>
  );
}

function getAuthErrorMessage(authError) {
  const message = authError?.message || "";
  const normalizedMessage = message.toLowerCase();

  if (authError?.status === 429 || /over_email_send_rate_limit|too many requests/i.test(message)) {
    return "Supabase is temporarily limiting email requests. Wait before trying again. To raise this limit, configure custom SMTP in your Supabase project’s Auth email settings.";
  }
  if (/error sending confirmation email|failed to send.*email/i.test(message)) {
    return "Supabase could not send the confirmation email. Check Authentication → Logs for the SMTP or rate-limit reason, then configure a custom SMTP provider in Authentication → SMTP Settings and try again.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Confirm your email using the link Supabase sent before signing in. Check your spam folder; if it never arrives, the project’s email sending limit or SMTP settings may be blocking it.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "Email or password was not accepted. If you just created this account, confirm your email first, then sign in again.";
  }
  if (
    authError instanceof TypeError ||
    /failed to fetch|networkerror|load failed/i.test(normalizedMessage)
  ) {
    return "Could not connect to Supabase. Check your internet connection and try again.";
  }
  return message || "Something went wrong. Please try again.";
}
