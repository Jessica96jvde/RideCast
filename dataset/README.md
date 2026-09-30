# 📊 RideCast Dataset & Machine Learning Pipeline

This directory contains the complete data engineering, preprocessing, and neural network training pipeline for the **RideCast** transit crowd forecasting system.

---

## 🗂️ Directory Structure

```
dataset/
├── data/                         # CSV Dimension & Time-Series Datasets
│   ├── bus_availability.csv      # Depot inventory & idle buses
│   ├── historical_ridership.csv  # 1-year transit ridership log (2024)
│   ├── holiday_master.csv        # Tamil Nadu public holidays & festivals
│   ├── route_master.csv          # Transit routes & terminal endpoints
│   ├── route_shapes.csv          # High-resolution GPS shape coordinates
│   ├── route_stops.csv           # Ordered stop sequences & cumulative ETAs
│   ├── route_timetable.csv       # Daily scheduled departure times
│   ├── segment_master.csv        # Inter-stop distances and runtimes
│   ├── stop_master.csv           # 93 bus stops with GPS coordinates
│   ├── weather_history.csv       # Meteorological data (rain, temp, humidity)
│   └── processed/                # Scaled & Encoded ML Training Data
│       ├── encoded_ridership.csv # Encoded reference dataset
│       ├── encoders.pkl          # LabelEncoders for categorical features
│       ├── scaler.pkl            # MinMaxScaler for numerical normalization
│       ├── scaled_ridership.csv  # Scaled feature matrix
│       ├── X_train.npy / y_train.npy  # 7-day sliding window training arrays
│       └── X_test.npy / y_test.npy    # Holdout validation arrays
├── model/                        # Saved Neural Network Artifacts
│   ├── ridecast_lstm.keras       # Trained Keras/TensorFlow LSTM model
│   └── training_history.npy      # Epoch loss & metric history
├── src/                          # Source Code & Pipelines
│   ├── data_generation/          # Synthetic & Real-world Data Enrichers
│   │   ├── calculate_service_frequency.py
│   │   ├── check_ridership.py
│   │   ├── create_route_stops.py
│   │   ├── create_segments.py
│   │   ├── find_shared_segments.py
│   │   ├── generate_ridership.py
│   │   ├── get_weather.py
│   │   └── update_dimension_data.py
│   ├── preprocessing/            # Feature Engineering & Normalization
│   │   └── preprocess.py
│   └── model/                    # Model Architecture & Training
│       ├── train.py
│       └── evaluate.py
└── tests/                        # Pipeline Integration Tests
    ├── check_route_gaps.py
    ├── test_backend_services.py
    └── test_osrm.py
```

---

## 🔄 End-to-End Pipeline Execution

If you ever need to re-generate or re-train the models from scratch:

### 1. Data Enrichment & Dimensions
```bash
python dataset/src/data_generation/update_dimension_data.py
```

### 2. Preprocessing & Feature Engineering
```bash
python dataset/src/preprocessing/preprocess.py
```
* Encodes categorical columns (`service_id`, `from_stop_id`, `to_stop_id`, `time_slot`, `day_of_week`).
* Normalizes weather and continuous ridership variables with `MinMaxScaler`.
* Creates 7-day sliding time-series windows (`X_train.npy`, `y_train.npy`).

### 3. LSTM Model Training
```bash
python dataset/src/model/train.py
```
* Trains a 2-layer LSTM architecture with Dropout and Dense output layers.
* Saves weights to `dataset/model/ridecast_lstm.keras`.

### 4. Evaluation & Verification
```bash
python dataset/tests/test_backend_services.py
```
