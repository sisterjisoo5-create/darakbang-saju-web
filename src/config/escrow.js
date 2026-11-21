// KB에스크로 이체 인증마크 — KB국민은행 구매안전서비스 판매자 확인 팝업
//
// 2026-11-21 시연 님이 전달한 KB에스크로 인증마크 원문을 사이트 푸터에 그대로 살린다.
// KB 팝업(quics)이 판매자 등록정보(업체명·쇼핑몰명·홈페이지)를 조회해 보여 주므로
// page · cc · mHValue 세 값은 KB가 준 원문 그대로 두고 임의로 바꾸지 않는다.
// mHValue 는 2026-11-21 기업용 KB에스크로 인증마크 값으로 교체했다
// (개인용 'edffe2ac…15a' → 기업용 '8eff6d6f…2df'). page · cc 는 그대로다.
//
//   · 인증마크 그림은 HTTPS 페이지의 혼합(Mixed Content) 차단을 피하려고 같은 도메인
//     (images/kb-escrow-mark.gif)에서 서빙하고, KB 원본 주소를 대체 경로로 둔다.
//   · 클릭하면 KB가 안내한 팝업 규격(창 이름 KB_AUTHMARK, 648×604) 그대로 새 창을 연다.
import { asset } from './asset.js';

const PAGE = 'C021590';
const CC = 'b034066:b035526';
const M_H_VALUE = '8eff6d6ff790a64c9136b4bd926df2df';

export const KB_ESCROW = {
  page: PAGE,
  cc: CC,
  mHValue: M_H_VALUE,
  /* form GET 제출과 같은 쿼리스트링이 되는 주소 */
  url: `https://okbfex.kbstar.com/quics?page=${PAGE}&cc=${encodeURIComponent(CC)}&mHValue=${M_H_VALUE}`,
  popupName: 'KB_AUTHMARK',
  popupFeatures: 'height=604,width=648,status=yes,toolbar=no,menubar=no,location=no',
  image: asset('images/kb-escrow-mark.gif'),
  imageFallback: 'https://img1.kbstar.com/img/escrow/escrowcmark.gif',
  imageAlt: 'KB에스크로 이체 인증마크',
  title: 'KB에스크로 이체',
  caption: '등록 판매자',
  description:
    'KB국민은행 구매안전서비스(KB에스크로 이체)에 등록된 판매자임을 확인하는 인증마크입니다. 마크를 누르면 판매자 확인정보가 새 창으로 열립니다.',
};
