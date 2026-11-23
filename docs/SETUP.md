# 세팅 순서

## 0. 준비물

- Node.js 20 이상
- git
- GitHub CLI (`gh`) 와 로그인: `gh auth login`
- Claude Code

## 1. 폴더 열기

압축을 풀고 폴더로 이동한다.

```bash
cd chameumyeon-eolma
```

## 2. git 초기화와 첫 커밋

문서와 설정만 담은 상태로 먼저 커밋한다.

```bash
git init -b main
git add .
git commit -m "chore: 프로젝트 문서와 설정 초기화"
```

## 3. GitHub 저장소 만들기

포트폴리오용이므로 공개 저장소를 권장한다. `.env`는 `.gitignore`에 들어 있어 올라가지 않는다.

```bash
gh repo create Woogie-Gim/chameumyeon-eolma --public --source=. --remote=origin --push
```

공개하기 전에 `git status`로 비밀 값이 없는지 확인한다.

## 4. Claude Code 실행

```bash
claude
```

실행 후 `docs/PROMPT_DEV.md` 맨 위의 시작 문구를 붙여넣는다. Claude Code가 `CLAUDE.md`를 자동으로 읽는다.

## 5. Phase 0 직전에 할 일

- 공공 오픈API 키가 필요하다고 Claude Code가 알려 주면 발급받아 `.env`에 넣는다. `.env.example`을 복사해서 만든다.
- `scripts/banned-terms.txt`에 금지할 상품명을 한 줄씩 직접 적는다. 이 파일은 금칙어 스캔이 읽는다.
- 수집된 수익률은 공개 자료와 몇 개 대조한다.

## 6. 커밋 규칙

- Phase가 끝날 때마다 커밋한다.
- 접두어: `feat:`, `fix:`, `test:`, `docs:`, `chore:`
- 1인 프로젝트라 `main`에 바로 작업해도 된다. 큰 변경만 브랜치를 쓴다.
- 앱인토스 심사 제출 시점에 태그를 남긴다.

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 7. CI 확인

`package.json`이 생기면 `.github/workflows/ci.yml`이 푸시마다 아래를 실행한다.

1. 금칙어 스캔
2. 단위 테스트
3. 빌드
4. Playwright E2E

처음 푸시 후 GitHub의 Actions 탭에서 초록 체크를 확인한다.

## 8. 시연 링크 배포 (선택)

지원서에 넣을 데모 링크가 필요하면 GitHub Pages나 Vercel의 정적 호스팅을 쓴다.

- GitHub Pages: `vite.config.ts`의 `base`를 `/chameumyeon-eolma/`로 설정한다.
- Vercel: 저장소를 연결하면 빌드와 배포가 자동으로 된다.

앱인토스 제출 절차는 앱인토스 콘솔의 가이드를 따른다.

## 9. 체크리스트

- [ ] 저장소 생성과 첫 푸시
- [ ] Phase 0 데이터 수집과 검증
- [ ] 금칙어 파일 작성
- [ ] 핵심 화면 완성
- [ ] 테스트와 CI 초록 체크
- [ ] 앱인토스 심사 제출 (12/1 목표)
- [ ] README 설계 근거와 가정 목록 작성
- [ ] 지원서 제출 (12/4~12/5)
