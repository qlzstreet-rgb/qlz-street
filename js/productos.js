/* ==========================================================================
   QLZ STREET v2 - CATALOGO BASE
   Copia de Planilla QLZ Street -> L1_Inventarios (A6:W23) + carpeta 'catalogo en fotos'.
   Solo campos publicos (sin costos ni margenes). Se actualiza en vivo con
   cargarInventarioDesdeSheets() cuando configures CONFIG.SHEETS_WEBAPP_URL.
   ========================================================================== */

const PRODUCTOS_BASE = [
  {
    codigo: "GORRA-001",
    nombre: "Gorra 2D Flat - 2026 Daga (color NEGRO)",
    categoriaSheet: "Gorras",
    categoria: "gorras",
    detalles: "grafiti de caracteres chinos de alta calidad, sombrero unisex ajustable con visera plana y cierre a presión vintage",
    precio: 180.00,
    disponible: 2,
    estado: "Disponible",
    enlaceFoto: "https://drive.google.com/uc?export=view&id=1XffSJEnOBTzVrgbgHLocfaWNfGs-XPZv",
    fotos: [
      "https://drive.google.com/uc?export=view&id=1XffSJEnOBTzVrgbgHLocfaWNfGs-XPZv"
    ]
  },
  {
    codigo: "GORRA-002",
    nombre: "Gorra 2D Flat - 2026 Daga (color BEIGE)",
    categoriaSheet: "Gorras",
    categoria: "gorras",
    detalles: "grafiti de caracteres chinos de alta calidad, sombrero unisex ajustable con visera plana y cierre a presión vintage",
    precio: 180.00,
    disponible: 1,
    estado: "Bajo stock",
    enlaceFoto: "https://drive.google.com/uc?export=view&id=1hyNCYUmblxPhL1WNmCKl98XzkuWCRKvG",
    fotos: [
      "https://drive.google.com/uc?export=view&id=1hyNCYUmblxPhL1WNmCKl98XzkuWCRKvG",
      "https://drive.google.com/uc?export=view&id=1japC0xKsv3_jddpWRPj5XaOWc4_jZfH0"
    ]
  },
  {
    codigo: "GORRA-008",
    nombre: "2D Flat - 2026 Daga (color BLANCO y NEGRO)",
    categoriaSheet: "Gorras",
    categoria: "gorras",
    detalles: "de grafiti de caracteres chinos de alta calidad, sombrero unisex ajustable con visera plana y cierre a presión vintage",
    precio: 180.00,
    disponible: 1,
    estado: "Bajo stock",
    enlaceFoto: "https://drive.google.com/uc?export=view&id=1bHesnGJwhW_wqBxdGqz5tMxl9B_4g3AF",
    fotos: [
      "https://drive.google.com/uc?export=view&id=1bHesnGJwhW_wqBxdGqz5tMxl9B_4g3AF",
      "https://drive.google.com/uc?export=view&id=1ffHCsmnM9dJeL-wT3FxLaDLr3c0uqevw",
      "https://drive.google.com/uc?export=view&id=1KsROn6EOvf3xgYgmOU_XM3WV2ywOX9Aj",
      "https://drive.google.com/uc?export=view&id=1fY9pR4oc9yqv5ExDZ6ILYMDP7HTwXQVX"
    ]
  },
  {
    codigo: "JOY-001",
    nombre: "Collar Cruzado Hip-Hop Hombre",
    categoriaSheet: "Joyería",
    categoria: "joyeria",
    detalles: "para Hombre, Regalo para el Día del Padre, Día de San Valentín, Aniversario - El Mejor Regalo para las Fiestas, Cumpleaños, Uso Diario para Padres, Novios, Hermanos",
    precio: 40.00,
    disponible: 1,
    estado: "Bajo stock",
    enlaceFoto: "https://drive.google.com/uc?export=view&id=1ZQvsQY7lZIXoomCm9Nhtr9vk2BaKDRHZ",
    fotos: [
      "https://drive.google.com/uc?export=view&id=1ZQvsQY7lZIXoomCm9Nhtr9vk2BaKDRHZ"
    ]
  },
  {
    codigo: "GORRA-006",
    nombre: "Gorra de béisbol gótica para hombre (color NEGRO,BLANCO,ROJO)",
    categoriaSheet: "Gorras",
    categoria: "gorras",
    detalles: "con bordado de cruz de espinas de LA, gorra deportiva y de ocio ajustable, adecuada para salidas de primavera y otoño, viajes y vacaciones en la playa",
    precio: 180.00,
    disponible: 1,
    estado: "Bajo stock",
    enlaceFoto: "https://drive.google.com/uc?export=view&id=1XmFUKHslnpH9_Cq9nGCqg380vngdYnxx",
    fotos: [
      "https://drive.google.com/uc?export=view&id=1XmFUKHslnpH9_Cq9nGCqg380vngdYnxx",
      "https://drive.google.com/uc?export=view&id=163dOhsEIbwTkD1HjipFkJuS1diBYG7Ht",
      "https://drive.google.com/uc?export=view&id=1oWLyO4KQ4NnSjVmniDbL495z2I3Jp0sy"
    ]
  },
  {
    codigo: "GORRA-005",
    nombre: "Gorra de béisbol de hombre NG (color NEGRO y BLANCO)",
    categoriaSheet: "Gorras",
    categoria: "gorras",
    detalles: "con bordado de llama 3D, gorro casual ajustable de cinco paneles a la moda, adecuada para salidas de primavera/otoño, viajes y fiestas en la playa",
    precio: 180.00,
    disponible: 1,
    estado: "Bajo stock",
    enlaceFoto: "https://drive.google.com/uc?export=view&id=1R4_j9BuGVd0rn_KcXU5xK0SMAEg5nwKH",
    fotos: [
      "https://drive.google.com/uc?export=view&id=1R4_j9BuGVd0rn_KcXU5xK0SMAEg5nwKH",
      "https://drive.google.com/uc?export=view&id=1nmOEo9rPCPysQgiLTP49FSHl-dpyrJrt",
      "https://drive.google.com/uc?export=view&id=146dpABTPxxL97FiOeQLq0fyL8PqdRKYt"
    ]
  },
  {
    codigo: "ANILL-001",
    nombre: "Anillos de acero inoxidable 201 de estilo mixto de moda (por unidad)",
    categoriaSheet: "Joyería",
    categoria: "joyeria",
    detalles: "Anillo de acero inoxidable 201 estilo urbano/mixto para hombre (precio individual por pieza)",
    precio: 10.00,
    precioPorUnidad: true,
    disponible: 8,
    estado: "Disponible",
    enlaceFoto: "https://drive.google.com/uc?export=view&id=1KBgiRfXweZBqHQKmK05YFm3Mrb3MUWxZ",
    fotos: [
      "https://drive.google.com/uc?export=view&id=1KBgiRfXweZBqHQKmK05YFm3Mrb3MUWxZ",
      "https://drive.google.com/uc?export=view&id=1o8Cqa4h-hYIjzKLtvS3e8F_w7etjvgXf"
    ]
  },
  {
    codigo: "GORRA-007",
    nombre: "Gorra de béisbol casual para hombre de borde plano Lpl - Side Forever (negro con blanco/dorado)",
    categoriaSheet: "Gorras",
    categoria: "gorras",
    detalles: "con bordado de letras, nueva moda versátil",
    precio: 180.00,
    disponible: 1,
    estado: "Bajo stock",
    enlaceFoto: "https://drive.google.com/uc?export=view&id=1HImaBoHu7RAcxZ0tqKZTCrYsCqbmHHgL",
    fotos: [
      "https://drive.google.com/uc?export=view&id=1HImaBoHu7RAcxZ0tqKZTCrYsCqbmHHgL",
      "https://drive.google.com/uc?export=view&id=1jwtlexttz32IRQ_Juo91uFSaTaI-aHpr",
      "https://drive.google.com/uc?export=view&id=1yCl1gv_OFV59wBCYnlU-sFweukW-q-k1",
      "https://drive.google.com/uc?export=view&id=1WCjwRIQpULPz2oT5qWINQxWzco0h2Q__"
    ]
  },
  {
    codigo: "GORRA-003",
    nombre: "Gorra color negro y combinaciones de rojo,rosado,etc",
    categoriaSheet: "Gorras",
    categoria: "gorras",
    detalles: "gorra de béisbol hip-hop nueva, bordado exquisito, ajustable, ligera y transpirable, ideal para viajes y regalos festivos",
    precio: 180.00,
    disponible: 2,
    estado: "Disponible",
    enlaceFoto: "https://drive.google.com/uc?export=view&id=13aajcwvo1W2UFi-PrZGczISb2kcVO0gc",
    fotos: [
      "https://drive.google.com/uc?export=view&id=13aajcwvo1W2UFi-PrZGczISb2kcVO0gc",
      "https://drive.google.com/uc?export=view&id=1GsC7injsRYZxzOrTEnVPOarMXTJ_4eV2"
    ]
  },
  {
    codigo: "GORRA-009",
    nombre: "Gorro deportivo con visera para sol ( color NEGRO, ROJO, BLANCO)",
    categoriaSheet: "Gorras",
    categoria: "gorras",
    detalles: "el más elegante y moderno para hombre, 2023",
    precio: 180.00,
    disponible: 1,
    estado: "Bajo stock",
    enlaceFoto: "https://drive.google.com/uc?export=view&id=1EcYJPaUq7zkDZyKEjT-AO6whs72bGSAi",
    fotos: [
      "https://drive.google.com/uc?export=view&id=1EcYJPaUq7zkDZyKEjT-AO6whs72bGSAi"
    ]
  },
  {
    codigo: "JOY-002",
    nombre: "Set de 3 piezas Hello Kitty, elegante estilo Y2K pulsera,collar colgante",
    categoriaSheet: "Joyería",
    categoria: "joyeria",
    detalles: "pulsera elástica y collar con cuentas, colgante de corazón y caja de regalo, joyería de dibujos animados, adiciones para cumpleaños/uso diario, Halloween, San Valentín, Acción de Gracias, Navidad, regalo ideal",
    precio: 65.00,
    disponible: 2,
    estado: "Disponible",
    enlaceFoto: "https://drive.google.com/uc?export=view&id=1G1g5kddEY5h1Op8dDpjqts5FkqbgjVYZ",
    fotos: [
      "https://drive.google.com/uc?export=view&id=1G1g5kddEY5h1Op8dDpjqts5FkqbgjVYZ",
      "https://drive.google.com/uc?export=view&id=17ruAgkrpYe_kXCZU0Vff6V1cOp51oo0m"
    ]
  },
  {
    codigo: "GORRA-010",
    nombre: "Gorra de béisbol de ala plana con letras en blanco y negro, estilo hip-hop",
    categoriaSheet: "Gorras",
    categoria: "gorras",
    detalles: "perfecta para la moda urbana, apta para todos",
    precio: 180.00,
    disponible: 1,
    estado: "Bajo stock",
    enlaceFoto: "",
    fotos: []
  },
  {
    codigo: "AUDIF-001",
    nombre: "Auriculares inalámbricos Bluetooth Lenovo TA210 (Color NEON como negro)",
    categoriaSheet: "Audífonos",
    categoria: "audio",
    detalles: "Larga duración de batería, deportivos intrauditivos, ENC, cancelación de ruido inteligente para llamadas con 4 micrófonos, blanco/blanco luna, - Diseño de regalo",
    precio: 199.00,
    disponible: 2,
    estado: "Disponible",
    enlaceFoto: "",
    fotos: []
  },
  {
    codigo: "AUDIF-002",
    nombre: "Auriculares intrauditivos inalámbricos Acer ( color NEGRO)",
    categoriaSheet: "Audífonos",
    categoria: "audio",
    detalles: "Bluetooth 5.4 con cancelación de ruido ANC, batería de ultra larga duración de 20 horas, calidad de sonido Hi-Fi de alta fidelidad, puntas suaves para los oídos que no duelen y son agradables para la piel, baja latencia para deportes y juegos, compatibles",
    precio: 199.00,
    disponible: 1,
    estado: "Bajo stock",
    enlaceFoto: "",
    fotos: []
  },
  {
    codigo: "LAB-001",
    nombre: "Set de 6 brillos labiales (jelly kiss)",
    categoriaSheet: "Cosmeticos",
    categoria: "accesorios",
    detalles: "labios hidratados de larga duración, translúcidos y naturales, brillo labial de alta brillantez, apto para todo tipo de piel, empaque en caja rosa",
    precio: 80.00,
    disponible: 1,
    estado: "Bajo stock",
    enlaceFoto: "",
    fotos: []
  },
  {
    codigo: "LAB-002",
    nombre: "Set de 6 brillos labiales (crystal clear)",
    categoriaSheet: "Cosmeticos",
    categoria: "accesorios",
    detalles: "cristalinos - Aceite labial hidratante en gelatina, hidratación de larga duración para labios dobles, acabado de alto brillo, base hidratante, brillante, suave, cuidado labial anti-decoloración, apto para todo tipo de piel, compacto para viaje",
    precio: 70.00,
    disponible: 2,
    estado: "Disponible",
    enlaceFoto: "",
    fotos: []
  },
  {
    codigo: "GORRA-004",
    nombre: "Gorra de béisbol de satén (color NEGRO, BLANCO y CELESTE)",
    categoriaSheet: "Gorras",
    categoria: "gorras",
    detalles: "de satén de 5 paneles con forro de satén, ajustable, casual y de moda con bordado de llamas de alta calidad para hombre, ideal para viajes de primavera, verano, fiestas en la playa, de LOS ANGELES",
    precio: 180.00,
    disponible: 0,
    estado: "Agotado",
    enlaceFoto: "",
    fotos: []
  },
  {
    codigo: "PEST-001",
    nombre: "Set de 2 Serum para Pestañas Bioaqua - 7Ml Cada Uno",
    categoriaSheet: "Cosmeticos",
    categoria: "accesorios",
    detalles: "Fórmula de Acción Rápida para Volumen, Longitud y Curvatura | Hecho con Ingredientes Naturales Adecuado para Piel Sensible Beige Claro y Cabello Castaño Oscuro/Rubio | Serum Duradero para el Crecimiento de las Pestañas | Regalo Perfecto para el Día de San Valentín",
    precio: 60.00,
    disponible: 0,
    estado: "Agotado",
    enlaceFoto: "",
    fotos: []
  }
];
