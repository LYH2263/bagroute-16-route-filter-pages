import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useRoute, withRouteFilter } from "../state/route";
type Rj = { id: number; route_id: number; stop_name: string; reason: string; created_at: string };
export default function RejectsPage() {
  const { routes, routeId } = useRoute();
  const [rows, setRows] = useState<Rj[]>([]);
  useEffect(() => {
    api<Rj[]>(withRouteFilter("/rejects", routeId)).then(setRows).catch(() => setRows([]));
  }, [routeId]);
  const scope = routeId === ""
    ? "当前显示全部路线的拒收"
    : `当前仅显示路线「${routes.find(r => r.id === routeId)?.name ?? routeId}」的拒收`;
  return (<>
    <h2>拒收</h2>
    <p className="scope-note">{scope}（顶栏选择路线可过滤；不选时为全部路线，与接口 /rejects 口径一致）。</p>
    <table className="table"><thead><tr><th>时间</th><th>路线</th><th>订户</th><th>原因</th></tr></thead>
    <tbody>{rows.map(r => <tr key={r.id}><td className="mono">{new Date(r.created_at).toLocaleString()}</td><td>{routes.find(x => x.id === r.route_id)?.name ?? r.route_id}</td><td>{r.stop_name}</td><td>{r.reason}</td></tr>)}
      {!rows.length && <tr><td colSpan={4}>{routeId === "" ? "暂无拒收" : "该路线暂无拒收"}</td></tr>}
    </tbody></table>
  </>);
}
