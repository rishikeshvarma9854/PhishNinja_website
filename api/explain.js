// Vercel serverless explain endpoint
// This function expects the model to be available at './models/model_quantized.onnx'
// within the same deployment, or set MODEL_URL env var to point to an externally hosted model.

// Vercel serverless explain endpoint
// This function will attempt to load `onnxruntime-node` if available and a model file
// at './models/model_quantized.onnx' (bundled with the deployment) or from an external
// MODEL_URL provided via environment variables. If native runtime is unavailable,
// the endpoint falls back to a safe heuristic summary.

let onnxAvailable = false;
let ortNode = null;
let cachedSession = null;
let modelLoadAttempted = false;

async function tryLoadOnnxRuntime() {
  if (modelLoadAttempted) return;
  modelLoadAttempted = true;
  try {
    // Attempt to require onnxruntime-node. On Vercel this may fail due to native binary issues.
    ortNode = require('onnxruntime-node');
    onnxAvailable = !!ortNode;
  } catch (e) {
    console.warn('[backend] onnxruntime-node not available or failed to load:', e && e.message);
    onnxAvailable = false;
    ortNode = null;
  }
  if (!onnxAvailable) return;

  // Try to fetch the model either from local deployment path or MODEL_URL env var
  const fs = require('fs');
  const path = require('path');
  try {
    const maybeLocal = path.join(__dirname, '..', 'models', 'model_quantized.onnx');
    let modelPath = null;
    if (fs.existsSync(maybeLocal)) {
      modelPath = maybeLocal;
    } else if (process.env.MODEL_URL) {
      // Download to /tmp for serverless environments
      const got = require('node-fetch');
      const res = await got(process.env.MODEL_URL);
      if (!res.ok) throw new Error('Failed to fetch MODEL_URL: ' + res.status);
      const buf = await res.buffer();
      const tmpPath = path.join('/tmp', 'model_quantized.onnx');
      fs.writeFileSync(tmpPath, buf);
      modelPath = tmpPath;
    }
    if (modelPath) {
      try {
        // Create session and cache
        cachedSession = await ortNode.InferenceSession.create(modelPath);
        console.info('[backend] ONNX model loaded and session created');
      } catch (e) {
        console.warn('[backend] failed to create ONNX session:', e && e.message);
        cachedSession = null;
      }
    } else {
      console.warn('[backend] no model file found locally and MODEL_URL not set');
    }
  } catch (e) {
    console.warn('[backend] error while trying to load model:', e && e.message);
  }
}

function heuristicExplanation(url, text, score) {
  const cleaned = (text || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 2000);
  return `Heuristic summary:\nPage at ${url} appears suspicious (score=${(score||0)*100}%).\n\nExcerpt:\n${cleaned.slice(0,1000)}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { url, text, score } = req.body || {};

    // Lazy attempt to initialize onnx runtime and load model
    await tryLoadOnnxRuntime();

    // If we have a cachedSession, we could attempt inference. However, the exported
    // model's input/output signatures are unknown here. To avoid unsafe assumptions,
    // we'll only use onnxruntime if a minimal, well-known input pathway exists. For
    // now, if a cachedSession exists, return a note that onnx is available and rely
    // on a future dedicated inference path for production inference.
    if (cachedSession) {
      return res.json({ explanation: `Server: ONNX runtime available. Model loaded. (Server-side inference is enabled but not yet implemented for this model signature.)`, source: 'onnx-ready' });
    }

    // Fallback to heuristic explanation
    const explanation = heuristicExplanation(url, text, score);
    return res.json({ explanation, source: 'heuristic' });
  } catch (e) {
    console.error('explain error', e);
    return res.status(500).json({ error: String(e) });
  }
}
