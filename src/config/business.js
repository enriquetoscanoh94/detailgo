/**
 * Business configuration for Detail Go.
 *
 * ⚠️  EDITA ESTOS VALORES con la información real del negocio antes de publicar.
 *     Los precios de los servicios NO van aquí: se administran desde la app
 *     (panel de admin → Servicios) y se guardan en Firestore.
 */

export const BUSINESS = {
  name: 'Detail Go',
  website: 'https://carwahsdetailgo.com',
  supportPhone: '+1 (310) 776-2980',
  supportEmail: 'carwashdetailgo@gmail.com',

  // Zona de cobertura. El wizard valida que la ciudad del cliente esté aquí.
  serviceZone: {
    label: 'Los Angeles, CA',
    cities: [
      // Ciudades atendidas (en minúsculas). Ajusta según tu cobertura real.
      'los angeles',
      'huntington park',
      'south gate',
      'downey',
      'bell',
      'bell gardens',
      'maywood',
      'cudahy',
      'lynwood',
      'commerce',
      'vernon',
      'east los angeles',
      'inglewood',
      'compton',
    ],
  },

  // Datos de Zelle que se le muestran al cliente para pagar.
  zelle: {
    handle: '747 321 2609',
    accountName: 'Abraham Gutierrez Degollado',
  },

  // Datos de Venmo que se le muestran al cliente para pagar.
  venmo: {
    handle: '@Abraham-Gutierrez-101',
    accountName: 'Abraham Gutierrez',
  },

  // Horario de servicio (hora local del negocio, formato 24h).
  // El calendario genera bloques por hora dentro de esta ventana.
  hours: {
    open: 8, // 8:00 AM
    close: 18, // 6:00 PM (último bloque agendable: 17:00)
    slotMinutes: 60,
  },

  // Anticipación permitida para agendar.
  booking: {
    minLeadHours: 1, // mínimo 1 hora de anticipación
    maxLeadDays: 1, // máximo 1 día (hoy o mañana)
  },
};

export default BUSINESS;
