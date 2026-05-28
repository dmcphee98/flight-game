"""
Builds a synthetic airport route graph from the shortlisted ICAO codes.

The compass around each airport is divided into NUM_SECTORS equal sectors.
The nearest airport within MAX_DISTANCE_KM is selected per sector, then up to
MAX_CONNECTIONS of those sector-winners (the closest ones overall) become edges.
This prevents all connections clustering in one direction.
Reverse edges are added so all routes are bidirectional.

Inputs:
    public/data/shortlisted_airport_codes.ts
    public/data/airports.json
Output:
    public/data/route_graph.json  {orig: {dest: {f, d, t}}}

  f – estimated daily flight frequency
  d – great-circle distance in km
  t – estimated flight duration in minutes

Usage:
    python scripts/build_synthetic_routes.py [airports_ts] [airports_json] [output_json]
"""

import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MAX_CONNECTIONS = 5   # max outbound edges per airport
MAX_DISTANCE_KM = 2000 # candidates beyond this are ignored
NUM_SECTORS     = 8   # compass is split into this many equal slices

BASE_FREQ = 0.6

# Hard-coded overrides — fill these at leisure; applied after graph generation.
# Each entry is a pair of ICAO codes. Both directions are affected.
# Disconnections win if an edge appears in both lists.
FORCE_CONNECT: list[tuple[str, str]] = [
    ('YSSY', 'NZAA'),
    ('YBCS', 'AGGH'),
    ('PHNL', 'KSFO'),
    ('PHNL', 'NGTA'),
    ('NFFN', 'NGTA'),
    ('NTAA', 'NZAA'),
    ('SCEL', 'NTAA'),
    ('PANC', 'CYVR'),
    ('PANC', 'CYYC'),
    ('PANC', 'RJCC'),
    ('CYUL', 'BGGH'),
    ('KMIA', 'LPPD'),
    ('SBRF', 'GLRB'),
    ('KMSO', 'CYXE'),
]

FORCE_DISCONNECT: list[tuple[str, str]] = [
    ('YBRK', 'AGGH'),
    ('YBRK', 'NWWW'),
    ('YBRK', 'AYPY'),
    ('YPLM', 'WIII'),
    ('YPLM', 'WADD'),
    ('YPKU', 'WPDL'),
    ('YGEL', 'YBAS'),
    ('YMML', 'YBAS'),
    ('YBMA', 'YPAD'),
    ('YBBN', 'NVVV'),
    ('PTKK', 'AYPY'),
    ('NWWW', 'NFFN'),
    ('CYYC', 'KMSP'),
    ('EGPH', 'BIKF'),
    ('GCLP', 'LPPD'),
    ('GLRB', 'GVNP'),
    ('GABS', 'GCLP'),
    ('GGOV', 'DIAP'),
    ('HBBA', 'FNLU'),
    ('DNMM', 'GABS'),
    ('KDEN', 'CYXE'),
    ('KSTL', 'KMSY'),
    ('KLAS', 'KSEA'),
    ('CYYZ', 'CYWG'),
    ('CYUL', 'KMSP'),
    ('CYUL', 'KMSP'),
    ('KMIA', 'KJFK'),
    ('CYUL', 'KDCA'),
    ('KMSO', 'CYWG'),
    ('CYYC', 'KSLC'),
    ('KBOI', 'CYXE'),
    ('KMSO', 'KSLC'),
    ('KMSO', 'KSEA'),
    ('KBOI', 'CYVR'),
    ('YBAS', 'YPKG'),
    ('YBAS', 'YBRM'),
    ('YSSY', 'YCBP'),
    ('YBMA', 'YBBN'),
    ('ZBAA', 'ZUUU'),
]

def parse_airport_codes(ts_path: str) -> list[str]:
    """Extract ICAO codes from the TypeScript airport list. First occurrence wins on duplicates."""
    seen: set[str] = set()
    codes: list[str] = []
    pattern = re.compile(r"'([A-Z]{4})'")
    with open(ts_path, encoding='utf-8') as f:
        for line in f:
            m = pattern.search(line)
            if m:
                icao = m.group(1)
                if icao not in seen:
                    seen.add(icao)
                    codes.append(icao)
    return codes


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(min(1.0, a)))


def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compass bearing in degrees [0, 360) from point 1 to point 2."""
    d_lon = math.radians(lon2 - lon1)
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    x = math.sin(d_lon) * math.cos(lat2_r)
    y = math.cos(lat1_r) * math.sin(lat2_r) - math.sin(lat1_r) * math.cos(lat2_r) * math.cos(d_lon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def flight_time_minutes(dist_km: float) -> float:
    # ~840 km/h cruise (14 km/min) plus ~35 min ground overhead
    return round(35.0 + dist_km / 14.0, 1)


def flight_frequency(dist_km: float) -> float:
    # Falls off with distance; exponent 0.4 is close to historical data for major hubs
    freq = BASE_FREQ * (1000.0 / max(dist_km, 200.0)) ** 0.4
    return round(max(0.05, freq), 2)


def load_airport_coords(airports_path: str) -> dict[str, tuple[float, float]]:
    with open(airports_path, encoding='utf-8') as f:
        data = json.load(f)
    schema = data['schema']
    i_icao = schema.index('icao')
    i_lat  = schema.index('lat')
    i_lon  = schema.index('lon')
    return {
        row[i_icao]: (row[i_lat], row[i_lon])
        for row in data['airports']
        if row[i_icao]
    }


def build_graph(
    airports_ts: str   = str(ROOT / 'public/data/shortlisted_airport_codes.ts'),
    airports_json: str = str(ROOT / 'public/data/airports.json'),
    output_path: str   = str(ROOT / 'public/data/route_graph.json'),
) -> None:
    codes = parse_airport_codes(airports_ts)
    print(f"Parsed {len(codes)} airports from TypeScript file")

    all_coords = load_airport_coords(airports_json)
    print(f"Loaded coordinates for {len(all_coords)} airports")

    valid = [code for code in codes if code in all_coords]
    missing = set(codes) - set(valid)
    if missing:
        print(f"Skipped {len(missing)} airports (not in airports.json): {sorted(missing)}")

    print(f"Building routes for {len(valid)} airports "
          f"(max {MAX_CONNECTIONS} connections, max {MAX_DISTANCE_KM} km)")

    graph: dict[str, dict[str, dict]] = defaultdict(dict)

    for orig in valid:
        lat1, lon1 = all_coords[orig]

        # Bucket candidates by compass sector; keep only the nearest per sector
        sector_nearest: dict[int, tuple[float, str]] = {}
        for dest in valid:
            if dest == orig:
                continue
            lat2, lon2 = all_coords[dest]
            dist = haversine_km(lat1, lon1, lat2, lon2)
            if dist > MAX_DISTANCE_KM:
                continue
            sector = int(bearing(lat1, lon1, lat2, lon2) / (360 / NUM_SECTORS)) % NUM_SECTORS
            if sector not in sector_nearest or dist < sector_nearest[sector][0]:
                sector_nearest[sector] = (dist, dest)

        # From the per-sector winners, take the MAX_CONNECTIONS closest overall
        for dist, dest in sorted(sector_nearest.values())[:MAX_CONNECTIONS]:
            graph[orig][dest] = {
                'f': flight_frequency(dist),
                'd': round(dist),
                't': flight_time_minutes(dist),
            }

    # Add reverse edges so every route is bidirectional
    for orig, edges in list(graph.items()):
        for dest, edge in edges.items():
            if orig not in graph[dest]:
                graph[dest][orig] = {
                    'f': flight_frequency(edge['d']),
                    'd': edge['d'],
                    't': edge['t'],
                }

    # Apply forced connections (both directions)
    for orig, dest in FORCE_CONNECT:
        for a, b in ((orig, dest), (dest, orig)):
            if a not in all_coords or b not in all_coords:
                print(f"FORCE_CONNECT skipped ({a}-{b}): one or both airports not in airports.json")
                continue
            if b not in graph[a]:
                lat1, lon1 = all_coords[a]
                lat2, lon2 = all_coords[b]
                dist = haversine_km(lat1, lon1, lat2, lon2)
                graph[a][b] = {
                    'f': flight_frequency(dist),
                    'd': round(dist),
                    't': flight_time_minutes(dist),
                }
                print(f"FORCE_CONNECT added: {a} → {b} ({round(dist)} km)")

    # Apply forced disconnections (both directions); wins over FORCE_CONNECT
    for orig, dest in FORCE_DISCONNECT:
        for a, b in ((orig, dest), (dest, orig)):
            if graph[a].pop(b, None) is not None:
                print(f"FORCE_DISCONNECT removed: {a} → {b}")

    edge_count = sum(len(v) for v in graph.values())
    degrees = sorted(len(v) for v in graph.values())
    no_connections = [code for code in valid if code not in graph]

    print(f"Nodes:             {len(graph)}")
    print(f"Directed edges:    {edge_count}")
    print(f"Min out-degree:    {degrees[0]}")
    print(f"Median out-degree: {degrees[len(degrees) // 2]}")
    print(f"Max out-degree:    {degrees[-1]}")
    if no_connections:
        print(f"Isolated (0 connections): {no_connections}")

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({k: graph[k] for k in sorted(graph)}, f, separators=(',', ':'))

    size_mb = out.stat().st_size / 1_048_576
    print(f"Written {size_mb:.3f} MB to {output_path}")


if __name__ == '__main__':
    args = sys.argv[1:4]
    build_graph(*args)
