import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { api } from "../api/client";

const stripLinks = [
  ["/pack", "装袋"],
  ["/routes", "路线"],
  ["/stops", "站点"],
  ["/bags", "袋明细"],
  ["/rejects", "拒收"],
  ["/weights", "袋重"],
];

type Stop = { id: number; route_id: number; seq: number; name: string; weight_kg: number; volume_l: number };
export type RouteInfo = { id: number; name: string };
type Weight = {
  bag_id: number;
  bag_index: number;
  route_id: number;
  weight_kg: number;
  volume_l: number;
  fill_weight_pct: number;
  fill_volume_pct: number;
};

/** rid === "" 表示“全部路线”（不按路线过滤），与接口不传 route_id 的口径一致 */
export type RouteFilter = { rid: number | ""; routes: RouteInfo[] };

export function useRouteFilter(): RouteFilter {
  return useOutletContext<RouteFilter>();
}

export function routeQuery(rid: number | ""): string {
  return rid === "" ? "" : `?route_id=${rid}`;
}

export default function Layout() {
  const loc = useLocation();
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [rid, setRid] = useState<number | "">("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [weights, setWeights] = useState<Weight[]>([]);

  useEffect(() => {
    api<RouteInfo[]>("/routes").then((r) => {
      setRoutes(r);
      if (r[0]) setRid(r[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (rid === "") {
      setStops([]);
      return;
    }
    api<Stop[]>(`/stops?route_id=${rid}`).then(setStops).catch(() => setStops([]));
  }, [rid, loc.pathname]);

  useEffect(() => {
    const q = `/weights${routeQuery(rid)}`;
    api<Weight[]>(q).then(setWeights).catch(() => setWeights([]));
    const t = setInterval(() => {
      api<Weight[]>(q).then(setWeights).catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, [rid, loc.pathname]);

  const meters = useMemo(() => weights.slice(0, 10), [weights]);
  const filter = useMemo<RouteFilter>(() => ({ rid, routes }), [rid, routes]);

  return (
    <div className="routeboard-shell">
      <header className="route-strip-chrome">
        <div className="route-strip-top">
          <div className="route-brand">
            <span className="route-brand-mark">BR</span>
            <div>
              <div className="route-brand-name">BagRoute</div>
              <div className="route-brand-sub">投递路线条带</div>
            </div>
          </div>
          <label className="route-pick">
            路线
            <select
              value={rid}
              onChange={(e) =>
                setRid(e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">全部路线</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <nav className="route-bead-nav" aria-label="功能">
            {stripLinks.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `route-bead-link${isActive ? " route-bead-link--on" : ""}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="stop-timeline" aria-label="站点时间线">
          <div className="stop-timeline-rail" />
          {stops.length === 0 && (
            <div className="stop-timeline-empty">选择路线后显示站点珠串</div>
          )}
          {stops.map((s, i) => (
            <div key={s.id} className="stop-bead" style={{ zIndex: stops.length - i }}>
              <div className="stop-bead-dot" />
              <div className="stop-bead-card">
                <span className="stop-bead-seq">#{s.seq}</span>
                <strong>{s.name}</strong>
                <span className="mono">
                  {s.weight_kg}kg · {s.volume_l}L
                </span>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="route-twin-lanes">
        <section className="pack-plan-lane">
          <div className="lane-eyebrow">装袋计划台</div>
          <Outlet context={filter} />
        </section>
        <aside className="meter-lane" aria-label="重量体积仪表">
          <div className="lane-eyebrow">重量 / 体积仪表</div>
          {meters.length === 0 && <p className="meter-empty">暂无袋重数据</p>}
          {meters.map((w) => (
            <div key={w.bag_id} className="meter-block">
              <div className="meter-head">
                <span>袋 {w.bag_index}</span>
                <span className="mono">
                  {w.weight_kg}kg / {w.volume_l}L
                </span>
              </div>
              <div className="meter-row">
                <span>重</span>
                <div className="meter-bar">
                  <span style={{ width: `${Math.min(100, w.fill_weight_pct)}%` }} />
                </div>
                <span className="mono">{w.fill_weight_pct}%</span>
              </div>
              <div className="meter-row">
                <span>体</span>
                <div className="meter-bar meter-bar--vol">
                  <span style={{ width: `${Math.min(100, w.fill_volume_pct)}%` }} />
                </div>
                <span className="mono">{w.fill_volume_pct}%</span>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
