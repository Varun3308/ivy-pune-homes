import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { MapPin, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { login } from "../store";
import { Brand, Loading } from "../components/common";
import Architecture from "../components/Architecture";
import { useApp } from "../hooks";
import { number, money, title, date } from "../format";
export default function Login() {
  const dispatch = useDispatch(),
    location = useLocation(),
    { user, sessionReady } = useApp();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!sessionReady) return <Loading full />;
  if (user) return <Navigate to={location.state?.from || "/homes"} replace />;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await dispatch(login({ email, password })).unwrap();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand />
        <div className="login-story-copy">
          <span className="eyebrow">ROOTED IN PUNE. MADE FOR YOU.</span>
          <h1>
            Every new chapter
            <br />
            starts with <em>home.</em>
          </h1>
          <p>
            A quieter way to find your place. Explore Pune’s homes with clear
            prices and a little more confidence.
          </p>
        </div>
        <div className="login-art">
          <Architecture seed={2} large />
        </div>
        <div className="login-foot">
          <span>
            <MapPin size={16} /> Pune, Maharashtra
          </span>
          <span>Thoughtfully found.</span>
        </div>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <span className="eyebrow">WELCOME TO IVY HOMES</span>
          <h2>Make yourself at home.</h2>
          <p>Sign in to explore properties and keep your favourites close.</p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <div className="password-input">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary wide" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="demo-accounts">
            <span>Reviewing the assignment? Choose a demo account.</span>
            <div>
              {[1, 2, 3].map((n) => (
                <button key={n} onClick={() => setEmail(`demo${n}@ivy.homes`)}>
                  Demo {n}
                </button>
              ))}
            </div>
            <small>Use the shared password from your assignment email.</small>
          </div>
          <p className="login-note">
            <ShieldCheck size={17} /> Your saved homes stay private to your
            account.
          </p>
        </div>
        <small className="login-copyright">
          Ivy Homes · Pune property explorer
        </small>
      </section>
    </div>
  );
}
