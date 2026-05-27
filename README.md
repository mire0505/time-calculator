# 시간 계산

`DDMMYY HHMM` 형식으로 시작 시간과 종료 시간을 입력하면 두 시간 차이를 계산하는 모바일 친화 웹앱입니다.

## 입력 예시

- 한 줄 입력: `230526 1743 / 260526 1035`
- 시작/종료 별도 입력: `230526 1743`, `260526 1035`
- 공백 없이 입력: `2305261743`

## 날짜 형식

앱에서 아래 형식을 선택할 수 있습니다.

- `DDMMYY HHMM`
- `YYMMDD HHMM`
- `YYYYMMDD HHMM`

## Vercel 배포

이 프로젝트는 빌드 과정이 필요 없는 정적 사이트입니다.

1. GitHub에 새 저장소를 만들고 `index.html`, `styles.css`, `script.js`, `.gitignore`, `README.md`를 올립니다.
2. Vercel에서 `Add New Project`를 누릅니다.
3. GitHub 저장소를 Import 합니다.
4. Framework Preset은 `Other`로 두고 배포합니다.

배포가 끝나면 Vercel에서 제공하는 URL을 PC가 꺼져 있어도 휴대폰에서 열 수 있습니다.
