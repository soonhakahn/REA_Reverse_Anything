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

문서가 안내하는 `npx rea-agents setup`은 사용자 범위(`~/.claude.json`)에 등록합니다. 일회성 클라우드 컨테이너에서는 세션이 끝나면 사라지므로, 같은 구성을 저장소에 커밋되는 프로젝트 범위 설정으로 만들었습니다.

## 사용법

1. 이 저장소에서 새 Claude Code 세션을 시작합니다. 이미 실행 중인 세션에는 MCP 서버가 추가되지 않습니다. 로컬 CLI에서는 프로젝트 MCP 서버 승인 프롬프트가 한 번 나타납니다.
2. `/mcp`에서 `rea`가 연결됐는지 확인합니다. 도구는 `mcp__rea__<도구명>`으로 노출됩니다.
3. 에이전트에게 요청합니다.
   - `HAR 파일 /절대경로/session.har 을 REA로 분석해서 호출된 API를 정리해줘.` (`inspect_web_network_capture`)
   - `압축을 푼 Electron 앱 /절대경로/app 의 모듈 구조와 IPC 경계를 증거와 함께 설명해줘.` (`analyze_javascript_application`)
   - 문서의 예시: `Understand how search works in the Notes app, show me the evidence, and build a similar feature for my project.` (네이티브 앱은 아래 분석 엔진이 필요합니다)

## 동작 확인

```bash
node scripts/verify-rea-mcp.mjs
```

서버 기동, `tools/list`, 합성 HAR에 대한 `inspect_web_network_capture` 실제 호출, 인증 헤더 제외 확인까지 수행합니다. 모두 통과하면 `REA MCP is callable.`을 출력하고 종료 코드 0으로 끝납니다.

## 요구 사항

- Node.js 22.19+ / 24.11+ / 26+ (23, 25는 미지원)와 npm
- `registry.npmjs.org`에 접근할 수 있는 네트워크 (클라우드 환경이면 네트워크 액세스 설정에서 패키지 매니저를 허용)
- 정적 JavaScript/Electron, .NET, 저장된 네트워크 캡처(HAR) 분석에는 추가 엔진이 필요 없습니다. 웹사이트 분석에는 Chrome 계열 브라우저가 필요합니다.
- 네이티브 바이너리 심층 분석에는 Hopper(별도 라이선스), Ghidra 12.1(JDK 21 이상, `GHIDRA_INSTALL_DIR`), IDA 중 하나가 필요합니다.

준비 상태는 문서의 방법대로 확인할 수 있습니다.

```bash
npx -y rea-agents@6.4.0 doctor --json
```

`doctor`는 사용자 범위(`~/.claude/skills`)의 스킬만 검사하므로, 이 저장소처럼 스킬을 프로젝트 범위에 두면 `skill:identity`가 `missing`으로 나옵니다. 정상입니다. 분석 엔진 항목은 네이티브 분석을 쓸 때만 필요합니다.

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

## 문서와 다른 점

- 문서는 HAR 흐름에서 `inspect_analysis_view`의 `api-surface` 뷰를 언급하지만, 6.4.0에는 없습니다(도구 스키마와 패키지 전체 검색으로 확인). 이 릴리스에서는 `inspect_web_network_capture` 결과(레코드별 메서드, URL, 상태)를 에이전트가 정리하게 하세요.
- 문서는 수동 MCP 등록 JSON을 싣지 않고 `docs/installation.md`를 가리킵니다. 이 저장소의 `.mcp.json`은 `claude mcp add`가 생성한 형식이고, 등록 명령 `npx -y rea-agents@<version> mcp`는 `rea-agents` 패키지 코드에 수동 등록용으로 명시된 명령입니다.
