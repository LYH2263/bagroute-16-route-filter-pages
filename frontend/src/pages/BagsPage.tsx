import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useRoute, withRouteFilter } from "../state/route";
type Bag = { id: number; route_id: number; bag_index: number; weight_kg: number; volume_l: number; items: { stop_name: string; weight_kg: number; volume_l: number }[] };
export default function BagsPage() {
  const { routes, routeId } = useRoute();
  const [rows, setRows] = useState<Bag[]>([]);
  useEffect(() => {
    api<Bag[]>(withRouteFilter("/bags", routeId)).then(setRows).catch(() => setRows([]));
  }, [routeId]);
  const scope = routeId === ""
    ? "当前显示全部路线的袋"
    : `当前仅显示路线「${routes.find(r => r.id === routeId)?.name ?? routeId}」的袋`;
  return (<>
    <h2>袋明细</h2>
    <p className="scope-note">{scope}（顶栏选择路线可过滤；不选时为全部路线，与接口 /bags 口径一致）。</p>
    <table className="table"><thead><tr><th>路线</th><th>袋号</th><th>重量</th><th>体积</th><th>订户</th></tr></thead>
    <tbody>{rows.map(b => <tr key={b.id}><td>{routes.find(r => r.id === b.route_id)?.name ?? b.route_id}</td><td>{b.bag_index}</td><td className="mono">{b.weight_kg}</td><td className="mono">{b.volume_l}</td>
      <td>{b.items.map(i => i.stop_name).join(" → ")}</td></tr>)}
      {!rows.length && <tr><td colSpan={5}>{routeId === "" ? "尚无装袋结果，请先执行装袋" : "该路线尚无装袋结果，请先执行装袋"}</td></tr>}
    </tbody></table>
  </>);
}
