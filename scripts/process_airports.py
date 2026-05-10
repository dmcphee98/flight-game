#!/usr/bin/env python3
"""
ETL script: data/raw/airports.csv -> data/processed/airports.min.json

Usage:
  python scripts/process_airports.py
  python scripts/process_airports.py --columns icao_code iata_code latitude_deg longitude_deg type name
  python scripts/process_airports.py --types large_airport medium_airport
  python scripts/process_airports.py --require icao_code iata_code
  python scripts/process_airports.py --columns icao_code iata_code latitude_deg longitude_deg --types large_airport --require icao_code

Typical usage:
  python scripts/process_airports.py --types large_airport medium_airport --require icao_code iata_code
"""

import argparse
import csv
import json
import os
import sys

# Column name -> short alias used as schema key in output
COLUMN_ALIASES = {
    "ident": "ident",
    "type": "type",
    "name": "name",
    "latitude_deg": "lat",
    "longitude_deg": "lon",
    "elevation_ft": "elev",
    "continent": "continent",
    "iso_country": "country",
    "iso_region": "region",
    "municipality": "municipality",
    "scheduled_service": "scheduled",
    "icao_code": "icao",
    "iata_code": "iata",
    "gps_code": "gps",
    "local_code": "local_code",
}

NUMERIC_COLUMNS = {"latitude_deg", "longitude_deg", "elevation_ft"}

DEFAULT_COLUMNS = ["icao_code", "iata_code", "latitude_deg", "longitude_deg", "type"]

VALID_TYPES = {
    "large_airport",
    "medium_airport",
    "small_airport",
    "heliport",
    "seaplane_base",
    "balloonport",
    "closed",
}

# Stable ordering so integer values are consistent across runs
TYPE_INT = {
    "large_airport": 0,
    "medium_airport": 1,
    "small_airport": 2,
    "heliport": 3,
    "seaplane_base": 4,
    "balloonport": 5,
    "closed": 6,
}


def coerce(col, value):
    if col in NUMERIC_COLUMNS:
        if value == "" or value is None:
            return None
        try:
            return float(value)
        except ValueError:
            return None
    if col == "type":
        return TYPE_INT.get(value)
    return value if value != "" else None


def main():
    parser = argparse.ArgumentParser(description="Process airports CSV to compact JSON.")
    parser.add_argument(
        "--input",
        default="data/raw/airports.csv",
        help="Path to input CSV (default: data/raw/airports.csv)",
    )
    parser.add_argument(
        "--output",
        default="public/airports.min.json",
        help="Path to output JSON (default: public/airports.min.json)",
    )
    parser.add_argument(
        "--columns",
        nargs="+",
        default=DEFAULT_COLUMNS,
        help=f"Columns to include (default: {' '.join(DEFAULT_COLUMNS)}). "
             f"Available: {', '.join(sorted(COLUMN_ALIASES))}",
    )
    parser.add_argument(
        "--types",
        nargs="+",
        default=None,
        metavar="TYPE",
        help=f"Filter to these airport types. Available: {', '.join(sorted(VALID_TYPES))}",
    )
    parser.add_argument(
        "--require",
        nargs="+",
        default=None,
        metavar="COLUMN",
        help="Drop rows where any of these columns are null (e.g. --require icao_code iata_code).",
    )
    args = parser.parse_args()

    unknown_cols = [c for c in args.columns if c not in COLUMN_ALIASES]
    if unknown_cols:
        print(f"Error: unknown column(s): {', '.join(unknown_cols)}", file=sys.stderr)
        print(f"Available: {', '.join(sorted(COLUMN_ALIASES))}", file=sys.stderr)
        sys.exit(1)

    if args.types:
        unknown_types = [t for t in args.types if t not in VALID_TYPES]
        if unknown_types:
            print(f"Error: unknown type(s): {', '.join(unknown_types)}", file=sys.stderr)
            print(f"Available: {', '.join(sorted(VALID_TYPES))}", file=sys.stderr)
            sys.exit(1)
        type_filter = set(args.types)
    else:
        type_filter = None

    if args.require:
        unknown_req = [c for c in args.require if c not in COLUMN_ALIASES]
        if unknown_req:
            print(f"Error: unknown --require column(s): {', '.join(unknown_req)}", file=sys.stderr)
            sys.exit(1)
        require_cols = args.require
    else:
        require_cols = []

    schema = [COLUMN_ALIASES[c] for c in args.columns]
    types = [k for k, _ in sorted(TYPE_INT.items(), key=lambda x: x[1])]
    rows = []

    with open(args.input, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for record in reader:
            if type_filter and record.get("type") not in type_filter:
                continue
            if any(not record.get(col) for col in require_cols):
                continue
            row = [coerce(col, record.get(col, "")) for col in args.columns]
            rows.append(row)

    output = {"schema": schema, "types": types, "airports": rows}

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, separators=(",", ":"))

    print(f"Wrote {len(rows)} airports to {args.output}")


if __name__ == "__main__":
    main()
