// 정적 자산 경로 helper
// ─ Vite 의 base (GitHub Pages 하위 경로 '/darakbang-saju-web/') 를 앞에 붙인다.
// ─ 빌드 밖(node 테스트 등)에서는 import.meta.env 가 없으므로 '/' 로 떨어진다.
const BASE = (import.meta.env && import.meta.env.BASE_URL) || '/';

/** '/images/a.webp' 또는 'images/a.webp' → `${base}images/a.webp` */
export const asset = (path) => `${String(BASE).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;
