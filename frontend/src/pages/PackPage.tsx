import { useState } from "react";
import { api } from "../api/client";
import { useRoute } from "../state/route";
type Bag = { id: number; bag_index: number; weight_kg: number; volume_l: number; items: { stop_name: string }[] };
export default function PackPage() {
  const { routes, routeId, setRouteId } = useRoute();
  // Packing target when the shared filter is "全部路线": default to the first
  // route, without changing the filter shown on the other pages.
  const [localRid, setLocalRid] = useState<number | null>(null);
  const rid: number | "" =
    routeId === "" ? (localRid ?? routes[0]?.id ?? "") : routeId;
  const [bags, setBags] = useState<Bag[]>([]);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  function pick(v: number) {
    setLocalRid(v);
    setRouteId(v); // keep the in-page selector in sync with the top bar
  }
  async function run() {
    setMsg(""); setErr("");
    try {
      const out = await api<Bag[]>("/pack", { method: "POST", body: JSON.stringify({ route_id: rid }) });
      setBags(out);
      setMsg(`完成装袋：${out.length} 袋`);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }
  return (<>
    <h2>装袋</h2>
    <p className="scope-note">在下方选择要装袋的路线，选择会同步到顶栏过滤；顶栏为“全部路线”时此处默认第一条路线。</p>
    <div className="toolbar">
      <select value={rid} onChange={e => pick(Number(e.target.value))}>{routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <button onClick={run} disabled={routes.length === 0}>按路线顺序双约束装袋</button>
    </div>
    {msg && <div className="ok">{msg}</div>}
    {err && <div className="err">{err}</div>}
    {bags.map(b => (
      <div key={b.id}>
        <div className="mono">袋 {b.bag_index} · {b.weight_kg}kg / {b.volume_l}L</div>
        <div className="bag-row">{b.items.map((it, i) => <div className="bag-block" key={i}>{it.stop_name}</div>)}</div>
      </div>
    ))}
  </>);
}
