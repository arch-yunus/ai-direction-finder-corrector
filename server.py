from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import os
from df_corrector import AIOptimizedDirectionFinder
from data_gen import generate_synthetic_tdoa
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Direction Finder API")

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance
MODEL_PATH = "models/tdoa_error_corrector.pth"
df_finder = AIOptimizedDirectionFinder(weights_path=MODEL_PATH if os.path.exists(MODEL_PATH) else None)

class SignalData(BaseModel):
    tdoa1: float
    tdoa2: float
    snr: float
    id: int = 0
    env: str = "Desert"

@app.post("/predict")
async def predict(signals: list[SignalData]):
    results = []
    for sig in signals:
        input_data = np.array([[sig.tdoa1, sig.tdoa2, sig.snr]])
        res = df_finder.predict_angle(input_data)
        res["id"] = sig.id
        
        # Signal Classification Logic (Heuristic for v4.0)
        if sig.snr > 30:
            res["class"] = "RADAR"
        elif sig.snr < 15:
            res["class"] = "JAMMER"
        else:
            res["class"] = "COMM"
            
        results.append(res)
    return results

@app.post("/train")
async def train(samples: int = 3000, targets: int = 3, environment: str = "Desert"):
    try:
        data = generate_synthetic_tdoa(samples, num_targets=targets, environment=environment)
        X = data[['tdoa1', 'tdoa2', 'snr']].values
        y = data['true_angle'].values
        
        mae = df_finder.train(X, y)
        
        os.makedirs("models", exist_ok=True)
        df_finder.save_model(MODEL_PATH)
        
        return {"status": "success", "mae": float(mae), "samples": samples}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
