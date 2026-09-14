import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  CalendarDays,
  Building2,
  Home,
  TrendingUp,
  Ruler,
  MapPin,
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
} from "lucide-react";
import { CatalogGate } from "../components/common";
import { useApp } from "../hooks";
import { number, money, title, date } from "../format";
export default function Insights() {
  const { catalog } = useApp(),
    [tab, setTab] = useState("neighbourhoods");
  if (!catalog) return <CatalogGate />;
  const s = catalog.summary,
    a = s.answers,
    maxCount = Math.max(...s.by_locality.map((x) => x.count));
  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">A CLEARER PICTURE OF PUNE</span>
          <h1>A little insight. A better move.</h1>
          <p>Understand the market, with every number put in context.</p>
        </div>
        <span className="insight-stamp">
          <ShieldCheck size={19} />
          Full dataset
          <br />
          reviewed
        </span>
      </section>
      <section className="insights-intro">
        <div>
          <span className="eyebrow">THE PUNE PERSPECTIVE</span>
          <h2>Look beyond the asking price.</h2>
          <p>
            Market medians below use live records without detected corruption or
            seller-network flags. Repeated ads remain separate records.
          </p>
        </div>
        <div className="insight-reference">
          <CalendarDays size={19} />
          <span>
            Assignment reference<strong>10 September 2026 · 00:00 IST</strong>
            <small>Dataset loaded {date(catalog.loadedAt)}</small>
          </span>
        </div>
      </section>
      <div className="stat-grid">
        {[
          [
            Building2,
            number(a.total_listing_records),
            "Retrievable sale records",
            `${number(a.active_listings)} are live`,
          ],
          [
            Home,
            number(a.unique_properties),
            "Distinct properties",
            "Matched across repeated ads",
          ],
          [
            TrendingUp,
            money(s.median_price),
            "Median asking price",
            `${number(s.eligible_listings)} eligible live records`,
          ],
          [
            Ruler,
            money(s.median_price_per_sqft),
            "Median price per sq ft",
            "Normalized carpet area",
          ],
        ].map(([Icon, value, label, note]) => (
          <article className="stat-card" key={label}>
            <Icon size={20} />
            <strong>{value}</strong>
            <h3>{label}</h3>
            <p>{note}</p>
          </article>
        ))}
      </div>
      <section className="insight-content">
        <div className="tabs">
          <button
            className={tab === "neighbourhoods" ? "active" : ""}
            onClick={() => setTab("neighbourhoods")}
          >
            Neighbourhoods
          </button>
          <button
            className={tab === "quality" ? "active" : ""}
            onClick={() => setTab("quality")}
          >
            Data quality
          </button>
          <button
            className={tab === "answers" ? "active" : ""}
            onClick={() => setTab("answers")}
          >
            Assignment answers
          </button>
        </div>
        {tab === "neighbourhoods" ? (
          <div className="insight-two-col">
            <section className="chart-panel">
              <h2>A neighbourhood for every chapter</h2>
              <p>Eligible live listing records by locality</p>
              <div className="locality-chart">
                {s.by_locality
                  .toSorted((a, b) => b.count - a.count)
                  .map((x) => (
                    <Link
                      to={`/homes?locality=${encodeURIComponent(x.locality)}`}
                      key={x.locality}
                    >
                      <span>{title(x.locality)}</span>
                      <div className="bar-track">
                        <div
                          style={{ width: `${(x.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <strong>{x.count}</strong>
                    </Link>
                  ))}
              </div>
            </section>
            <section className="chart-panel">
              <h2>Room to grow</h2>
              <p>Eligible listings by bedroom count</p>
              <div className="bhk-chart">
                {s.by_bhk.map((x) => (
                  <Link to={`/homes?bedroom=${x.bedroom}`} key={x.bedroom}>
                    <span>{x.bedroom ? `${x.bedroom} BHK` : "Plots"}</span>
                    <strong>{number(x.count)}</strong>
                    <ArrowUpRight size={17} />
                  </Link>
                ))}
              </div>
              <div className="balewadi-note">
                <MapPin size={20} />
                <span>
                  Your assigned locality<strong>Balewadi</strong>
                  <small>
                    {money(a.total_monthly_rent)} combined monthly rent across{" "}
                    {
                      catalog.rentals.filter((x) => x.locality === "balewadi")
                        .length
                    }{" "}
                    retrievable rentals, including inactive records.
                  </small>
                  <Link to="/homes?kind=rental&locality=balewadi">
                    Explore rentals <ArrowRight size={14} />
                  </Link>
                </span>
              </div>
            </section>
            <section className="chart-panel locality-table">
              <h2>Prices around Pune</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Neighbourhood</th>
                      <th>Eligible listings</th>
                      <th>Median price</th>
                      <th>Median ₹ / sq ft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.by_locality.map((x) => (
                      <tr key={x.locality}>
                        <td>
                          <Link to={`/homes?locality=${x.locality}`}>
                            {title(x.locality)}
                          </Link>
                        </td>
                        <td>{number(x.count)}</td>
                        <td>{money(x.median_price)}</td>
                        <td>₹{number(x.median_price_per_sqft)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : tab === "quality" ? (
          <div className="quality-content">
            <div className="quality-cards">
              {[
                [
                  a.corrupt_listing_ids.length,
                  "Impossible records",
                  "Non-positive prices, floors above the building, inconsistent areas, or swapped coordinates.",
                ],
                [
                  a.fake_listing_ids.length,
                  "Suspected enquiry-bait ads",
                  "Seven seller networks combine multiple identities, broad coverage, and unusually low prices. This is an inference from patterns.",
                ],
                [
                  s.corrected_area_records,
                  "Areas converted",
                  "Only the small-area Magichomes cohort is converted from m²; the rest remains in sq ft.",
                ],
                [
                  a.total_listing_records - a.unique_properties,
                  "Repeated property records",
                  "Building names are normalized and matching uses floor, bedrooms, area, and nearby coordinates.",
                ],
              ].map(([n, h, p]) => (
                <article key={h}>
                  <span>{number(n)}</span>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </article>
              ))}
            </div>
            <section className="chart-panel">
              <h2>Verification isn’t the whole story</h2>
              <p>
                All {a.fake_listing_ids.length} flagged ads carry the source’s
                verified badge. High volume or multiple names alone did not
                qualify a seller: legitimate agencies also show those patterns.
                We compare normalized prices against the same locality and
                bedroom count.
              </p>
              <details>
                <summary>View the seven flagged seller networks</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Contact</th>
                        <th>Records</th>
                        <th>Names</th>
                        <th>Localities</th>
                        <th>Median vs. peers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.fraud_networks.map((x) => (
                        <tr key={x.phone}>
                          <td>{x.phone}</td>
                          <td>{x.count}</td>
                          <td>{x.names}</td>
                          <td>{x.localities}</td>
                          <td>{Math.round(x.relative_price * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
            <section className="chart-panel">
              <h2>
                {a.projects_with_wrong_listing_count} project counts don’t add
                up
              </h2>
              <p>
                Reported project counts compared with all retrievable records
                linked to that project whose is_live flag is true. Flagged ads
                are included in this reconciliation.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Reported</th>
                      <th>Observed live</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.project_mismatches.slice(0, 15).map((x) => (
                      <tr key={x.project_id}>
                        <td>
                          <Link to={`/projects/${x.project_id}`}>
                            {title(x.name)}
                          </Link>
                        </td>
                        <td>{x.reported}</td>
                        <td>{x.observed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <small className="muted-text">
                Showing 15 of {s.project_mismatches.length} discrepancies. Each
                project page shows its own counts.
              </small>
            </section>
          </div>
        ) : (
          <section className="chart-panel answers-panel">
            <h2>The ten assignment answers</h2>
            <p>
              All counts are record-based unless the question explicitly asks
              for distinct properties. The seven-day window is 3–10 September
              2026, ending exclusively at midnight IST.
            </p>
            <dl>
              {[
                [
                  "1. Retrievable listing records",
                  number(a.total_listing_records),
                ],
                ["2. Distinct properties", number(a.unique_properties)],
                ["3. Live listing records", number(a.active_listings)],
                ["4. Impossible listing records", a.corrupt_listing_ids.length],
                [
                  "5. Balewadi combined monthly rent",
                  `₹${number(a.total_monthly_rent)}`,
                ],
                [
                  "6. Mean eligible live 2 BHK price / sq ft",
                  `₹${a.avg_price_per_sqft_2bhk.toFixed(2)}`,
                ],
                [
                  "7. Costliest project",
                  `${a.costliest_project.project_id} · ₹${number(a.costliest_project.price_max_inr)}`,
                ],
                [
                  "8. Posted in reference seven-day window",
                  a.listings_last_7_days,
                ],
                [
                  "9. Suspected fake listing records",
                  a.fake_listing_ids.length,
                ],
                [
                  "10. Projects with incorrect counts",
                  a.projects_with_wrong_listing_count,
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {[
              ["Impossible record IDs", a.corrupt_listing_ids],
              ["Suspected fake record IDs", a.fake_listing_ids],
            ].map(([label, ids]) => (
              <details key={label}>
                <summary>
                  {label} ({ids.length})
                </summary>
                <div className="duplicate-links">
                  {ids.map((id) => (
                    <Link to={`/homes/${id}`} key={id}>
                      {id}
                      <ArrowUpRight size={13} />
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </section>
        )}
      </section>
      <p className="insight-method">
        <CircleHelp size={16} />
        Medians describe records in this dataset, not a property valuation.
        Matching and seller flags are documented, reproducible inferences.
      </p>
    </>
  );
}
