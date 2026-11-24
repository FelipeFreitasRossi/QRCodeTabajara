// Informações da marca usadas na interface. Ajuste aqui, sem mexer nos componentes.
// Campos vazios ('' ou []) simplesmente não aparecem no site.

export const brand = {
  name: 'Tabajara',
  city: 'São Carlos · SP',
  /**
   * Foto de capa. A ilustrativa é baixada pelo seed do backend (uploads/site/capa.webp).
   * Para usar uma foto real, substitua esse arquivo ou aponte para outro caminho.
   * Use null para a capa só com o fundo escuro e o efeito de brasa.
   */
  heroImage: '/uploads/site/capa.webp' as string | null,

  // ----- Rodapé -----
  /** Ex.: 'Rua Exemplo, 123 · Centro' */
  address: '',
  /** Link do Google Maps do restaurante (opcional). */
  mapsUrl: '',
  /** Ex.: ['Terça a sexta · 11h às 15h e 18h às 23h', 'Sábado e domingo · 11h às 23h'] */
  hours: [] as string[],
  /** Ex.: '(16) 3333-3333' */
  phone: '',
  /** Só os números, com DDI e DDD. Ex.: '5516999999999' */
  whatsapp: '',
  /** Usuário do Instagram, sem o @. Ex.: 'tabajara' */
  instagram: 'tabajaragrill',
}
