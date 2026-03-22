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
        Trains the MLP Regressor with sin/cos encoding.
        """
        print("Training AI model for signal correction...")
        y_sin = np.sin(np.radians(y))
        y_cos = np.cos(np.radians(y))
        y_target = np.column_stack((y_sin, y_cos))
        
        self.model.fit(X, y_target)
        self.is_trained = True
        
        # Calculate MAE for reporting
        preds = self.model.predict(X)
        pred_angles = np.degrees(np.arctan2(preds[:, 0], preds[:, 1])) % 360
        mae = np.mean(np.abs(pred_angles - y))
        print(f"Training complete. Mean Absolute Error: {mae:.2f}°")
        return mae

    def predict_angle(self, sensor_data):
        """
        sensor_data: np.array([[tdoa1, tdoa2, snr]])
        """
        if not self.is_trained:
            return {"angle": 0.0, "rms_error": 10.0, "status": "untrained_fallback"}

        pred_target = self.model.predict(sensor_data)
        sin_val, cos_val = pred_target[0]
        angle_rad = np.arctan2(sin_val, cos_val)
        angle_deg = np.degrees(angle_rad) % 360
        
        # Estimate error based on SNR and model confidence (simplified)
        snr = sensor_data[0][2]
        error_est = max(0.2, 8.0 - (snr / 5.0))
        
        return {
            "angle": float(angle_deg),
            "rms_error": float(error_est),
            "status": "ai_optimized"
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
