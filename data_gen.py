import numpy as np
import pandas as pd

def generate_synthetic_tdoa(num_samples=1000):
    """
    Simulates TDOA (Time Difference of Arrival) data for 3 receivers.
    Inputs: Ground truth angle (AoA).
    Outputs: Noisy TDOA measurements.
    """
    # Ground truth angles (0 to 360 degrees)
    true_angles = np.random.uniform(0, 360, num_samples)
    
    # Simple geometry: 3 receivers at fixed distance
    # d_ij = dist * cos(theta)
    dist = 100.0 # meters
    c = 3e8 # speed of light
    
    # Calculate perfect TDOA (in nanoseconds for scale)
    tdoa1 = (dist * np.cos(np.radians(true_angles))) / c * 1e9
    tdoa2 = (dist * np.sin(np.radians(true_angles))) / c * 1e9
    
    # Add non-linear noise (multipath + sensor noise)
    noise_multipath = 5.0 * np.sin(np.radians(true_angles * 2)) # systematic reflection error
    noise_gaussian = np.random.normal(0, 2.0, num_samples) # random noise
    
    noisy_tdoa1 = tdoa1 + noise_multipath + noise_gaussian
    noisy_tdoa2 = tdoa2 + noise_multipath + noise_gaussian
    
    data = pd.DataFrame({
        'tdoa1': noisy_tdoa1,
        'tdoa2': noisy_tdoa2,
        'snr': np.random.uniform(10, 40, num_samples),
        'true_angle': true_angles
    })
    
    return data

if __name__ == "__main__":
    data = generate_synthetic_tdoa()
    data.to_csv("synthetic_signals.csv", index=False)
    print(f"Generated {len(data)} samples to synthetic_signals.csv")
