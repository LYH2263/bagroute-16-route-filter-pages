import { useEffect, useState } from "react";
import { api } from "../api/client";
import { routeQuery, useRouteFilter } from "../components/Layout";

type W = { bag_id: number; bag_index: number; route_id: number; weight_kg: number; volume_l: number; fill_weight_pct: number; fill_volume_pct: number };

export default function WeightsPage() {
  const { rid, routes } = useRouteFilter();
  const [rows, setRows] = useState<W[]>([]);
  useEffect(() => {
    api<W[]>(`/weights${routeQuery(rid)}`).then(setRows).catch(() => setRows([]));
  }, [rid]);
  const routeName = (id: number) => routes.find((r) => r.id === id)?.name ?? String(id);
  const current = routes.find((r) => r.id === rid);
  return (<>
    <h2>袋重</h2>
    <p className="scope-note">
      {rid === ""
        ? "当前显示全部路线的袋重与填充百分比（未按路线过滤）；在顶栏选择路线可只看单条路线。"
        : `仅显示路线「${current?.name ?? rid}」的袋重与填充百分比，共 ${rows.length} 袋。`}
    </p>
    <table className="table"><thead><tr><th>袋</th><th>路线</th><th>重量</th><th>重量填充</th><th>体积填充</th></tr></thead>
    <tbody>{rows.map(w => <tr key={w.bag_id}><td>{w.bag_index}</td><td>{routeName(w.route_id)}</td><td className="mono">{w.weight_kg}kg</td>
      <td><div className="fill"><span style={{ width: `${Math.min(100, w.fill_weight_pct)}%` }} /></div><span className="mono">{w.fill_weight_pct}%</span></td>
      <td><div className="fill"><span style={{ width: `${Math.min(100, w.fill_volume_pct)}%` }} /></div><span className="mono">{w.fill_volume_pct}%</span></td>
    </tr>)}
      {!rows.length && <tr><td colSpan={5}>暂无袋重数据，请先执行装袋</td></tr>}
    </tbody></table>
  </>);
}
