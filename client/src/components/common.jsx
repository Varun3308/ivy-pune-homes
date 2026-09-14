import React from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Leaf, Search, Heart, AlertTriangle, RefreshCw } from "lucide-react";
import { useApp } from "../hooks";
import { toggleSaved, loadCatalog } from "../store";
export function Brand() {
  return (
    <Link to="/homes" className="brand" aria-label="Ivy Homes home">
      <span className="brand-icon">
        <Leaf size={24} strokeWidth={1.6} />
      </span>
      <span>
        ivy<span className="brand-light">homes</span>
        <small>A PLACE TO BELONG</small>
      </span>
    </Link>
  );
}

export function Loading({ full = false }) {
  return (
    <div className={`loading ${full ? "full" : ""}`} role="status">
      <span className="spinner" />
      <h2>Finding your next chapter…</h2>
      <p>
        Loading the complete Pune collection. The first visit may take a few
        seconds.
      </p>
    </div>
  );
}

export function Empty({
  icon: Icon = Search,
  heading = "No homes found",
  children,
}) {
  return (
    <div className="empty">
      <span>
        <Icon size={28} />
      </span>
      <h2>{heading}</h2>
      {children}
    </div>
  );
}

export function SaveButton({ id, text = false }) {
  const dispatch = useDispatch(),
    { savedIds, savedPending } = useApp(),
    saved = savedIds.includes(id);
  return (
    <button
      type="button"
      className={`${text ? "button secondary" : "save-button"} ${saved ? "is-saved" : ""}`}
      aria-label={saved ? "Unsave home" : "Save home"}
      aria-pressed={saved}
      disabled={savedPending[id]}
      onClick={() => dispatch(toggleSaved({ id, saved }))}
    >
      <Heart size={19} fill={saved ? "currentColor" : "none"} />
      {text && (saved ? "Saved to your homes" : "Save this home")}
    </button>
  );
}

export function CatalogGate({ children }) {
  const { catalog, catalogStatus, catalogError } = useApp(),
    dispatch = useDispatch();
  if (!catalog) {
    if (catalogStatus === "error")
      return (
        <Empty icon={AlertTriangle} heading="We couldn’t load the homes">
          <p>{catalogError}</p>
          <button
            className="button primary"
            onClick={() => dispatch(loadCatalog())}
          >
            <RefreshCw size={17} />
            Try again
          </button>
        </Empty>
      );
    return <Loading />;
  }
  return children;
}
