import numpy as np
import pickle
from pathlib import Path
from tensorflow.keras.models import load_model


PROJECT_ROOT  = Path(__file__).resolve().parents[3]
PROCESSED_DIR = PROJECT_ROOT / "dataset" / "data" / "processed"
MODEL_FILE    = PROJECT_ROOT / "dataset" / "model" / "ridecast_lstm.keras"
SCALER_FILE   = PROCESSED_DIR / "scaler.pkl"


def inverse_transform_targets(scaler, scaled_values):
    """
    scaler was fit on all 16 columns.
    y has only 2 columns (inbound, outbound) — columns 14 and 15.
    We reconstruct a dummy 16-column array, inverse-transform,
    then extract the 2 target columns.
    """
    dummy = np.zeros((len(scaled_values), 16))
    dummy[:, 12:14] = scaled_values
    unscaled = scaler.inverse_transform(dummy)
    return unscaled[:, 12:14]


def evaluate():

    print("\n--- LOADING ---")
    model  = load_model(MODEL_FILE)
    X_test = np.load(PROCESSED_DIR / "X_test.npy")
    y_test = np.load(PROCESSED_DIR / "y_test.npy")

    with open(SCALER_FILE, "rb") as f:
        scaler = pickle.load(f)

    print("\n--- PREDICTING ---")
    y_pred_scaled = model.predict(X_test, verbose=0)

    print("\n--- UNSCALING ---")
    y_pred = inverse_transform_targets(scaler, y_pred_scaled)
    y_true = inverse_transform_targets(scaler, y_test)

    mae  = np.mean(np.abs(y_pred - y_true), axis=0)
    rmse = np.sqrt(np.mean((y_pred - y_true) ** 2, axis=0))

    print("\n================================")
    print("Evaluation Results (passengers)")
    print("================================")
    print(f"{'Metric':<8}  {'Inbound':>10}  {'Outbound':>10}")
    print(f"{'-'*32}")
    print(f"{'MAE':<8}  {mae[0]:>10.2f}  {mae[1]:>10.2f}")
    print(f"{'RMSE':<8}  {rmse[0]:>10.2f}  {rmse[1]:>10.2f}")
    print(f"\nOverall MAE  : {np.mean(mae):.2f} passengers")
    print(f"Overall RMSE : {np.mean(rmse):.2f} passengers")


if __name__ == "__main__":
    evaluate()
