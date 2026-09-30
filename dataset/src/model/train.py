import numpy as np
from pathlib import Path
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint


# ==================================================
# PROJECT PATHS
# ==================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

PROCESSED_DIR = PROJECT_ROOT / "dataset" / "data" / "processed"
MODEL_DIR = PROJECT_ROOT / "dataset" / "model"
MODEL_DIR.mkdir(exist_ok=True)

MODEL_FILE = MODEL_DIR / "ridecast_lstm.keras"
HISTORY_FILE = MODEL_DIR / "training_history.npy"


# ==================================================
# HYPERPARAMETERS
#
# LSTM_UNITS   : number of memory cells in each
#                LSTM layer — 64 is a good starting
#                point for this dataset size
#
# DROPOUT      : randomly turns off 20% of neurons
#                during training to prevent the model
#                from memorising the training data
#
# EPOCHS       : maximum number of training rounds
#                EarlyStopping will stop before this
#                if the model stops improving
#
# BATCH_SIZE   : number of sequences processed
#                together in one training step
#                32 is standard
#
# PATIENCE     : how many epochs to wait for
#                improvement before stopping early
# ==================================================

LSTM_UNITS  = 64
DROPOUT     = 0.2
EPOCHS      = 35
BATCH_SIZE  = 64
PATIENCE    = 6


# ==================================================
# LOAD DATA
# ==================================================

def load_data():

    X_train = np.load(PROCESSED_DIR / "X_train.npy")
    y_train = np.load(PROCESSED_DIR / "y_train.npy")
    X_test  = np.load(PROCESSED_DIR / "X_test.npy")
    y_test  = np.load(PROCESSED_DIR / "y_test.npy")

    print(f"  X_train : {X_train.shape}")
    print(f"  y_train : {y_train.shape}")
    print(f"  X_test  : {X_test.shape}")
    print(f"  y_test  : {y_test.shape}")

    return X_train, y_train, X_test, y_test


# ==================================================
# BUILD MODEL
#
# Architecture:
#
#   LSTM(64)     ← learns time patterns from
#                  7-day sequences
#   Dropout(0.2) ← prevents overfitting
#   LSTM(32)     ← refines the learned patterns
#   Dropout(0.2)
#   Dense(16)    ← combines features
#   Dense(2)     ← outputs inbound + outbound count
#
# Loss function: mean_squared_error
#   → penalises large prediction errors more
#
# Optimizer: adam
#   → standard choice, adjusts learning rate
#     automatically
#
# Metric: mae (mean absolute error)
#   → easy to interpret: average error in
#     passenger count units
# ==================================================

def build_model(input_shape):

    model = Sequential([

        LSTM(
            LSTM_UNITS,
            input_shape=input_shape,
            return_sequences=True   # pass sequence to next LSTM
        ),
        Dropout(DROPOUT),

        LSTM(
            LSTM_UNITS // 2,
            return_sequences=False  # only pass final output
        ),
        Dropout(DROPOUT),

        Dense(16, activation="relu"),

        Dense(2)                    # inbound + outbound
    ])

    model.compile(
        optimizer="adam",
        loss="mean_squared_error",
        metrics=["mae"]
    )

    return model


# ==================================================
# TRAIN
# ==================================================

def train():

    # --------------------------------------------------
    # LOAD
    # --------------------------------------------------

    print("\n--- LOADING DATA ---")
    X_train, y_train, X_test, y_test = load_data()

    # input_shape = (sequence_length, features)
    #             = (7, 16)
    input_shape = (X_train.shape[1], X_train.shape[2])

    # --------------------------------------------------
    # BUILD
    # --------------------------------------------------

    print("\n--- BUILDING MODEL ---")
    model = build_model(input_shape)
    model.summary()

    # --------------------------------------------------
    # CALLBACKS
    #
    # EarlyStopping:
    #   Monitors validation loss.
    #   If it does not improve for PATIENCE epochs,
    #   training stops automatically.
    #   restore_best_weights=True means the model
    #   reverts to its best state, not the last state.
    #
    # ModelCheckpoint:
    #   Saves the model every time validation loss
    #   improves. So even if training is interrupted,
    #   the best model is always saved.
    # --------------------------------------------------

    callbacks = [

        EarlyStopping(
            monitor="val_loss",
            patience=PATIENCE,
            restore_best_weights=True,
            verbose=1
        ),

        ModelCheckpoint(
            filepath=MODEL_FILE,
            monitor="val_loss",
            save_best_only=True,
            verbose=1
        )
    ]

    # --------------------------------------------------
    # TRAIN
    # --------------------------------------------------

    print("\n--- TRAINING ---")

    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=1
    )

    # --------------------------------------------------
    # SAVE HISTORY
    # (used later for plotting training curves)
    # --------------------------------------------------

    np.save(HISTORY_FILE, history.history)

    # --------------------------------------------------
    # SUMMARY
    # --------------------------------------------------

    best_epoch = np.argmin(history.history["val_loss"]) + 1
    best_val_loss = min(history.history["val_loss"])
    best_val_mae = history.history["val_mae"][best_epoch - 1]

    print("\n================================")
    print("Training complete!")
    print("================================")
    print(f"Best epoch       : {best_epoch}")
    print(f"Best val_loss    : {best_val_loss:.6f}")
    print(f"Best val_mae     : {best_val_mae:.6f}")
    print(f"Model saved to   : {MODEL_FILE}")


if __name__ == "__main__":
    train()
