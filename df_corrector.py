import numpy as np
from sklearn.neural_network import MLPRegressor
import pickle
import os

class AIOptimizedDirectionFinder:
    def __init__(self, weights_path=None):
        self.model = MLPRegressor(hidden_layer_sizes=(64, 32), max_iter=1000, random_state=42)
        self.is_trained = False
        if weights_path and os.path.exists(weights_path):
            self.load_model(weights_path)

    def train(self, X, y):
        """
        X: [[tdoa1, tdoa2, snr], ...]
        y: [angle, ...]
        """
        print("Training AI model for signal correction...")
        # Simple cyclic encoding for angle to avoid 0/360 discontinuity
        y_sin = np.sin(np.radians(y))
        y_cos = np.cos(np.radians(y))
        y_target = np.column_stack((y_sin, y_cos))
        
        self.model.fit(X, y_target)
        self.is_trained = True
        print("Training complete.")

    def predict_angle(self, sensor_data):
        """
        sensor_data: np.array([[tdoa1, tdoa2, snr]])
        """
        if not self.is_trained:
            # Fallback to a simple geometric heuristic if not trained
            # This is a placeholder for the "Baseline" mentioned in README
            return {"angle": 45.0, "rms_error": 5.0, "status": "untrained_fallback"}

        pred_target = self.model.predict(sensor_data)
        sin_val, cos_val = pred_target[0]
        angle_rad = np.arctan2(sin_val, cos_val)
        angle_deg = np.degrees(angle_rad) % 360
        
        # Estimate dummy RMS based on SNR
        snr = sensor_data[0][2]
        rms_error = max(0.5, 5.0 - (snr / 10.0))
        
        return {
            "angle": angle_deg,
            "rms_error": rms_error,
            "status": "ai_corrected"
        }

    def save_model(self, path):
        with open(path, 'wb') as f:
            pickle.dump(self.model, f)

    def load_model(self, path):
        with open(path, 'rb') as f:
            self.model = pickle.load(f)
            self.is_trained = True

if __name__ == "__main__":
    # Quick test/train routine
    from data_gen import generate_synthetic_tdoa
    df = AIOptimizedDirectionFinder()
    data = generate_synthetic_tdoa(2000)
    
    X = data[['tdoa1', 'tdoa2', 'snr']].values
    y = data['true_angle'].values
    
    df.train(X, y)
    
    # Test prediction
    test_input = np.array([[10.2, -4.5, 25.0]])
    result = df.predict_angle(test_input)
    print(f"Prediction: {result}")
    
    # Save for later
    os.makedirs("models", exist_ok=True)
    df.save_model("models/tdoa_error_corrector.pth")
