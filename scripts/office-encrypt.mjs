#!/usr/bin/env node
/* 3층 다락방 AI 오피스 — 오피스 데이터 암호화 스크립트
 *
 * public/office/data.json (평문, 로컬 편집용·git 제외) 을 AES-256-GCM 으로 암호화해
 * public/office/data.enc.json · docs/office/data.enc.json 에 쓴다.
 * 브라우저(public/office/app.js)는 같은 방식(PBKDF2-SHA-256 25만 회 → AES-256-GCM)으로
 * 비밀번호를 입력받아 Web Crypto API(crypto.subtle) 로 복호화한다.
 *
 * 사용법
 *   OFFICE_PASSWORD=<비밀번호> node scripts/office-encrypt.mjs            # 암호화(기본)
 *   node scripts/office-encrypt.mjs --password <비밀번호> --in public/office/data.json \
 *        --out public/office/data.enc.json,docs/office/data.enc.json
 *   OFFICE_PASSWORD=<비밀번호> node scripts/office-encrypt.mjs --verify   # 복호화 검증(요약 출력)
 *   OFFICE_PASSWORD=<비밀번호> node scripts/office-encrypt.mjs --decrypt --to /tmp/data.json
 *
 * 비밀번호는 코드·저장소에 넣지 않는다(인자 또는 OFFICE_PASSWORD 환경변수로만 받는다).
 * 비밀번호를 바꾸려면 새 비밀번호로 다시 실행해 두 data.enc.json 을 덮어쓰면 되고, 코드는 고치지 않는다.
 */
import { webcrypto as crypto } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const ITERATIONS = 250000;
const DEFAULT_IN = 'public/office/data.json';
const DEFAULT_OUT = ['public/office/data.enc.json', 'docs/office/data.enc.json'];

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : '';
}

function has(name) {
  return process.argv.indexOf('--' + name) >= 0;
}

function die(msg) {
  console.error('✖ ' + msg);
  process.exit(1);
}

function b64(buf) {
  return Buffer.from(new Uint8Array(buf)).toString('base64');
}

function unb64(str) {
  return new Uint8Array(Buffer.from(String(str || ''), 'base64'));
}

function nowSeoul() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().replace(/\.\d{3}Z$/, '+09:00');
}

async function deriveKey(password, salt, iterations, usages = ['decrypt']) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  );
}

async function encrypt(password, plainObj) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS, ['encrypt', 'decrypt']);
  const plain = new TextEncoder().encode(JSON.stringify(plainObj));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return {
    v: 1,
    name: '3층 다락방 AI 오피스 데이터',
    alg: 'AES-256-GCM',
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: b64(salt) },
    iv: b64(iv),
    ct: b64(ct),
    generated: nowSeoul(),
  };
}

async function decrypt(password, env) {
  if (!env || !env.ct || !env.iv || !env.kdf || !env.kdf.salt) die('암호화 데이터 형식이 아닙니다.');
  const key = await deriveKey(password, unb64(env.kdf.salt), Number(env.kdf.iterations) || ITERATIONS);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, key, unb64(env.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

function readJson(p) {
  if (!existsSync(p)) die('파일이 없습니다: ' + p);
  return JSON.parse(readFileSync(p, 'utf8'));
}

async function main() {
  const password = arg('password') || process.env.OFFICE_PASSWORD || '';
  if (!password) die('비밀번호가 필요합니다 — --password <비밀번호> 또는 OFFICE_PASSWORD 환경변수로 넘겨 주세요.');

  const inPath = resolve(ROOT, arg('in') || DEFAULT_IN);
  const outPaths = (arg('out') || DEFAULT_OUT.join(',')).split(',').map((s) => s.trim()).filter(Boolean).map((p) => resolve(ROOT, p));

  /* ---- 복호화 전용 ---- */
  if (has('decrypt') || has('verify')) {
    const src = resolve(ROOT, arg('in') || DEFAULT_OUT[0]);
    const env = readJson(src);
    let data;
    try {
      data = await decrypt(password, env);
    } catch (e) {
      die('복호화 실패 — 비밀번호가 다르거나 파일이 손상되었습니다. (' + (e && e.message ? e.message : e) + ')');
    }
    if (has('decrypt')) {
      const to = arg('to');
      const text = JSON.stringify(data, null, 2) + '\n';
      if (to) {
        writeFileSync(resolve(ROOT, to), text, 'utf8');
        console.log('✔ 복호화 → ' + resolve(ROOT, to));
      } else {
        process.stdout.write(text);
      }
      return;
    }
    const teams = (data.departments || []).map((d) => d.icon + d.name).join(' · ');
    const settlement = (data.revenue || []).find((r) => String(r.name || r.label || '').includes('정산')) ||
      (data.departments || []).find((d) => d.id === 'settlement');
    console.log('✔ 복호화 검증 통과 (' + src.replace(ROOT + '/', '') + ')');
    console.log('  팀 ' + (data.departments || []).length + '개: ' + teams);
    console.log('  헤드라인: ' + String(data.headline || '').slice(0, 80));
    if (settlement) console.log('  정산: ' + JSON.stringify(settlement).slice(0, 200));
    return;
  }

  /* ---- 암호화 ---- */
  const data = readJson(inPath);
  const env = await encrypt(password, data);
  const text = JSON.stringify(env) + '\n';
  for (const out of outPaths) {
    writeFileSync(out, text, 'utf8');
    console.log('✔ 암호화 → ' + out.replace(ROOT + '/', '') + ' (' + statSync(out).size.toLocaleString('en-US') + ' bytes)');
  }
  console.log('  방식: PBKDF2-SHA-256 ' + ITERATIONS.toLocaleString('en-US') + '회 → AES-256-GCM · 평문 노출 없음');
}

main().catch((e) => {
  console.error('✖ ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
