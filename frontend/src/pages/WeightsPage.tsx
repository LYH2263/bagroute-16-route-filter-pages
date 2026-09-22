import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useRoute, withRouteFilter } from "../state/route";
type W = { bag_id: number; bag_index: number; route_id: number; weight_kg: number; volume_l: number; fill_weight_pct: number; fill_volume_pct: number };
export default function WeightsPage() {
  const { routes, routeId } = useRoute();
  const [rows, setRows] = useState<W[]>([]);
  useEffect(() => {
    api<W[]>(withRouteFilter("/weights", routeId)).then(setRows).catch(() => setRows([]));
  }, [routeId]);
  const scope = routeId === ""
    ? "当前显示全部路线的袋重与填充百分比"
    : `当前仅显示路线「${routes.find(r => r.id === routeId)?.name ?? routeId}」的袋重与填充百分比`;
  return (<>
    <h2>袋重</h2>
    <p className="scope-note">{scope}（顶栏选择路线可过滤；不选时为全部路线，与接口 /weights 口径一致；填充百分比按所选路线自身的限重/限体积计算）。</p>
    <table className="table"><thead><tr><th>袋</th><th>路线</th><th>重量</th><th>重量填充</th><th>体积填充</th></tr></thead>
    <tbody>{rows.map(w => <tr key={w.bag_id}><td>{w.bag_index}</td><td>{routes.find(r => r.id === w.route_id)?.name ?? w.route_id}</td><td className="mono">{w.weight_kg}kg</td>
      <td><div className="fill"><span style={{ width: `${Math.min(100, w.fill_weight_pct)}%` }} /></div><span className="mono">{w.fill_weight_pct}%</span></td>
      <td><div className="fill"><span style={{ width: `${Math.min(100, w.fill_volume_pct)}%` }} /></div><span className="mono">{w.fill_volume_pct}%</span></td>
    </tr>)}
      {!rows.length && <tr><td colSpan={5}>{routeId === "" ? "暂无袋重数据" : "该路线暂无袋重数据，请先执行装袋"}</td></tr>}
    </tbody></table>
  </>);
}
