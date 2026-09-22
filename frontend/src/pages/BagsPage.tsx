import { useEffect, useState } from "react";
import { api } from "../api/client";
import { routeQuery, useRouteFilter } from "../components/Layout";

type Bag = { id: number; route_id: number; bag_index: number; weight_kg: number; volume_l: number; items: { stop_name: string; weight_kg: number; volume_l: number }[] };

export default function BagsPage() {
  const { rid, routes } = useRouteFilter();
  const [rows, setRows] = useState<Bag[]>([]);
  useEffect(() => {
    api<Bag[]>(`/bags${routeQuery(rid)}`).then(setRows).catch(() => setRows([]));
  }, [rid]);
  const routeName = (id: number) => routes.find((r) => r.id === id)?.name ?? String(id);
  const current = routes.find((r) => r.id === rid);
  return (<>
    <h2>袋明细</h2>
    <p className="scope-note">
      {rid === ""
        ? "当前显示全部路线的袋（未按路线过滤）；在顶栏选择路线可只看单条路线。"
        : `仅显示路线「${current?.name ?? rid}」的袋，共 ${rows.length} 袋。`}
    </p>
    <table className="table"><thead><tr><th>路线</th><th>袋号</th><th>重量</th><th>体积</th><th>订户</th></tr></thead>
    <tbody>{rows.map(b => <tr key={b.id}><td>{routeName(b.route_id)}</td><td>{b.bag_index}</td><td className="mono">{b.weight_kg}</td><td className="mono">{b.volume_l}</td>
      <td>{b.items.map(i => i.stop_name).join(" → ")}</td></tr>)}
      {!rows.length && <tr><td colSpan={5}>尚无装袋结果，请先执行装袋</td></tr>}
    </tbody></table>
  </>);
}
