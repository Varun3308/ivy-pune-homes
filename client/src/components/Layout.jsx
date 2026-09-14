import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutGrid,
  Heart,
  TrendingUp,
  ChevronRight,
  Leaf,
  ArrowUpRight,
  LogOut,
  Menu,
  MapPin,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import {
  api,
  clearNotice,
  loadCatalog,
  loadSaved,
  notify,
  signedOut,
} from "../store";
import { useApp } from "../hooks";
import { Brand, Loading, Empty } from "./common";
import Browse from "../pages/Browse";
import Detail from "../pages/Detail";
import Insights from "../pages/Insights";
export default function Layout() {
  const dispatch = useDispatch(),
    { user, sessionReady, catalogStatus, notice } = useApp(),
    location = useLocation(),
    navigate = useNavigate();
  const [menu, setMenu] = useState(false),
    [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    if (user && catalogStatus === "idle") {
      dispatch(loadCatalog());
      dispatch(loadSaved());
    }
  }, [user, catalogStatus, dispatch]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => dispatch(clearNotice()), 5000);
    return () => clearTimeout(timer);
  }, [notice, dispatch]);
  useEffect(() => setMenu(false), [location.pathname]);
  useEffect(() => {
    if (!user) return;
    const refresh = () =>
      api("/session").catch((error) => {
        if (error.status === 401 || error.status === 403) dispatch(signedOut());
      });
    const interval = setInterval(refresh, 5 * 60 * 1000);
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [user, dispatch]);
  if (!sessionReady) return <Loading full />;
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  async function logout() {
    setLoggingOut(true);
    try {
      await api("/logout", { method: "POST" });
      dispatch(signedOut());
      navigate("/login");
    } catch (e) {
      dispatch(notify({ type: "error", message: e.message }));
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Brand />
        <div className="sidebar-label">YOUR NEXT CHAPTER</div>
        <nav aria-label="Main navigation">
          <NavLink to="/homes">
            <LayoutGrid size={19} />
            Explore homes
            <ChevronRight size={15} />
          </NavLink>
          <NavLink to="/saved">
            <Heart size={19} />
            Saved homes
          </NavLink>
          <NavLink to="/insights">
            <TrendingUp size={19} />
            Market insights
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="small-leaf">
            <Leaf size={21} />
          </span>
          <h3>
            A little clarity.
            <br />A better beginning.
          </h3>
          <p>See the story behind Pune’s property numbers.</p>
          <Link to="/insights">
            Explore insights <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">
            {user.email?.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{user.email?.split("@")[0]}</strong>
            <small>Personal account</small>
          </div>
          <button aria-label="Sign out" disabled={loggingOut} onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-scrim"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open menu"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Your home, your way <span>/</span>{" "}
            <strong>
              {location.pathname.startsWith("/insights")
                ? "Market insights"
                : location.pathname.startsWith("/saved")
                  ? "Saved homes"
                  : "Explore"}
            </strong>
          </div>
          <div className="city-pill">
            <MapPin size={15} />
            <span>Pune, Maharashtra</span>
            <span className="live-dot" />
          </div>
        </header>
        <main id="main-content">
          <Routes>
            <Route path="/homes" element={<Browse />} />
            <Route path="/saved" element={<Browse savedOnly />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/homes/:id" element={<Detail kind="sale" />} />
            <Route path="/rentals/:id" element={<Detail kind="rental" />} />
            <Route path="/projects/:id" element={<Detail kind="project" />} />
            <Route path="/" element={<Navigate to="/homes" replace />} />
            <Route
              path="*"
              element={
                <Empty heading="This page hasn’t found a home.">
                  <Link className="button primary" to="/homes">
                    Back to explore
                  </Link>
                </Empty>
              }
            />
          </Routes>
        </main>
        <footer className="app-footer">
          <span>Find a place. Feel at home.</span>
          <span>Ivy Homes · Pune</span>
        </footer>
      </div>
      {notice && (
        <div role="status" className={`toast ${notice.type}`}>
          <span>
            {notice.type === "error" ? (
              <AlertTriangle size={18} />
            ) : (
              <Check size={18} />
            )}
          </span>
          {notice.message}
          <button
            aria-label="Dismiss notification"
            onClick={() => dispatch(clearNotice())}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
