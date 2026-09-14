import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Home,
  Building2,
  Layers,
  Leaf,
  MapPin,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  X,
  Heart,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CatalogGate, Empty } from "../components/common";
import Architecture from "../components/Architecture";
import PropertyCard from "../components/PropertyCard";
import { filterRecords } from "../../../shared/domain";
import { useApp } from "../hooks";
import { number, money, title, date } from "../format";
export default function Browse({ savedOnly = false }) {
  const { catalog, savedIds } = useApp(),
    [params, setParams] = useSearchParams(),
    [filterOpen, setFilterOpen] = useState(false);
  const kind = params.get("kind") || "sale";
  const filters = {
    query: params.get("q") || "",
    locality: params.get("locality") || "",
    bedroom: params.get("bedroom") ?? "",
    furnishing: params.get("furnishing") || "",
    minPrice: params.get("minPrice") || "",
    maxPrice: params.get("maxPrice") || "",
    status: savedOnly ? "all" : params.get("status") || "live",
    sort: params.get("sort") || "newest",
    projectId: params.get("projectId") || "",
  };
  function change(key, value) {
    setParams(
      () => {
        // Read the latest URL, including navigation still rendering in a React transition.
        const next = new URLSearchParams(window.location.search);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }
  const page = Math.max(1, Number(params.get("page")) || 1),
    perPage = 9;
  const collection = useMemo(
    () =>
      !catalog
        ? []
        : savedOnly
          ? catalog.listings.filter((x) => savedIds.includes(x.listing_id))
          : kind === "rental"
            ? catalog.rentals
            : kind === "project"
              ? catalog.projects
              : catalog.listings,
    [catalog, savedOnly, savedIds, kind],
  );
  const filtered = useMemo(
    () => filterRecords(collection, filters),
    [collection, params.toString(), savedOnly],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / perPage)),
    currentPage = Math.min(page, pages),
    visible = filtered.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage,
    );
  const localities = [...new Set(collection.map((x) => x.locality))].sort();
  const activeFilters = Object.entries(filters).filter(
    ([k, v]) => v !== "" && !["sort", "status"].includes(k),
  );
  const badRange =
    filters.minPrice !== "" &&
    filters.maxPrice !== "" &&
    Number(filters.minPrice) > Number(filters.maxPrice);
  function setKind(value) {
    setParams(value === "sale" ? {} : { kind: value });
  }
  return (
    <CatalogGate>
      <section className="page-heading">
        <div>
          <span className="eyebrow">
            {savedOnly
              ? "A LITTLE CLOSER TO HOME"
              : "PUNE, A PLACE TO PUT DOWN ROOTS"}
          </span>
          <h1>
            {savedOnly
              ? "Your shortlist. Your possibilities."
              : "Find a home that feels like you."}
          </h1>
          <p>
            {savedOnly
              ? "The places you’re keeping close, saved just for you."
              : "Thoughtfully explore homes, neighbourhoods, and your next beginning."}
          </p>
        </div>
        <span className="heading-flower">
          <Leaf size={38} strokeWidth={1} />
        </span>
      </section>
      {!savedOnly && (
        <section className="explore-banner">
          <div>
            <span className="pill light">
              <span className="live-dot" />A clearer view of home
            </span>
            <h2>
              Good decisions start
              <br />
              with the whole picture.
            </h2>
            <p>
              Explore real prices. Understand the market.
              <br />
              Make your next move with confidence.
            </p>
            <Link to="/insights">
              Get to know Pune <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="banner-art">
            <Architecture seed={2} />
            <span className="art-caption">A little room to imagine.</span>
          </div>
        </section>
      )}
      <section className="browse-controls">
        <div className="tabs-row">
          {!savedOnly ? (
            <div className="tabs" aria-label="Property category">
              {[
                ["sale", "Buy a home", Home],
                ["rental", "Rent a home", Building2],
                ["project", "New projects", Layers],
              ].map(([value, label, Icon]) => (
                <button
                  key={value}
                  className={kind === value ? "active" : ""}
                  onClick={() => setKind(value)}
                  aria-pressed={kind === value}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <h2 className="section-title">
              Saved homes <span>{savedIds.length}</span>
            </h2>
          )}
          <span className="collection-note">
            <ShieldCheck size={16} />
            Prices in ₹ · Areas in sq ft
          </span>
        </div>
        <div className="search-filter-row">
          <label className="search-box">
            <Search size={19} />
            <input
              aria-label="Search homes"
              placeholder="Search a neighbourhood, project or home…"
              value={filters.query}
              onChange={(e) => change("q", e.target.value)}
            />
            {filters.query && (
              <button aria-label="Clear search" onClick={() => change("q", "")}>
                <X size={16} />
              </button>
            )}
          </label>
          <label className="locality-select">
            <MapPin size={17} />
            <select
              aria-label="Locality"
              value={filters.locality}
              onChange={(e) => change("locality", e.target.value)}
            >
              <option value="">All neighbourhoods</option>
              {localities.map((x) => (
                <option key={x} value={x}>
                  {title(x)}
                </option>
              ))}
            </select>
          </label>
          <button
            className={`button filter-toggle ${filterOpen ? "selected" : ""}`}
            onClick={() => setFilterOpen(!filterOpen)}
            aria-expanded={filterOpen}
          >
            <SlidersHorizontal size={17} />
            Filters
            {activeFilters.length > 0 && (
              <span className="filter-count">{activeFilters.length}</span>
            )}
          </button>
        </div>
        <div className={`filters-panel ${filterOpen ? "expanded" : ""}`}>
          {kind !== "project" && (
            <>
              <label>
                Bedrooms
                <select
                  aria-label="Bedrooms"
                  value={filters.bedroom}
                  onChange={(e) => change("bedroom", e.target.value)}
                >
                  <option value="">Any BHK</option>
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "Plot / no bedrooms" : `${n} BHK`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Furnishing
                <select
                  aria-label="Furnishing"
                  value={filters.furnishing}
                  onChange={(e) => change("furnishing", e.target.value)}
                >
                  <option value="">Any furnishing</option>
                  {["unfurnished", "semi-furnished", "fully-furnished"].map(
                    (x) => (
                      <option key={x}>{x}</option>
                    ),
                  )}
                </select>
              </label>
            </>
          )}
          <label>
            Min. {kind === "rental" ? "monthly rent" : "price"} (₹)
            <input
              aria-label="Minimum price"
              type="number"
              min="0"
              placeholder="No minimum"
              value={filters.minPrice}
              onChange={(e) => change("minPrice", e.target.value)}
            />
          </label>
          <label>
            Max. {kind === "rental" ? "monthly rent" : "price"} (₹)
            <input
              aria-label="Maximum price"
              type="number"
              min="0"
              placeholder="No maximum"
              value={filters.maxPrice}
              onChange={(e) => change("maxPrice", e.target.value)}
            />
          </label>
          {!savedOnly && kind !== "project" && (
            <label>
              Availability
              <select
                aria-label="Availability"
                value={filters.status}
                onChange={(e) => change("status", e.target.value)}
              >
                <option value="live">Available · no flagged records</option>
                <option value="all">All records · includes flagged</option>
              </select>
            </label>
          )}
        </div>
        {badRange && (
          <p className="form-error" role="alert">
            Minimum price must be less than or equal to maximum price.
          </p>
        )}
        {activeFilters.length > 0 && (
          <div className="active-filters">
            {activeFilters.map(([key, value]) => (
              <button
                key={key}
                onClick={() => change(key === "query" ? "q" : key, "")}
              >
                {key === "bedroom"
                  ? `${value} BHK`
                  : key === "minPrice"
                    ? `From ${money(+value)}`
                    : key === "maxPrice"
                      ? `To ${money(+value)}`
                      : title(value)}
                <X size={13} />
              </button>
            ))}
            <button
              className="reset-filters"
              onClick={() => setParams(kind === "sale" ? {} : { kind })}
            >
              Clear all
            </button>
          </div>
        )}
      </section>
      <div className="results-heading">
        <h2>
          {number(filtered.length)}{" "}
          {savedOnly
            ? "saved homes"
            : kind === "project"
              ? "projects"
              : kind === "rental"
                ? "rental homes"
                : "homes to explore"}{" "}
          <span>
            {filters.locality ? `in ${title(filters.locality)}` : "in Pune"}
          </span>
        </h2>
        <label className="sort-select">
          Sort by
          <select
            aria-label="Sort by"
            value={filters.sort}
            onChange={(e) => change("sort", e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="area-desc">Largest area</option>
          </select>
        </label>
      </div>
      {!savedOnly && kind !== "project" && filters.status === "live" && (
        <p className="results-context">
          Available records with no detected quality or seller-network flags.
          Multiple ads may describe the same home.
        </p>
      )}
      {visible.length ? (
        <div className="property-grid">
          {visible.map((x) => (
            <PropertyCard key={x.listing_id || x.project_id} record={x} />
          ))}
        </div>
      ) : (
        <Empty
          icon={savedOnly ? Heart : Search}
          heading={
            savedOnly && !savedIds.length
              ? "Room for your favourites."
              : "No homes match these filters."
          }
        >
          <p>
            {savedOnly && !savedIds.length
              ? "Tap the heart on a home to start your shortlist."
              : "Try another neighbourhood or widen your price range."}
          </p>
          <Link className="button primary" to="/homes">
            Explore homes <ArrowRight size={16} />
          </Link>
        </Empty>
      )}
      {filtered.length > perPage && (
        <div className="pagination">
          <span>
            Showing {number((currentPage - 1) * perPage + 1)}–
            {number(Math.min(currentPage * perPage, filtered.length))} of{" "}
            {number(filtered.length)}
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => {
                setParams((p) => {
                  p.set("page", String(currentPage - 1));
                  return p;
                });
                window.scrollTo({ top: 400, behavior: "smooth" });
              }}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Page {currentPage} of {pages}
            </span>
            <button
              aria-label="Next page"
              disabled={currentPage >= pages}
              onClick={() => {
                setParams((p) => {
                  p.set("page", String(currentPage + 1));
                  return p;
                });
                window.scrollTo({ top: 400, behavior: "smooth" });
              }}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}
    </CatalogGate>
  );
}
