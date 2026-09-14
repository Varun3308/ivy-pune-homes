import React from "react";
import { Link } from "react-router-dom";
import {
  BedDouble,
  Ruler,
  Building2,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { SaveButton } from "./common";
import Architecture from "./Architecture";
import { money, number, title } from "../format";
export default function PropertyCard({ record: x }) {
  const project = x.kind === "project",
    rental = x.kind === "rental",
    id = x.listing_id || x.project_id,
    seed = [...id].reduce((a, c) => a + c.charCodeAt(0), 0),
    url = `/${project ? "projects" : rental ? "rentals" : "homes"}/${id}`;
  return (
    <article className="property-card" data-testid="property-card">
      <div className="card-visual">
        <Link to={url} tabIndex={-1} aria-hidden="true">
          <Architecture seed={seed} />
        </Link>
        <div className="card-badges">
          {project ? (
            <span className="pill">{title(x.project_status)}</span>
          ) : x.corrupt_reasons.length ? (
            <span className="pill warning">Data issue</span>
          ) : x.suspected_fake ? (
            <span className="pill warning">Seller caution</span>
          ) : !x.is_live ? (
            <span className="pill muted">Unavailable</span>
          ) : (
            <span className="pill">{rental ? "For rent" : "For sale"}</span>
          )}
        </div>
        {!project && !rental && <SaveButton id={id} />}
        <span className="illustration-label">Illustration</span>
      </div>
      <div className="card-content">
        <div className="card-price">
          {project
            ? `${money(x.price_min_inr)} – ${money(x.price_max_inr)}`
            : money(x.price_inr)}
          {rental && <small>/ month</small>}
        </div>
        <h3>
          <Link to={url}>{title(x.apartment_name)}</Link>
        </h3>
        <p className="card-location">
          <MapPin size={13} />
          {title(x.locality)}, Pune
        </p>
        <div className="card-facts">
          {project ? (
            <>
              <span>
                <Ruler size={15} />
                {number(x.min_area_sqft)}–{number(x.max_area_sqft)} sq ft
              </span>
              <span>
                <Building2 size={15} />
                {x.total_towers} towers
              </span>
            </>
          ) : (
            <>
              <span>
                <BedDouble size={15} />
                {x.bedroom ? `${x.bedroom} BHK` : "Plot"}
              </span>
              <span>
                <Ruler size={15} />
                {number(x.carpet_area_sqft)} sq ft
              </span>
              <span className="furnishing">
                {x.furnishing === "fully-furnished"
                  ? "Furnished"
                  : x.furnishing === "semi-furnished"
                    ? "Semi-furnished"
                    : "Unfurnished"}
              </span>
            </>
          )}
        </div>
        <div className="card-bottom">
          <span>
            {project
              ? `${x.actual_live_listings} live listings`
              : x.area_unit_corrected
                ? "Area converted to sq ft"
                : x.property_group?.length > 1
                  ? `${x.property_group.length} ads for this home`
                  : title(x.property_type)}
          </span>
          <Link to={url} aria-label={`View ${title(x.apartment_name)}`}>
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  );
}
