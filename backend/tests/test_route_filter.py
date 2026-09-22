"""Route filtering on /bags, /rejects, /weights.

Covers: after packing two routes, filtering by route_id returns only that
route's bag count and reject count; no filter returns all routes.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.models import DeliveryRoute, SubscriberStop


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSession()
    r1 = DeliveryRoute(name="东线", max_weight_kg=5.0, max_volume_l=10.0)
    r2 = DeliveryRoute(name="西线", max_weight_kg=5.0, max_volume_l=10.0)
    db.add_all([r1, r2])
    db.flush()
    db.add_all(
        [
            # route 1 -> 2 bags (4kg + 4kg can't share a 5kg bag) + 1 reject (9kg > 5kg)
            SubscriberStop(route_id=r1.id, seq=1, name="r1-站点甲", weight_kg=4.0, volume_l=2.0),
            SubscriberStop(route_id=r1.id, seq=2, name="r1-站点乙", weight_kg=4.0, volume_l=2.0),
            SubscriberStop(route_id=r1.id, seq=3, name="r1-超大件", weight_kg=9.0, volume_l=2.0),
            # route 2 -> 1 bag, no rejects
            SubscriberStop(route_id=r2.id, seq=1, name="r2-站点甲", weight_kg=1.0, volume_l=1.0),
            SubscriberStop(route_id=r2.id, seq=2, name="r2-站点乙", weight_kg=1.0, volume_l=1.0),
        ]
    )
    db.commit()
    route_ids = (r1.id, r2.id)
    db.close()

    def override_get_db():
        s = TestingSession()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override_get_db
    # no `with` block: lifespan (postgres create_all/seed) must not run
    yield TestClient(app), route_ids
    app.dependency_overrides.clear()


def pack_both(client, route_ids):
    r1, r2 = route_ids
    bags1 = client.post("/api/pack", json={"route_id": r1})
    assert bags1.status_code == 200
    assert len(bags1.json()) == 2
    bags2 = client.post("/api/pack", json={"route_id": r2})
    assert bags2.status_code == 200
    assert len(bags2.json()) == 1


def test_bags_filter_returns_only_selected_route(client):
    c, (r1, r2) = client
    pack_both(c, (r1, r2))

    bags1 = c.get(f"/api/bags?route_id={r1}").json()
    assert len(bags1) == 2
    assert {b["route_id"] for b in bags1} == {r1}

    bags2 = c.get(f"/api/bags?route_id={r2}").json()
    assert len(bags2) == 1
    assert {b["route_id"] for b in bags2} == {r2}


def test_rejects_filter_returns_only_selected_route(client):
    c, (r1, r2) = client
    pack_both(c, (r1, r2))

    rej1 = c.get(f"/api/rejects?route_id={r1}").json()
    assert len(rej1) == 1
    assert rej1[0]["route_id"] == r1
    assert rej1[0]["stop_name"] == "r1-超大件"

    rej2 = c.get(f"/api/rejects?route_id={r2}").json()
    assert rej2 == []


def test_weights_filter_returns_only_selected_route(client):
    c, (r1, r2) = client
    pack_both(c, (r1, r2))

    w1 = c.get(f"/api/weights?route_id={r1}").json()
    assert len(w1) == 2
    assert {w["route_id"] for w in w1} == {r1}
    # 4kg in a 5kg bag -> 80% weight fill
    assert all(w["fill_weight_pct"] == 80.0 for w in w1)

    w2 = c.get(f"/api/weights?route_id={r2}").json()
    assert len(w2) == 1
    assert {w["route_id"] for w in w2} == {r2}


def test_no_filter_returns_all_routes(client):
    c, (r1, r2) = client
    pack_both(c, (r1, r2))

    bags = c.get("/api/bags").json()
    assert len(bags) == 3
    assert {b["route_id"] for b in bags} == {r1, r2}

    rejects = c.get("/api/rejects").json()
    assert len(rejects) == 1

    weights = c.get("/api/weights").json()
    assert len(weights) == 3
    assert {w["route_id"] for w in weights} == {r1, r2}


def test_repack_one_route_does_not_leak_into_other(client):
    """Pack route 1, then route 2, then re-pack route 1: filtered numbers
    for each route must still reflect only that route."""
    c, (r1, r2) = client
    pack_both(c, (r1, r2))
    # re-pack route 1 after route 2 is done
    again = c.post("/api/pack", json={"route_id": r1})
    assert again.status_code == 200

    assert len(c.get(f"/api/bags?route_id={r1}").json()) == 2
    assert len(c.get(f"/api/bags?route_id={r2}").json()) == 1
    assert len(c.get(f"/api/rejects?route_id={r1}").json()) == 1
    assert len(c.get(f"/api/rejects?route_id={r2}").json()) == 0
    assert len(c.get(f"/api/weights?route_id={r1}").json()) == 2
    assert len(c.get(f"/api/weights?route_id={r2}").json()) == 1
