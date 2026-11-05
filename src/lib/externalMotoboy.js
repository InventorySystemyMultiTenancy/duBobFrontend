// "Motoboy de fora": entregador que não é da loja (mesmo valor do backend).
// Não tem mapa nem código de entrega; o pedido finaliza assim que sai.
export const EXTERNAL_MOTOBOY_ID = "EXTERNO";

export const isExternalMotoboy = (motoboyId) => motoboyId === EXTERNAL_MOTOBOY_ID;
