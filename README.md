# REA_Reverse_Anything

[REA (Reverse Engineer Anything)](https://github.com/morluto/rea) MCP 서버를 Claude Code에서 바로 호출할 수 있게 구성한 저장소입니다.
이 저장소에서 **새 세션**을 열면 `rea` 서버(`rea-agents` 6.4.0, 도구 170개)가 자동으로 연결됩니다.

기준 문서: [What Is REA (Reverse Engineer Anything)? - Apidog](https://apidog.com/kr/blog/what-is-rea-reverse-engineer-anything/)

## 구성

| 파일 | 역할 |
| --- | --- |
| `.mcp.json` | 프로젝트 범위 MCP 서버 등록: `npx -y rea-agents@6.4.0 mcp` (stdio) |
| `.claude/settings.json` | 최초 실행 시 `npx` 다운로드(약 15초)를 견디도록 `MCP_TIMEOUT=60000` 설정 |
| `.claude/skills/reverse-engineer-anything/` | `rea-agents@6.4.0` 패키지에 포함된 REA 워크플로 스킬 사본(MIT, `LICENSE` 동봉). `npx rea-agents setup`이 설치하는 스킬과 같습니다 |
| `scripts/verify-rea-mcp.mjs` | `.mcp.json` 설정 그대로 서버를 띄워 실제 도구 호출까지 검증합니다 |

문서가 안내하는 `npx rea-agents setup`은 사용자 범위(`~/.claude.json`)에 같은 명령(`npx -y rea-agents@<버전> mcp`)을 등록합니다. 일회성 클라우드 컨테이너에서는 세션이 끝나면 사라지므로, 같은 등록을 저장소에 커밋되는 프로젝트 범위로 만들었습니다.

업스트림은 한 프로젝트에서만 쓸 때 local 범위(`claude mcp add --scope local ...`)를 권하고, 커밋된 `.mcp.json`이 다른 곳으로 복사될 수 있으니 `--scope project`는 피하라고 합니다([설치 문서](https://github.com/morluto/rea/blob/main/docs/installation.md#limit-rea-to-one-project-or-agent-profile)). 이 저장소는 REA 사용 전용이고 local 범위는 클라우드 세션에 남지 않아서 project 범위를 의도적으로 골랐습니다. REA가 없어야 하는 프로젝트(예: 분석 결과와 분리해야 하는 클린룸 구현)에는 `.mcp.json`과 `.claude/`를 복사하지 마세요.

## 사용법

1. 이 저장소에서 새 Claude Code 세션을 시작하는 것이 확실합니다. 이미 실행 중인 세션은 설정을 다시 읽을 때만 반영됩니다. 로컬 CLI에서는 프로젝트 MCP 서버 승인 프롬프트가 한 번 나타납니다.
2. `/mcp`에서 `rea`가 연결됐는지 확인합니다. 도구는 `mcp__rea__<도구명>`으로 노출됩니다. 서버는 백그라운드에서 기동하므로 세션 시작 직후에는 `pending`일 수 있습니다(최초 실행은 `npx` 다운로드로 약 15초).
3. 에이전트에게 요청합니다.
   - `HAR 파일 /절대경로/session.har 을 REA로 분석해서 호출된 API를 정리해줘.` (`inspect_web_network_capture`)
   - `압축을 푼 Electron 앱 /절대경로/app 의 모듈 구조와 IPC 경계를 증거와 함께 설명해줘.` (`analyze_javascript_application`)
   - 문서의 예시: `Understand how search works in the Notes app, show me the evidence, and build a similar feature for my project.` (네이티브 앱은 아래 분석 엔진이 필요합니다)

## 기기별 사용법

REA는 **분석할 파일이 있는 컴퓨터**에서 실행되는 로컬(stdio) 서버입니다. HTTPS 주소가 없어서 claude.ai의 "Add custom connector"로는 등록할 수 없고, 아래처럼 Claude Code 세션이 직접 실행하게 합니다.

| 기기 | 방법 | REA가 실행되는 곳 |
| --- | --- | --- |
| iPhone | Claude 앱 **Code** 탭에서 클라우드 세션 시작 | 클라우드 컨테이너 |
| iPhone | 내 PC에서 `claude remote-control`을 실행하고 앱에서 접속 | 내 PC |
| Windows / Mac | 저장소 폴더에서 `claude` 실행 (CLI 또는 Desktop 앱 Code 탭의 Local) | 내 PC |
| Windows / Mac | Claude Desktop 채팅에 등록 (`setup --client claude_desktop`) | 내 PC |

Desktop 앱 Code 탭에서 **Cloud**를 고르면 iPhone과 같은 클라우드 세션입니다.

### iPhone: 클라우드 세션

1. Claude 앱의 **Code** 탭에서 저장소 `soonhakahn/REA_Reverse_Anything`를 고르면 기본 브랜치 `main`에서 시작합니다. 다른 브랜치에서 시작하려면 저장소 선택기 아래의 브랜치 선택기를 씁니다.
2. 요청을 입력합니다. `rea`는 처음에 `pending`이다가 약 15초 뒤 연결됩니다.
3. 분석할 파일은 컨테이너 안에 있어야 합니다. 저장소에 커밋하거나 앱에서 첨부하세요. 첨부는 세션의 `/root/.claude/uploads/<세션>/`에 저장됩니다(이미지로 확인했고, HAR 같은 다른 형식은 앱 지원 여부에 따라 다릅니다). 기본 환경(`Trusted`)은 패키지 레지스트리와 허용 도메인 밖으로의 접속을 막으므로 임의 URL 다운로드는 안 됩니다.

### iPhone: 내 PC의 세션을 원격 조종 (Remote Control)

PC에 있는 대상(설치된 네이티브 앱 등)을 분석할 때 알맞습니다. 코드 실행과 파일은 PC에 남습니다.

1. PC에서 `claude`에 claude.ai 계정으로 로그인하고, 이 저장소 폴더에서 `claude`를 한 번 실행해 `rea` 서버를 승인한 뒤 종료합니다(승인 프롬프트는 대화형 세션에서 뜹니다).
2. 같은 폴더에서 `claude remote-control`을 실행하고 스페이스바로 QR 코드를 띄워 폰으로 스캔합니다. 앱의 **Code** 탭 세션 목록에서도 찾을 수 있습니다(컴퓨터 아이콘, 초록 점).
3. 폰에서 첨부한 파일은 PC로 내려받아 `@` 파일 참조로 전달됩니다. PC가 켜져 있고 프로세스가 실행 중이어야 합니다. `ANTHROPIC_BASE_URL`이 `api.anthropic.com`이 아니면 쓸 수 없습니다.

### Windows / Mac: Claude Code

1. Node.js 22.19+(또는 24.11+, 26+)를 설치하고 저장소를 받습니다.

   ```bash
   git clone https://github.com/soonhakahn/REA_Reverse_Anything
   cd REA_Reverse_Anything
   ```

2. `claude`를 실행하고 프로젝트 MCP 서버 `rea` 승인 프롬프트에서 승인합니다. `/mcp`에서 연결을 확인합니다.
3. 네이티브 Windows에서는 업스트림이 `npx`를 `cmd.exe /d /c`로 감싸라고 안내합니다(직접 테스트하지 못했습니다). 저장소 폴더에서 다음을 실행하면 local 범위가 project 범위보다 우선해서, 커밋된 `.mcp.json`을 고치지 않고 덮어씁니다. WSL(Linux)에서는 `.mcp.json` 그대로 쓰면 됩니다.

   ```powershell
   claude mcp add --scope local rea -- cmd.exe /d /c npx -y rea-agents@6.4.0 mcp
   ```

### Windows / Mac: Claude Desktop 채팅

Desktop 앱의 채팅에서 REA를 쓰려면 사용자 범위로 등록합니다. 이 저장소의 설정과는 별개입니다.

```bash
npx rea-agents@6.4.0 setup --client claude_desktop --dry-run   # 계획 확인
npx rea-agents@6.4.0 setup --client claude_desktop             # 승인 후 적용
```

Claude Desktop은 창만 닫지 말고 완전히 종료한 뒤 실행하고, 끝나면 다시 시작합니다. Windows(MSIX 버전)에서는 Desktop 앱 안의 터미널이 아니라 일반 터미널에서 실행하세요.

## 동작 확인

```bash
node scripts/verify-rea-mcp.mjs
```

서버 기동, `tools/list`, 합성 HAR에 대한 `inspect_web_network_capture` 실제 호출, 인증 헤더 제외 확인까지 수행합니다. 모두 통과하면 `REA MCP is callable.`을 출력하고 종료 코드 0으로 끝납니다.

업스트림의 기동 점검도 쓸 수 있습니다. 도구 170/170, 프롬프트 6/6, 카탈로그 다이제스트 일치, 요청 흐름을 확인합니다.

```bash
npx -y rea-agents@6.4.0 mcp doctor --json
```

## 요구 사항

- Node.js 22.19+ / 24.11+ / 26+ (23, 25는 미지원)와 npm
- `registry.npmjs.org`에 접근할 수 있는 네트워크 (클라우드 환경이면 네트워크 액세스 설정에서 패키지 매니저를 허용)
- 정적 JavaScript/Electron, .NET, 저장된 네트워크 캡처(HAR) 분석에는 추가 엔진이 필요 없습니다. 웹사이트 분석에는 Chrome 계열 브라우저가 필요합니다.
- 네이티브 바이너리 심층 분석에는 Hopper(별도 라이선스), Ghidra 12.1(JDK 21 이상, `GHIDRA_INSTALL_DIR`), IDA 중 하나가 필요합니다.

준비 상태는 문서의 방법대로 확인할 수 있습니다.

```bash
npx -y rea-agents@6.4.0 doctor --json
```

`doctor`는 사용자 범위(`~/.claude.json`, `~/.claude/skills`)만 검사하므로 이 저장소의 프로젝트 범위 MCP 등록과 스킬은 보이지 않습니다. 등록 없음, `skill:identity`가 `missing`으로 나오는 것은 정상이며, 이 저장소의 설정은 위의 두 점검으로 확인하세요. 분석 엔진 항목은 네이티브 분석을 쓸 때만 필요합니다.

## 버전 고정과 업그레이드

`rea-agents`는 릴리스가 잦고 6.2에서 MCP 결과 형태가 바뀌었으므로(문서 기준) 6.4.0으로 고정했습니다. 올릴 때는 서버와 스킬을 같은 버전으로 맞춥니다.

```bash
V=6.5.0   # 올릴 버전
claude mcp remove rea -s project
claude mcp add --transport stdio --scope project rea -- npx -y rea-agents@$V mcp
tmp=$(mktemp -d) && npm pack rea-agents@$V --pack-destination "$tmp" --ignore-scripts >/dev/null \
  && tar -xzf "$tmp/rea-agents-$V.tgz" -C "$tmp" package/skills package/LICENSE \
  && rm -rf .claude/skills/reverse-engineer-anything \
  && cp -r "$tmp/package/skills/reverse-engineer-anything" .claude/skills/ \
  && cp "$tmp/package/LICENSE" .claude/skills/reverse-engineer-anything/LICENSE \
  && rm -rf "$tmp"
node scripts/verify-rea-mcp.mjs
```

## 주의

- 분석은 로컬에서 실행되지만 도구 결과는 사용 중인 모델 제공자에게 전달되며, 그 제공자의 데이터 정책이 적용됩니다.
- REA의 런타임 캡처 도구는 대상 프로그램을 사용자 권한으로 실행할 수 있습니다. 신뢰할 수 없는 대상은 격리된 환경에서 분석하세요.
- HAR에는 유효한 토큰이 들어 있을 수 있으므로 테스트 계정으로 만드세요. REA는 인증 헤더와 쿠키를 증거에서 제외합니다(`verify-rea-mcp.mjs`가 확인).
- 분석 대상에 대한 사용 권한 확인과 법적 책임은 사용자에게 있습니다.
- Claude Code는 보통 MCP 도구 정의를 tool search로 지연 로딩합니다. `ANTHROPIC_BASE_URL`이 서드파티 호스트를 가리키면 이것이 꺼져서 도구 스키마가 매 요청에 실립니다(업스트림 측정: 도구 172개에 약 496 KB, 약 12만 토큰). 그런 환경에서는 `ENABLE_TOOL_SEARCH=true`를 쓰거나 `.mcp.json`의 `env`에 `REA_MCP_INPUT_SCHEMA_PROFILE=compact`(약 290 KB)를 추가하세요([상세](https://github.com/morluto/rea/blob/main/docs/client-configuration.md#claude-code)).

## 업스트림 대조

`morluto/rea`의 `main`(`29d3dcb`)과 6.4.0 릴리스 커밋(`a56f7bb`)을 2026-10-14에 대조했습니다.

- **`api-surface`:** Apidog 문서가 말한 `inspect_analysis_view`의 `api-surface` 뷰는 `main`에만 있습니다. 6.4.0 릴리스(10/11) 다음 날인 10/12에 추가됐고(#1891) 6.4.0에는 없습니다. 이 릴리스에서는 `inspect_web_network_capture` 결과(레코드별 메서드, URL, 상태)를 에이전트가 정리하게 하세요. 뷰가 들어간 릴리스가 나오면 위 절차로 버전을 올린 뒤, `inspect_web_network_capture`가 돌려준 증거를 `inspect_analysis_view`에 `view: {"kind":"api-surface"}`로 넘기면 됩니다.
- **릴리스와 `main`:** `main`의 `package.json`도 6.4.0이지만 내용은 릴리스와 다릅니다. 업스트림도 새 기능은 릴리스나 소스 빌드가 있어야 쓸 수 있다고 안내합니다. 릴리스 확인은 `npm view rea-agents dist-tags.latest`입니다.
- **수동 등록:** `.mcp.json`의 명령은 업스트림 [`docs/installation.md#mcp-registry`](https://github.com/morluto/rea/blob/main/docs/installation.md#mcp-registry)의 JSON과 같고, 영구 등록은 정확한 버전 하나로 고정하라는 지침과도 맞습니다. Apidog 문서에는 이 JSON이 없습니다.
- **스킬 버전:** `main`의 스킬(v42)은 `api-surface`를 언급하지만, 이 저장소에는 서버와 짝이 맞는 6.4.0 번들 스킬(v37, 도구 170개)을 넣었습니다. `npx skills add morluto/rea`로 덮어쓰지 마세요.

## Tiger Data 예제 (MLH Global Hack Week: Builders Week)

REA 도구 실행 이벤트(합성 데이터)를 Tiger Cloud Hypertable에 저장하고 Tiger CLI/MCP로 조회하는 예제입니다.
[examples/tigerdata](examples/tigerdata/README.md) · [docs/ghw-builders-2026.md](docs/ghw-builders-2026.md)
