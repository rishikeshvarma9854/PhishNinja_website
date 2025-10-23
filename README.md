Backend explain API
===================

This folder contains a lightweight Vercel serverless explain endpoint at `api/explain.js`.

Purpose
-------
- Provide a server-side "explain" endpoint that the extension can call when local LLM runtime is unavailable.
- Optionally load `model_quantized.onnx` for server-side ONNX inference if `onnxruntime-node` is available in the environment.

How it works
------------
- At cold start the function will attempt to require `onnxruntime-node`. If present, it will try to load a model file located at `./models/model_quantized.onnx` inside the deployment or download it from the `MODEL_URL` environment variable to `/tmp/model_quantized.onnx` and create a session. The code keeps a cached session if successful.
- If native runtime or the model are not available, the endpoint falls back to a safe heuristic explanation to ensure the extension always gets a response.

Deployment options
------------------
1) Deploy with model included (small models only)
   - Put `model_quantized.onnx` under `backend/models/model_quantized.onnx` in the repo. Be aware of deployment size limits on Vercel; large binaries may cause deployment failures.
   - Deploy to Vercel as usual. The serverless function will find the local model and attempt to create an ONNX session.

2) Host model externally (recommended for medium/large models)
   - Upload `model_quantized.onnx` to cloud object storage (S3, GCS, Cloudflare R2, etc.) and set `MODEL_URL` to a signed or public URL in Vercel Environment Variables.
   - The function will download the model to `/tmp` and try to create a session there.

Notes and caveats
-----------------
- `onnxruntime-node` depends on native binaries. Serverless platforms (including Vercel) may not support the required native modules out of the box. If `onnxruntime-node` fails to load, the endpoint will still work but will return heuristic explanations only.
- For consistent production inference, consider deploying a dedicated inference server (container or VM) that runs the model with a known runtime and exposes a stable API.

Usage from extension
--------------------
- The extension should POST JSON { url, text, score } to the deployed explain endpoint. The response will be { explanation, source } where `source` is `onnx-ready` if the backend loaded the model (server-side inference not yet wired) or `heuristic` otherwise.

Example (curl)
--------------
```bash
curl -X POST https://<your-vercel-domain>/api/explain -H "Content-Type: application/json" -d '{"url":"https://example.com","text":"<html>...</html>","score":0.87}'
```
