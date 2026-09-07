import sys
import pandas as pd
from pathlib import Path

PROJECT_ROOT = Path("d:/RideCast")
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from utils.map_utils import STOP_COORDS

DATA_DIR = Path("d:/RideCast/dataset/data")
rs = pd.read_csv(DATA_DIR / "route_stops.csv")

for sid, group in rs.groupby("service_id"):
    stops = group.sort_values("stop_order")["stop_id"].tolist()
    missing_coords = [s for s in stops if s not in STOP_COORDS]
    print(f"Service {sid}: {len(stops)} stops, Missing coords: {missing_coords}")
