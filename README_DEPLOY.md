
# 🌍 Despliegue Web de Visualización Epidémica (Python + D3.js)

Este paquete divide tu sistema en:

- `backend/` → API Flask que sirve predicciones del modelo
- `frontend/` → Interfaz HTML con D3.js para mostrar resultados

## ✅ PASOS

### 1. Sube el backend (Flask + modelo entrenado)
- Plataforma recomendada: https://render.com
- Crea un nuevo servicio web -> carga el contenido de `backend/`
- Asegúrate de incluir:
  - `modelo_epidemia_scaled.pt`
  - `deepgravity_epidemic.py`, `data_loader_scaled.py`

### 2. Sube el frontend (HTML + JS) a Vercel
- Sube `frontend/` como un proyecto estático
- Modifica `index.html` y reemplaza:
  `"https://TU_BACKEND_URL/predict"` por la URL real de tu API (por ejemplo, en Render)

### 3. Abre el navegador y prueba tu simulación

🎉 ¡Listo! Ahora puedes visualizar predicciones de tu modelo directamente desde la web.
