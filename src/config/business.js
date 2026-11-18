// 사업자 정보 — PG 심사 제출용. 값이 비어 있으면 화면에 '입력 필요'로 표시된다.
// 대표자명·사업자등록번호·통신판매업신고번호·주소·고객센터는 사업자 등록 후 이 파일만 채우면 된다.

export const BUSINESS = {
  serviceName: '사주보는 3층 다락방',
  companyName: '지수언니', // 사업자등록증상 상호
  brandShort: '다락방',
  domain: 'darakbang-saju.com',
  representative: '정시연', // 대표자명
  businessNumber: '508-09-48006', // 사업자등록번호
  mailOrderNumber: '신고 진행 예정', // 통신판매업신고번호 (신고 전)
  address: '서울특별시 영등포구 당산로2길 12, 207호-152호(문래동3가, 에이스테크노타워)', // 사업장 주소
  phone: '070-8098-0587', // 고객센터 전화 (아톡 가상번호)
  email: 'sisterjisoo5@gmail.com', // 고객센터 이메일
  hours: '평일 10:00~18:00 (점심 12:30~13:30)',
  daangnProfile: 'https://www.daangn.com/kr/local-profile/cyzs8nxi47ir/',
  pgCompany: '포트원(PortOne)',
  hostProvider: 'Vercel · Cloudflare Pages',
  pendingText: '입력 필요',
};

export const BUSINESS_ROWS = [
  { label: '상호', key: 'companyName', required: true },
  { label: '서비스명', key: 'serviceName', required: false },
  { label: '대표자', key: 'representative', required: true },
  { label: '사업자등록번호', key: 'businessNumber', required: true },
  { label: '통신판매업신고번호', key: 'mailOrderNumber', required: true },
  { label: '사업장 주소', key: 'address', required: true },
  { label: '고객센터', key: 'phone', required: true },
  { label: '이메일', key: 'email', required: true },
];

/** 값이 채워지지 않은 필수 항목 목록 (개발·검수 화면에서 안내용) */
export function pendingBusinessFields() {
  return BUSINESS_ROWS.filter((r) => r.required && !String(BUSINESS[r.key] || '').trim());
}

export function businessRowText(row) {
  const v = String(BUSINESS[row.key] || '').trim();
  return v || BUSINESS.pendingText;
}
