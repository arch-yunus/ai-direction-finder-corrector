import numpy as np
import pandas as pd

def generate_synthetic_tdoa(num_samples=1000, noise_level=1.0, num_targets=1, environment="Desert"):
    """
    Simulates TDOA data with environmental mission profiles.
    Profiles: Desert (Low multi, Low noise), Urban (High multi), Marine (High Rayleigh).
    """
    all_data = []
    
    # Environment-specific parameters
    env_params = {
        "Desert": {"noise_mult": 1.0, "multi_mult": 0.5},
        "Urban": {"noise_mult": 2.0, "multi_mult": 3.0},
        "Marine": {"noise_mult": 1.5, "multi_mult": 1.0}
    }
    params = env_params.get(environment, env_params["Desert"])
    
    for t in range(num_targets):
        base_angle = np.random.uniform(0, 360)
        true_angles = (base_angle + np.linspace(0, 5, num_samples)) % 360
        
        r = 0.5
        c = 3e8
        alpha = np.radians(true_angles)
        tdoa1 = (r * np.cos(alpha)) / c * 1e9
        tdoa2 = (r * np.cos(alpha - np.radians(120))) / c * 1e9
        
        # Scenario-based Multipath
        multi_factor = params["multi_mult"]
        multipath = multi_factor * (1.2 * np.sin(3 * alpha) + 0.8 * np.cos(5 * alpha))
        
        noise_factor = params["noise_mult"]
        gaussian_noise = np.random.normal(0, noise_level * 1.5 * noise_factor, num_samples)
        snr = np.random.uniform(5, 35, num_samples)
        
        noisy_tdoa1 = tdoa1 + multipath + gaussian_noise
        noisy_tdoa2 = tdoa2 + multipath + gaussian_noise
        
        target_df = pd.DataFrame({
            'target_id': t,
            'tdoa1': noisy_tdoa1,
            'tdoa2': noisy_tdoa2,
            'snr': snr,
            'true_angle': true_angles,
            'environment': environment
        })
        all_data.append(target_df)
    
    return pd.concat(all_data).reset_index(drop=True)

if __name__ == "__main__":
    data = generate_synthetic_tdoa()
    data.to_csv("synthetic_signals.csv", index=False)
    print(f"Generated {len(data)} samples to synthetic_signals.csv")
