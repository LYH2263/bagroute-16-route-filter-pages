"""Route filtering on /bags, /rejects and /weights."""

from app.models.models import DeliveryRoute, SubscriberStop


def _make_route(db, name, weights, max_weight=5.0, max_volume=100.0):
    route = DeliveryRoute(name=name, max_weight_kg=max_weight, max_volume_l=max_volume)
    db.add(route)
    db.flush()
    for seq, w in enumerate(weights, start=1):
        db.add(
            SubscriberStop(
                route_id=route.id,
                seq=seq,
                name=f"{name}-{seq}",
                weight_kg=w,
                volume_l=1.0,
            )
        )
    db.commit()
    return route.id


def test_bags_and_rejects_filtered_by_route_after_packing_both(client, db):
    # Route 1: one oversized stop (rejected) + two that share one bag.
    rid1 = _make_route(db, "甲线", [6.0, 2.0, 2.0])
    # Route 2: two stops that cannot share a bag -> 2 bags, no rejects.
    rid2 = _make_route(db, "乙线", [3.0, 3.0])

    r1 = client.post("/api/pack", json={"route_id": rid1})
    r2 = client.post("/api/pack", json={"route_id": rid2})
    assert r1.status_code == 200 and r2.status_code == 200

    # Unfiltered = all routes.
    all_bags = client.get("/api/bags").json()
    all_rejects = client.get("/api/rejects").json()
    assert len(all_bags) == 3
    assert {b["route_id"] for b in all_bags} == {rid1, rid2}
    assert len(all_rejects) == 1

    # Filtered bags only belong to the selected route.
    bags1 = client.get(f"/api/bags?route_id={rid1}").json()
    assert len(bags1) == 1
    assert all(b["route_id"] == rid1 for b in bags1)

    bags2 = client.get(f"/api/bags?route_id={rid2}").json()
    assert len(bags2) == 2
    assert all(b["route_id"] == rid2 for b in bags2)

    # Filtered rejects only belong to the selected route.
    rejects1 = client.get(f"/api/rejects?route_id={rid1}").json()
    assert len(rejects1) == 1
    assert rejects1[0]["route_id"] == rid1

    rejects2 = client.get(f"/api/rejects?route_id={rid2}").json()
    assert rejects2 == []

    # Packing one route then switching to the other must not leak its numbers.
    repacked = client.post("/api/pack", json={"route_id": rid1}).json()
    assert len(repacked) == 1
    assert client.get(f"/api/bags?route_id={rid2}").json() == bags2
    assert client.get(f"/api/rejects?route_id={rid2}").json() == []


def test_weights_filtered_by_route(client, db):
    rid1 = _make_route(db, "甲线", [6.0, 2.0, 2.0])
    rid2 = _make_route(db, "乙线", [3.0, 3.0])
    client.post("/api/pack", json={"route_id": rid1})
    client.post("/api/pack", json={"route_id": rid2})

    all_weights = client.get("/api/weights").json()
    assert len(all_weights) == 3

    w1 = client.get(f"/api/weights?route_id={rid1}").json()
    assert len(w1) == 1
    assert w1[0]["route_id"] == rid1
    # 4kg in a 5kg-cap route -> 80% fill.
    assert w1[0]["weight_kg"] == 4.0
    assert w1[0]["fill_weight_pct"] == 80.0

    w2 = client.get(f"/api/weights?route_id={rid2}").json()
    assert len(w2) == 2
    assert all(w["route_id"] == rid2 for w in w2)
