import { useEffect, useState } from "react";
import { api } from "../api/client";
import { routeQuery, useRouteFilter } from "../components/Layout";

type Rj = { id: number; route_id: number; stop_name: string; reason: string; created_at: string };

export default function RejectsPage() {
  const { rid, routes } = useRouteFilter();
  const [rows, setRows] = useState<Rj[]>([]);
  useEffect(() => {
    api<Rj[]>(`/rejects${routeQuery(rid)}`).then(setRows).catch(() => setRows([]));
  }, [rid]);
  const routeName = (id: number) => routes.find((r) => r.id === id)?.name ?? String(id);
  const current = routes.find((r) => r.id === rid);
  return (<>
    <h2>拒收</h2>
    <p className="scope-note">
      {rid === ""
        ? "当前显示全部路线的拒收（未按路线过滤）；在顶栏选择路线可只看单条路线。"
        : `仅显示路线「${current?.name ?? rid}」的拒收，共 ${rows.length} 条。`}
    </p>
    <table className="table"><thead><tr><th>时间</th><th>路线</th><th>订户</th><th>原因</th></tr></thead>
    <tbody>{rows.map(r => <tr key={r.id}><td className="mono">{new Date(r.created_at).toLocaleString()}</td><td>{routeName(r.route_id)}</td><td>{r.stop_name}</td><td>{r.reason}</td></tr>)}
      {!rows.length && <tr><td colSpan={4}>暂无拒收</td></tr>}
    </tbody></table>
  </>);
}
