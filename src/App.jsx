import React, { useEffect, useRef } from "react";

export default function CameraPWA() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // Posición inicial centrada
  const posRef = useRef({ x: 0.35, y: 0.4 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const codigo = "CHIH01-CMM-CHIH-001";
  const ciudad = "CHIHUAHUA";

  useEffect(() => {
    let animationId;

    const draw = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");

      // 1. Sincronizar resolución del canvas con la del video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // 2. Limpiar y dibujar el video
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 3. Dimensiones de la Pizarra
      const boxWidth = canvas.width * 0.35; // 35% del ancho de la pantalla
      const boxHeight = boxWidth * 0.45;    // Proporción fija
      const x = posRef.current.x * canvas.width;
      const y = posRef.current.y * canvas.height;

      // 4. Dibujar Rectángulo Amarillo
      ctx.save();
      ctx.fillStyle = "rgba(255, 235, 59, 1)"; // Amarillo sólido
      ctx.beginPath();
      // Usar rect para máxima compatibilidad
      ctx.rect(x, y, boxWidth, boxHeight);
      ctx.fill();

      // 5. Dibujar Texto (Ajuste dinámico para que no se salga)
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Función para ajustar el texto al ancho disponible
      const fitFont = (text, maxWidth, startSize) => {
        let size = startSize;
        ctx.font = `bold ${size}px Arial, sans-serif`;
        while (ctx.measureText(text).width > maxWidth && size > 10) {
          size--;
          ctx.font = `bold ${size}px Arial, sans-serif`;
        }
        return size;
      };

      const contentWidth = boxWidth * 0.9; // Margen interno

      // Código (Título)
      const sizeTitle = fitFont(codigo, contentWidth, boxHeight * 0.3);
      ctx.font = `bold ${sizeTitle}px Arial, sans-serif`;
      ctx.fillText(codigo, x + boxWidth / 2, y + boxHeight * 0.3);

      // Ciudad (Subtítulo)
      const sizeCity = fitFont(ciudad, contentWidth, boxHeight * 0.25);
      ctx.font = `bold ${sizeCity}px Arial, sans-serif`;
      ctx.fillText(ciudad, x + boxWidth / 2, y + boxHeight * 0.7);
      
      ctx.restore();
      animationId = requestAnimationFrame(draw);
    };

    const startCamera = async () => {
      try {
        // Pedimos una resolución alta, pero el navegador dará la mejor disponible
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "environment", 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 } 
          },
          audio: false
        });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        draw();
      } catch (err) {
        alert("No se pudo acceder a la cámara. Por favor, da permisos.");
      }
    };

    startCamera();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Lógica de arrastre corregida
  const handleStart = (e) => {
    dragging.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Guardar dónde se tocó dentro de la pizarra para un arrastre suave
    offset.current = {
      x: clientX - (posRef.current.x * rect.width + rect.left),
      y: clientY - (posRef.current.y * rect.height + rect.top)
    };
  };

  const handleMove = (e) => {
    if (!dragging.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let newX = (clientX - offset.current.x - rect.left) / rect.width;
    let newY = (clientY - offset.current.y - rect.top) / rect.height;

    // Límites para que no se salga de la pantalla (ajustable)
    newX = Math.max(0, Math.min(newX, 0.65));
    newY = Math.max(0, Math.min(newY, 0.85));

    posRef.current = { x: newX, y: newY };
  };

  // Función de captura robusta para móviles
  const capturePhoto = () => {
    const canvas = canvasRef.current;
    // Usamos toBlob que es más eficiente para imágenes grandes en móviles
    canvas.toBlob((blob) => {
      if (!blob) {
        alert("Error al generar la imagen.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Nombre de archivo con fecha para evitar duplicados
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `${codigo}_${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Liberar memoria
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }, 'image/png', 1.0); // Calidad máxima
  };

  return (
    <div style={{ 
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%", 
      backgroundColor: "black", display: "flex", flexDirection: "column" 
    }}>
      {/* Contenedor del Canvas (Toma el espacio disponible) */}
      <div style={{ 
        flex: 1, display: "flex", justifyContent: "center", alignItems: "center", 
        overflow: "hidden", position: "relative" 
      }}>
        <video ref={videoRef} playsInline muted style={{ display: "none" }} />
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          onMouseMove={handleMove}
          onTouchMove={handleMove}
          onMouseUp={() => (dragging.current = false)}
          onTouchEnd={() => (dragging.current = false)}
          style={{ 
            // ESTO ARREGLA EL ZOOM: Se ajusta al contenedor sin estirarse
            maxWidth: "100%", 
            maxHeight: "100%", 
            objectFit: "contain",
            touchAction: "none", // Evita scroll al arrastrar
            cursor: "move"
          }}
        />
      </div>

      {/* Contenedor del Botón (Altura fija en la parte inferior) */}
      <div style={{ 
        height: "100px", backgroundColor: "rgba(0,0,0,0.8)", 
        display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10
      }}>
        <button onClick={capturePhoto} style={{ 
          padding: "15px 40px", borderRadius: "30px", border: "none", 
          backgroundColor: "white", color: "black", fontSize: "18px", fontWeight: "bold",
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
        }}>
          TOMAR FOTO
        </button>
      </div>
    </div>
  );
}