import numpy as np
import pandas as pd
import pickle
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler, LabelEncoder


# ==================================================
# PROJECT PATHS
# ==================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

INPUT_FILE = PROJECT_ROOT / "dataset" / "data" / "historical_ridership.csv"
PROCESSED_DIR = PROJECT_ROOT / "dataset" / "data" / "processed"

ENCODED_FILE = PROCESSED_DIR / "encoded_ridership.csv"
SCALED_FILE = PROCESSED_DIR / "scaled_ridership.csv"

X_TRAIN_FILE = PROCESSED_DIR / "X_train.npy"
Y_TRAIN_FILE = PROCESSED_DIR / "y_train.npy"
X_TEST_FILE = PROCESSED_DIR / "X_test.npy"
Y_TEST_FILE = PROCESSED_DIR / "y_test.npy"

SCALER_FILE = PROCESSED_DIR / "scaler.pkl"
ENCODERS_FILE = PROCESSED_DIR / "encoders.pkl"


# ==================================================
# SEQUENCE LENGTH
#
# LSTM looks at the last 7 days of data
# for a given zone + time slot to predict
# the next day's passenger count.
# ==================================================

SEQUENCE_LENGTH = 7


# ==================================================
# TRAIN / TEST SPLIT
#
# 80% of data for training
# 20% of data for testing
# ==================================================

TRAIN_RATIO = 0.8


# ==================================================
# STEP 1 — LOAD & CLEAN
#
# Load the dataset and check for:
# - Missing values
# - Duplicate rows
# ==================================================

def step1_clean(df):

    print(f"  Rows loaded       : {len(df)}")

    # Fill holiday_name blanks (empty on non-holiday days)
    df["holiday_name"] = df["holiday_name"].fillna("")

    # Check missing values
    missing = df.isnull().sum().sum()
    print(f"  Missing values    : {missing}")

    # Drop duplicates if any
    before = len(df)
    df = df.drop_duplicates()
    dropped = before - len(df)
    print(f"  Duplicates dropped: {dropped}")

    # Sort by date, service, zone, time
    # so sequences are in correct order
    df = df.sort_values(
        by=["service_id", "from_stop_id", "to_stop_id", "date", "time"]
    ).reset_index(drop=True)

    print(f"  Rows after clean  : {len(df)}")

    return df


# ==================================================
# STEP 2 — ENCODE
#
# Convert all text columns to numbers.
# LabelEncoder assigns a unique integer
# to each unique text value.
#
# Example:
#   service_id: S45=0, S57=1, S33A=2, S48=3
#   day_of_week: Monday=0, Tuesday=1 ... Sunday=6
#   holiday: No=0, Yes=1
#
# date is split into:
#   month      (1-12)
#   day_of_year (1-366)
#
# time is encoded as a slot index:
#   first unique time=0, second=1 ...
# ==================================================

def step2_encode(df):

    encoders = {}

    # ----------------------------------------------
    # ENCODE: service_id
    # ----------------------------------------------

    le_service = LabelEncoder()
    df["service_id"] = le_service.fit_transform(df["service_id"])
    encoders["service_id"] = le_service

    # ----------------------------------------------
    # ENCODE: from_stop_id
    # ----------------------------------------------

    le_from = LabelEncoder()
    df["from_stop_id"] = le_from.fit_transform(df["from_stop_id"])
    encoders["from_stop_id"] = le_from

    # ----------------------------------------------
    # ENCODE: to_stop_id
    # ----------------------------------------------

    le_to = LabelEncoder()
    df["to_stop_id"] = le_to.fit_transform(df["to_stop_id"])
    encoders["to_stop_id"] = le_to

    # ----------------------------------------------
    # ENCODE: day_of_week
    # ----------------------------------------------

    le_day = LabelEncoder()
    df["day_of_week"] = le_day.fit_transform(df["day_of_week"])
    encoders["day_of_week"] = le_day

    # ----------------------------------------------
    # ENCODE: holiday (Yes=1, No=0)
    # ----------------------------------------------

    df["holiday"] = df["holiday"].map({"Yes": 1, "No": 0})

    # ----------------------------------------------
    # ENCODE: time → slot index
    # ----------------------------------------------

    # Get unique times per service in sorted order
    # and assign 0,1,2,3,4,5
    time_slot_map = {
        t: i for i, t in enumerate(sorted(df["time"].unique()))
    }
    df["time"] = df["time"].map(time_slot_map)
    encoders["time"] = time_slot_map

    # ----------------------------------------------
    # ENCODE: date → month + day_of_year
    # ----------------------------------------------

    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.month
    df["day_of_year"] = df["date"].dt.dayofyear
    df = df.drop(columns=["date"])

    # ----------------------------------------------
    # DROP: holiday_name
    # (already captured by holiday 0/1 flag)
    # ----------------------------------------------

    df = df.drop(columns=["holiday_name"])

    print(f"  Columns after encoding: {list(df.columns)}")

    return df, encoders


# ==================================================
# STEP 3 — NORMALISE
#
# Scale all numerical columns to 0-1 range
# using MinMaxScaler.
#
# This prevents large values (like passenger
# counts) from dominating small values
# (like weather_code).
#
# The scaler is saved so we can reverse the
# scaling later to get real passenger counts
# back from LSTM predictions.
# ==================================================

def step3_normalise(df):

    scaler = MinMaxScaler()

    # All columns are now numerical
    columns_to_scale = df.columns.tolist()

    df[columns_to_scale] = scaler.fit_transform(
        df[columns_to_scale]
    )

    print(f"  All {len(columns_to_scale)} columns scaled to 0-1")

    return df, scaler


# ==================================================
# STEP 4 — CREATE SEQUENCES
#
# LSTM needs sequences of past data to learn
# time-based patterns.
#
# For each unique zone + time slot combination,
# we slide a window of SEQUENCE_LENGTH (7) days:
#
#   Day 1-7   → predict Day 8
#   Day 2-8   → predict Day 9
#   Day 3-9   → predict Day 10
#   ...
#
# Input (X):  7 rows × all feature columns
# Output (y): next day's inbound + outbound
#             passenger counts
#
# We group by (service_id, from_stop_id,
# to_stop_id, time) so sequences never mix
# different zones or time slots.
# ==================================================

def step4_sequences(df):

    X = []
    y = []

    # Identify target columns
    # (what LSTM will predict)
    target_cols = [
        "inbound_passenger_count",
        "outbound_passenger_count"
    ]

    target_indices = [
        df.columns.get_loc(col)
        for col in target_cols
    ]

    feature_count = len(df.columns)

    # Group by zone + time slot
    groups = df.groupby(
        ["service_id", "from_stop_id", "to_stop_id", "time"]
    )

    group_count = 0
    sequence_count = 0

    for _, group in groups:

        group_count += 1
        values = group.values

        # Slide window across this group's days
        for i in range(len(values) - SEQUENCE_LENGTH):

            # Input: 7 days of all features
            X.append(values[i: i + SEQUENCE_LENGTH])

            # Output: next day's passenger counts
            y.append(values[i + SEQUENCE_LENGTH][target_indices])

            sequence_count += 1

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)

    print(f"  Groups (zones × slots) : {group_count}")
    print(f"  Total sequences        : {sequence_count}")
    print(f"  X shape                : {X.shape}")
    print(f"  y shape                : {y.shape}")

    # --------------------------------------------------
    # TRAIN / TEST SPLIT
    #
    # First 80% → training
    # Last  20% → testing
    # No shuffle — time order must be preserved
    # --------------------------------------------------

    split = int(len(X) * TRAIN_RATIO)

    X_train = X[:split]
    y_train = y[:split]
    X_test = X[split:]
    y_test = y[split:]

    print(f"  Train sequences        : {len(X_train)}")
    print(f"  Test sequences         : {len(X_test)}")

    return X_train, y_train, X_test, y_test


# ==================================================
# MAIN
# ==================================================

def main():

    # --------------------------------------------------
    # STEP 1 — LOAD & CLEAN
    # --------------------------------------------------

    print("\n--- STEP 1: LOAD & CLEAN ---")
    df = pd.read_csv(INPUT_FILE)
    df = step1_clean(df)

    # --------------------------------------------------
    # STEP 2 — ENCODE
    # --------------------------------------------------

    print("\n--- STEP 2: ENCODE ---")
    df, encoders = step2_encode(df)
    df.to_csv(ENCODED_FILE, index=False)
    print(f"  Saved: {ENCODED_FILE}")

    # --------------------------------------------------
    # STEP 3 — NORMALISE
    # --------------------------------------------------

    print("\n--- STEP 3: NORMALISE ---")
    df, scaler = step3_normalise(df)
    df.to_csv(SCALED_FILE, index=False)
    print(f"  Saved: {SCALED_FILE}")

    # --------------------------------------------------
    # STEP 4 — CREATE SEQUENCES
    # --------------------------------------------------

    print("\n--- STEP 4: CREATE SEQUENCES ---")
    X_train, y_train, X_test, y_test = step4_sequences(df)

    np.save(X_TRAIN_FILE, X_train)
    np.save(Y_TRAIN_FILE, y_train)
    np.save(X_TEST_FILE, X_test)
    np.save(Y_TEST_FILE, y_test)

    print(f"  Saved: X_train.npy, y_train.npy")
    print(f"  Saved: X_test.npy,  y_test.npy")

    # --------------------------------------------------
    # SAVE ENCODERS + SCALER
    # (needed later during prediction)
    # --------------------------------------------------

    with open(SCALER_FILE, "wb") as f:
        pickle.dump(scaler, f)

    with open(ENCODERS_FILE, "wb") as f:
        pickle.dump(encoders, f)

    print(f"  Saved: scaler.pkl, encoders.pkl")

    # --------------------------------------------------
    # SUMMARY
    # --------------------------------------------------

    print("\n================================")
    print("Preprocessing complete!")
    print("================================")
    print(f"Input rows       : 48,312")
    print(f"Sequence length  : {SEQUENCE_LENGTH} days")
    print(f"Features per step: {X_train.shape[2]}")
    print(f"Train sequences  : {len(X_train)}")
    print(f"Test sequences   : {len(X_test)}")
    print(f"Output folder    : {PROCESSED_DIR}")


if __name__ == "__main__":
    main()
