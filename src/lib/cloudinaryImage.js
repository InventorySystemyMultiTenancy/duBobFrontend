// As fotos dos produtos ficam no Cloudinary na resolução original (~2 MB cada).
// Pedimos a versão redimensionada e no melhor formato para o aparelho
// (webp/avif): cai para ~40 KB sem diferença visível na tela.
const UPLOAD_SEGMENT = "/image/upload/";

export function cloudinaryImage(url, width = 800) {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com")) {
    return url;
  }
  const index = url.indexOf(UPLOAD_SEGMENT);
  if (index === -1) return url;

  const start = index + UPLOAD_SEGMENT.length;
  const rest = url.slice(start);
  // Já tem transformação (ex.: f_auto,...): não mexe.
  if (/^[a-z]{1,3}_[^/]*\//.test(rest) && !/^v\d+\//.test(rest)) {
    return url;
  }
  return `${url.slice(0, start)}f_auto,q_auto,c_limit,w_${width}/${rest}`;
}
