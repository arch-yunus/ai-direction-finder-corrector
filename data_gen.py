import numpy as np
import pandas as pd

def generate_synthetic_tdoa(num_samples=1000, noise_level=1.0):
    """
    Simulates TDOA data for a 3-receiver array.
    Now includes multipath interference and signal-dependent noise.
    """
    true_angles = np.random.uniform(0, 360, num_samples)
    
    # Receiver positions (equilateral triangle)
    r = 0.5 # 50cm baseline for portability
    c = 3e8
    
    # Ideal TDOA (relative to center)
    # TDOA1: S1-S2, TDOA2: S2-S3
    alpha = np.radians(true_angles)
    tdoa1 = (r * np.cos(alpha)) / c * 1e9
    tdoa2 = (r * np.cos(alpha - np.radians(120))) / c * 1e9
    
    # Multipath: Angle-dependent bias
    multipath = 1.2 * np.sin(3 * alpha) + 0.8 * np.cos(5 * alpha)
    
    # Gaussian noise scaled by noise_level
    gaussian_noise = np.random.normal(0, noise_level * 1.5, num_samples)
    
    # SNR simulation
    snr = np.random.uniform(5, 35, num_samples)
    # Lower SNR = Higher jitter
    jitter = (40 - snr) / 10.0 * np.random.normal(0, 0.5, num_samples)
    
    noisy_tdoa1 = tdoa1 + multipath + gaussian_noise + jitter
    noisy_tdoa2 = tdoa2 + multipath + gaussian_noise + jitter
    
    data = pd.DataFrame({
        'tdoa1': noisy_tdoa1,
        'tdoa2': noisy_tdoa2,
        'snr': snr,
        'true_angle': true_angles
    })
    
    return data

if __name__ == "__main__":
    data = generate_synthetic_tdoa()
    data.to_csv("synthetic_signals.csv", index=False)
    print(f"Generated {len(data)} samples to synthetic_signals.csv")
