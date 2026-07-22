/**
 * Área de servicio de Detail Go (Santa Clarita + Valle de San Fernando +
 * Verdugos + Westside + Central LA). El wizard de reserva valida que el
 * código postal del cliente esté aquí antes de permitir agendar.
 */

export const SERVICE_AREA_ZIPS = new Set([
  // Santa Clarita (Valencia / Saugus / Newhall / Canyon Country)
  '91321', '91350', '91351', '91354', '91355', '91387', '91390',
  // Valle de San Fernando
  '91352', // Sun Valley
  '91316', '91436', // Encino
  '91302', // Calabasas
  '91335', // Reseda
  '91303', '91304', // Canoga Park
  '91311', // Chatsworth
  '91326', // Porter Ranch
  '91344', // Granada Hills
  '91342', // Sylmar
  '91331', // Pacoima
  '91340', // San Fernando
  '91402', // Panorama City
  '91401', '91405', '91406', '91411', // Van Nuys
  '91601', '91605', '91606', // North Hollywood
  '91607', // Valley Village
  '91403', '91423', // Sherman Oaks
  '91356', // Tarzana
  '91604', // Studio City
  // Verdugos / Foothills
  '91501', '91502', '91504', '91505', '91506', // Burbank
  '91201', '91202', '91203', '91204', '91205', '91206', '91207', '91208', // Glendale
  '91101', '91103', '91104', '91105', '91106', '91107', // Pasadena
  '91042', // Tujunga
  '91214', // La Crescenta
  '91020', // Montrose
  '91011', // La Cañada Flintridge
  // Central / Este LA
  '90027', // Los Feliz
  '90026', // Echo Park
  '90042', // Highland Park
  '90028', '90038', '90068', // Hollywood
  '90012', '90013', '90014', '90015', '90017', '90021', // Central / Downtown LA
  // Westside
  '90210', '90211', '90212', // Beverly Hills
  '90401', '90402', '90403', '90404', '90405', // Santa Monica
  '90230', '90232', // Culver City
  '90046', '90048', '90069', // West Hollywood
  '90024', '90095', // Westwood
  // Ventura County
  '93063', '93065', // Simi Valley
]);

/** Deja solo los 5 dígitos del ZIP (soporta formato ZIP+4). */
export const cleanZip = (zip) => String(zip ?? '').trim().slice(0, 5);

/** ¿El código postal está dentro del área de servicio? */
export const isZipCovered = (zip) => SERVICE_AREA_ZIPS.has(cleanZip(zip));

/** ¿El texto es un ZIP válido de 5 dígitos? */
export const isValidZip = (zip) => /^\d{5}$/.test(cleanZip(zip));
