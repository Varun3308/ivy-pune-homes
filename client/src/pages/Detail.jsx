import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Layers,
  Ruler,
  BedDouble,
  Bath,
  AlertTriangle,
  CircleHelp,
  Check,
  ArrowUpRight,
  Phone,
} from "lucide-react";
import { CatalogGate, Empty, SaveButton } from "../components/common";
import Architecture from "../components/Architecture";
import PropertyCard from "../components/PropertyCard";
import { useApp } from "../hooks";
import { number, money, title, date } from "../format";
export default function Detail({ kind }) {
  const { id } = useParams(),
    { catalog } = useApp();
  const x = catalog?.[
    kind === "project" ? "projects" : kind === "rental" ? "rentals" : "listings"
  ].find((x) => (x.listing_id || x.project_id) === id);
  const project = kind === "project",
    rental = kind === "rental";
  const comparable =
    x && catalog
      ? (project
          ? catalog.listings.filter(
              (y) =>
                y.project_id === id &&
                y.is_live &&
                !y.suspected_fake &&
                !y.corrupt_reasons.length,
            )
          : catalog[kind === "rental" ? "rentals" : "listings"].filter(
              (y) =>
                y.listing_id !== id &&
                y.locality === x.locality &&
                y.bedroom === x.bedroom &&
                y.is_live &&
                !y.suspected_fake &&
                !y.corrupt_reasons.length &&
                Math.abs(y.price_inr - x.price_inr) <= x.price_inr * 0.15,
            )
        ).slice(0, 3)
      : [];
  return (
    <CatalogGate>
      {!x ? (
        <Empty heading="This property could not be found.">
          <Link to="/homes" className="button primary">
            Back to homes
          </Link>
        </Empty>
      ) : (
        <>
          <Link
            className="back-link"
            to={
              project
                ? "/homes?kind=project"
                : rental
                  ? "/homes?kind=rental"
                  : "/homes"
            }
          >
            <ArrowLeft size={16} />
            Back to {project ? "projects" : rental ? "rentals" : "homes"}
          </Link>
          <div className="detail-heading">
            <div>
              <span className="eyebrow">
                {project ? title(x.developer_name) : title(x.property_type)}
              </span>
              <h1>{title(x.apartment_name)}</h1>
              <p>
                <MapPin size={16} />
                {title(x.locality)}, Pune, Maharashtra
              </p>
            </div>
            {!project && !rental && <SaveButton id={id} text />}
          </div>
          <div className="detail-art">
            <Architecture
              seed={[...id].reduce((a, c) => a + c.charCodeAt(0), 0)}
              large
            />
            <span className="detail-art-note">
              Architectural illustration · The API does not provide property
              photographs.
            </span>
          </div>
          <div className="detail-columns">
            <div className="detail-main">
              {!project &&
                (x.suspected_fake ||
                  x.corrupt_reasons.length > 0 ||
                  !x.is_live) && (
                  <div className="quality-alert">
                    <AlertTriangle size={21} />
                    <div>
                      <strong>
                        {x.corrupt_reasons.length
                          ? "This record contains inconsistent information"
                          : x.suspected_fake
                            ? "This seller network needs caution"
                            : "This listing is no longer live"}
                      </strong>
                      <p>
                        {x.corrupt_reasons.join(". ") ||
                          (x.suspected_fake
                            ? "Our dataset analysis flags this seller’s pricing and identity patterns. The API’s verification badge is not a guarantee of authenticity."
                            : "The API returns this record, but its availability flag is false.")}
                      </p>
                    </div>
                  </div>
                )}
              <div className="detail-facts">
                {(project
                  ? [
                      [Building2, x.total_units, "Total units"],
                      [Layers, x.total_towers, "Towers"],
                      [
                        Ruler,
                        `${number(x.min_area_sqft)}–${number(x.max_area_sqft)}`,
                        "Area in sq ft",
                      ],
                    ]
                  : [
                      [BedDouble, x.bedroom || "—", "Bedrooms"],
                      [Bath, x.bathroom || "—", "Bathrooms"],
                      [
                        Ruler,
                        number(x.carpet_area_sqft),
                        "Carpet area · sq ft",
                      ],
                      [Layers, x.floor, "Floor"],
                    ]
                ).map(([Icon, value, label]) => (
                  <div key={label}>
                    <Icon size={21} />
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <section className="detail-section">
                <h2>{project ? "About the project" : "A closer look"}</h2>
                {project ? (
                  <p>
                    {title(x.apartment_name)} by {x.developer_name} is a{" "}
                    {x.project_status} project in {title(x.locality)}, Pune.
                    Explore {number(x.total_units)} units across{" "}
                    {x.total_towers} towers.
                  </p>
                ) : (
                  <>
                    <p className="seller-description">{x.description}</p>
                    <small className="muted-text">
                      Seller-provided description, displayed as plain text.
                      Claims are not independently verified.
                    </small>
                  </>
                )}
              </section>
              <section className="detail-section">
                <h2>Property details</h2>
                <dl className="details-table">
                  {(project
                    ? [
                        ["Status", title(x.project_status)],
                        ["Launch date", date(x.launch_date)],
                        ["Possession date", date(x.possession_date)],
                        ["RERA number", x.rera_number],
                        ["Live listing records", x.actual_live_listings],
                        [
                          "Reported listing count",
                          `${x.total_listings}${x.count_mismatch ? " · differs from live records" : ""}`,
                        ],
                      ]
                    : [
                        ["Furnishing", title(x.furnishing)],
                        ["Facing", title(x.facing_direction)],
                        [
                          "Super built-up area",
                          `${number(x.built_up_area_sqft)} sq ft`,
                        ],
                        ["Building floors", x.total_floors],
                        ["Posted on", `${date(x.posted_at)} · IST`],
                        ["Source", x.website],
                        ...(rental
                          ? [
                              ["Security deposit", money(x.deposit)],
                              [
                                "Maintenance",
                                `${money(x.maintenance)} / month`,
                              ],
                            ]
                          : [
                              ["Covered parking", x.covered_parking],
                              [
                                "Source verification",
                                x.is_verified
                                  ? "Marked verified by source"
                                  : "Not verified by source",
                              ],
                              [
                                "Availability",
                                x.is_live ? "Live record" : "Not live",
                              ],
                            ]),
                      ]
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                {x.area_unit_corrected && (
                  <p className="info-note">
                    <CircleHelp size={16} />
                    This source reports this record’s areas in m². We converted
                    both areas to sq ft (×10.7639).
                  </p>
                )}
                {project && (
                  <p className="info-note">
                    <CircleHelp size={16} />
                    Price bounds have been individually converted from the
                    feed’s mixed lakh/crore units to rupees.
                  </p>
                )}
              </section>
              {project && (
                <section className="detail-section">
                  <h2>Room for the everyday</h2>
                  <div className="amenities">
                    {x.amenities.map((a) => (
                      <span key={a}>
                        <Check size={15} />
                        {title(a)}
                      </span>
                    ))}
                  </div>
                </section>
              )}
              {!project && x.property_group?.length > 1 && (
                <section className="detail-section">
                  <h2>Other ads for this home</h2>
                  <p>
                    Matched using building name, floor, bedrooms, nearby
                    coordinates, and normalized area.
                  </p>
                  <div className="duplicate-links">
                    {x.property_group
                      .filter((other) => other !== id)
                      .map((other) => (
                        <Link key={other} to={`/homes/${other}`}>
                          {other}
                          <ArrowUpRight size={14} />
                        </Link>
                      ))}
                  </div>
                </section>
              )}
            </div>
            <aside className="price-panel">
              <span className="eyebrow">
                {project
                  ? "PROJECT PRICE RANGE"
                  : rental
                    ? "MONTHLY RENT"
                    : "ASKING PRICE"}
              </span>
              <h2>
                {project ? (
                  <>
                    {money(x.price_min_inr)}
                    <span>to {money(x.price_max_inr)}</span>
                  </>
                ) : (
                  money(x.price_inr)
                )}
              </h2>
              {!project && x.price_inr > 0 && (
                <p>
                  {rental
                    ? "Excludes maintenance and deposit"
                    : `${money(x.price_inr / x.carpet_area_sqft)} / sq ft of carpet area`}
                </p>
              )}
              <div className="price-divider" />
              {project ? (
                <>
                  <span className="muted-text">Developed by</span>
                  <h3>{x.developer_name}</h3>
                  <p>
                    {x.actual_live_listings} live listing records in this
                    project
                  </p>
                </>
              ) : (
                <>
                  <span className="muted-text">Listed by {x.posted_by}</span>
                  <h3>{x.posted_by_name}</h3>
                  <a
                    className="button primary wide"
                    href={`tel:${x.posted_by_contact}`}
                  >
                    <Phone size={17} />
                    Contact seller
                  </a>
                  <span className="seller-phone">{x.posted_by_contact}</span>
                </>
              )}
              <p className="price-disclaimer">
                Listing information comes from the source feed. Confirm price
                and availability directly before making a decision.
              </p>
              <small className="record-id">{id}</small>
            </aside>
          </div>
          {comparable.length > 0 && (
            <section className="similar-section">
              <div className="results-heading">
                <h2>
                  {project
                    ? "Homes in this project"
                    : "A few more possibilities"}
                </h2>
                <span className="muted-text">
                  {project
                    ? "Available records"
                    : "Same neighbourhood & BHK, within 15% of price"}
                </span>
              </div>
              <div className="property-grid">
                {comparable.map((y) => (
                  <PropertyCard key={y.listing_id} record={y} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </CatalogGate>
  );
}
