import numpy as np
import pandas as pd

def generate_synthetic_tdoa(num_samples=1000, noise_level=1.0, num_targets=1):
    """
    Simulates TDOA data for multiple signal sources.
    """
    all_data = []
    
    for t in range(num_targets):
        # Each target has a slightly different base angle and movement profile
        base_angle = np.random.uniform(0, 360)
        true_angles = (base_angle + np.linspace(0, 5, num_samples)) % 360
        
        r = 0.5
        c = 3e8
        alpha = np.radians(true_angles)
        tdoa1 = (r * np.cos(alpha)) / c * 1e9
        tdoa2 = (r * np.cos(alpha - np.radians(120))) / c * 1e9
        
        # Enhanced Multipath: Multiple harmonics
        multipath = 1.2 * np.sin(3 * alpha) + 0.8 * np.cos(5 * alpha) + 0.5 * np.sin(10 * alpha)
        
        # Signal Interference (if multiple targets)
        interference = 0.5 * (num_targets - 1) * np.random.normal(0, 1, num_samples)
        
        gaussian_noise = np.random.normal(0, noise_level * 1.5, num_samples)
        snr = np.random.uniform(5, 35, num_samples)
        jitter = (40 - snr) / 10.0 * np.random.normal(0, 0.5, num_samples)
        
        noisy_tdoa1 = tdoa1 + multipath + gaussian_noise + jitter + interference
        noisy_tdoa2 = tdoa2 + multipath + gaussian_noise + jitter + interference
        
        target_df = pd.DataFrame({
            'target_id': t,
            'tdoa1': noisy_tdoa1,
            'tdoa2': noisy_tdoa2,
            'snr': snr,
            'true_angle': true_angles
        })
        all_data.append(target_df)
    
    return pd.concat(all_data).reset_index(drop=True)

if __name__ == "__main__":
    data = generate_synthetic_tdoa()
    data.to_csv("synthetic_signals.csv", index=False)
    print(f"Generated {len(data)} samples to synthetic_signals.csv")
