# -*- coding: utf-8 -*-
"""사이트에 실제로 쓰인 글자만 담은 세리프 폰트 서브셋 생성.

- 원본: /usr/share/fonts/pickle-hwp/NotoSerifCJKkr-Regular.otf (OFL)
- 결과: public/fonts/DarakbangSerif.woff2
사이트 문구를 고친 뒤 다시 실행하면 새 글자가 포함된다.
"""
import glob
import os
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_GLOBS = [
    'index.html',
    'src/**/*.js',
    'src/**/*.css',
]
EXTRA = (
    '0123456789'
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'
    '·…—‘’“”「」『』〈〉《》【】'
    '°℃%×÷+−=~￦₩'
    'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'
)


def collect():
    chars = set(EXTRA)
    for pattern in SRC_GLOBS:
        pattern = pattern.replace('**', '**')
        for path in glob.glob(os.path.join(ROOT, pattern), recursive=True):
            try:
                with open(path, encoding='utf-8') as f:
                    chars.update(f.read())
            except (UnicodeDecodeError, OSError):
                continue
    # 공백류·제어문자는 제외
    return ''.join(sorted(c for c in chars if c.isprintable() and c not in '\n\t'))


def main():
    text = collect()
    out_dir = os.path.join(ROOT, 'public', 'fonts')
    os.makedirs(out_dir, exist_ok=True)
    text_file = os.path.join(out_dir, '.subset-chars.txt')
    with open(text_file, 'w', encoding='utf-8') as f:
        f.write(text)
    # Pretendard 도 같은 글자 집합으로 서브셋 (원본 변수 폰트 2MB → 약 170KB)
    pretend_src = os.path.join(os.path.dirname(__file__), 'fonts', 'PretendardVariable.woff2')
    if os.path.exists(pretend_src):
        subprocess.run([
            'pyftsubset', pretend_src,
            f'--text-file={text_file}',
            '--flavor=woff2',
            f'--output-file={os.path.join(out_dir, "PretendardSubset.woff2")}',
            '--layout-features=*',
            '--no-hinting',
        ], check=True)
        print('pretendard subset →', os.path.getsize(os.path.join(out_dir, 'PretendardSubset.woff2')), 'bytes')
    else:
        print('PretendardVariable.woff2 원본이 scripts/fonts 에 없어 Pretendard 서브셋은 건너뜁니다.')

    src = '/usr/share/fonts/pickle-hwp/NotoSerifCJKkr-Regular.otf'
    dst = os.path.join(out_dir, 'DarakhangSerif.woff2'.replace('Darakhang', 'Darakbang'))
    subprocess.run([
        'pyftsubset', src,
        f'--text-file={text_file}',
        '--flavor=woff2',
        f'--output-file={dst}',
        '--layout-features=*',
        '--no-hinting',
        '--desubroutinize',
    ], check=True)
    os.remove(text_file)
    print('chars', len(text), '→', dst, os.path.getsize(dst), 'bytes')


if __name__ == '__main__':
    main()
