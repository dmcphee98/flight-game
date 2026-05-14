"""
Builds a directed airport route graph from CSVs containing raw historical arrivals data

Inputs: raw/arrivals/*.csv, public/data/airports.json
Output: public/data/route_graph.json
  {
    "<orig_icao>": {
      "<dest_icao>": {"f": avg_flights_per_day, "d": dist_km, "t": avg_duration_minutes},
      ...
    },
    ...
  }

"t" is omitted for edges where no timed records exist.

Usage:
    python scripts/build_route_graph.py [arrivals_dir] [airports_json] [output_json]
"""
import csv
import glob
import json
import math
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

DATETIME_FMT = '%Y-%m-%d %H:%M:%S'
ROOT = Path(__file__).resolve().parent.parent


def load_airport_coords(airports_path: str) -> dict[str, tuple[float, float]]:
    """Load data mapping from ICAO code to (latitude, longitude) from the airports JSON file."""
    with open(airports_path, encoding='utf-8') as f:
        airports_data = json.load(f)
    schema = airports_data['schema']
    i_icao = schema.index('icao')
    i_lat  = schema.index('lat')
    i_lon  = schema.index('lon')
    coords: dict[str, tuple[float, float]] = {
        row[i_icao]: (row[i_lat], row[i_lon])
        for row in airports_data['airports']
        if row[i_icao]
    }
    return coords


def accumulate_routes(input_files: list[str]) -> dict[tuple[str, str], dict]:
    """
    Aggregate flight counts and durations by (origin, destination) across all CSV files,
    with each file treated as one day.

    Returns a dict keyed by (orig, dest) ICAO pairs, each with:
        count         – total flights on this route
        total_seconds – sum of durations for flights with parseable dep/arr times
        timed_count   – number of flights that contributed to total_seconds;
                        may be less than count if some rows have missing or
                        unparseable times, so use this as the divisor rather
                        than count when computing mean duration
    Example:
        {
            ('EGLL', 'KJFK'): {'count': 14, 'total_seconds': 252000.0, 'timed_count': 12},
            ('YSSY', 'YMML'): {'count': 30, 'total_seconds': 0.0,      'timed_count': 0},
        }
    """
    routes: dict[tuple[str, str], dict] = defaultdict(lambda: {'count': 0, 'total_seconds': 0.0, 'timed_count': 0})

    for path in input_files:
        print(f"Processing {os.path.basename(path)}...")
        seen_keys: set[str] = set()
        with open(path, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                flight_key = row.get('key', '').strip()
                if flight_key:
                    if flight_key in seen_keys:
                        continue
                    seen_keys.add(flight_key)

                orig = row.get('orig', '').strip()
                dest = row.get('dest', '').strip()
                if not orig or not dest or orig == dest:
                    continue

                p = routes[(orig, dest)]
                p['count'] += 1

                dep_raw = row.get('depTime', '').strip()
                arr_raw = row.get('arrTime', '').strip()
                if dep_raw and arr_raw:
                    try:
                        dep = datetime.strptime(dep_raw, DATETIME_FMT)
                        arr = datetime.strptime(arr_raw, DATETIME_FMT)
                        duration = (arr - dep).total_seconds()
                        if duration > 0:
                            p['total_seconds'] += duration
                            p['timed_count'] += 1
                    except ValueError:
                        pass
    return routes


def build_edges(
        routes: dict[tuple[str, str], dict],
        airport_coords: dict[str, tuple[float, float]],
        num_days: int,
) -> tuple[dict, int, int]:
    """
    Convert accumulated routes into a weighted directed graph.

    Each edge contains (keys are abbreviated to minimize JSON output size):
        f – mean daily frequency (flights per day, rounded to 4 decimal paces)
        d – great-circle distance in km
        t – mean flight duration in minutes (omitted if no timed flights)

    Returns:
        graph          – nested dict of {orig: {dest: edge}}
        edge_count     – number of edges written
        skip_no_coords – number of routes skipped due to missing coordinates
    """
    graph: dict[str, dict[str, dict]] = defaultdict(dict)
    edge_count = 0
    skip_no_coords = 0

    for (orig, dest), data in routes.items():
        if orig not in airport_coords or dest not in airport_coords:
            skip_no_coords += 1
            continue

        freq = round(data['count'] / num_days, 4)
        if freq <= 0:
            continue

        lat1, lon1 = airport_coords[orig]
        lat2, lon2 = airport_coords[dest]
        dist = round(haversine_km(lat1, lon1, lat2, lon2))

        edge: dict = {'f': freq, 'd': dist}
        if data['timed_count'] > 0:
            edge['t'] = round(data['total_seconds'] / data['timed_count'] / 60, 1)

        graph[orig][dest] = edge
        edge_count += 1

    return graph, edge_count, skip_no_coords


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance in kilometres between two points on Earth.
    Uses the Haversine formula. Coordinates must be in decimal degrees

    Args:
        lat1: Latitude of the first point.
        lon1: Longitude of the first point.
        lat2: Latitude of the second point.
        lon2: Longitude of the second point.

    Returns:
        Distance between the two points in kilometres.
    """
    R = 6371.0  # Earth's mean radius in kilometres
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(min(1.0, a)))


def build_graph(
    arrivals_dir: str = str(ROOT / 'raw/arrivals'),
    airports_path: str = str(ROOT / 'public/data/airports.json'),
    output_path: str = str(ROOT / 'public/data/route_graph.json'),
) -> None:
    """Orchestrates loading input data and generating the route graph."""
    airport_coords = load_airport_coords(airports_path)
    print(f"Loaded coordinates for {len(airport_coords)} airports")

    arrival_files = sorted(glob.glob(os.path.join(arrivals_dir, '*.csv')))
    if not arrival_files:
        raise SystemExit(f"No CSV files found in {arrivals_dir}")
    routes = accumulate_routes(arrival_files)

    num_days = len(arrival_files)
    graph, edge_count, skip_no_coords = build_edges(routes, airport_coords, num_days)

    degrees = sorted(len(v) for v in graph.values())
    median_deg = degrees[len(degrees) // 2] if degrees else 0

    print(f"Input files:                {num_days}")
    print(f"Departure airports (nodes): {len(graph)}")
    print(f"Directed edges:             {edge_count}")
    print(f"Skipped (no coords):        {skip_no_coords}")
    print(f"Median out-degree:          {median_deg}")

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({k: graph[k] for k in sorted(graph)}, f, separators=(',', ':'))

    size_mb = out.stat().st_size / 1_048_576
    print(f"Written {size_mb:.1f} MB to {output_path}")


if __name__ == '__main__':
    # CLI args override build_graph function defaults when provided
    args = sys.argv[1:4]
    build_graph(*args)