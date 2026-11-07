# Claude Code ekosistemi — Brewmaster geliştirme akışı için tarama (2026-11-07)

Kapsam: Claude Code (CC) cloud oturumları, GitHub entegrasyonu, hooks + izin kuralları, skills/plugin, MCP sunucuları, subagent/teams/statusline/usage/headless/scheduled, 4,9 MB tek-HTML düzenleme. Remote Control, Playwright MCP, Firebase MCP, Cloudflare MCP, Ollama, OpenHands, Langflow önceden değerlendirildi; burada yeniden ele alınmadı. Önceki araştırmacının bulguları (digest) yeniden kullanıldı; eksikler yeni okumalarla dolduruldu. Hiçbir şey kurulmadı/çalıştırılmadı; yerel repo yalnız salt-okunur incelendi (held-out dosyalarının İÇERİĞİ açılmadı, yalnız dosya adları listelendi).

Kaynak notu: "Yerel gözlem" etiketli maddeler bu cloud oturumundaki klonda (github.com/dessn7-bit/brewmaster, commit 3ddafdb, 2026-11-07 19:37 +0300) benim çalıştırdığım salt-okunur komutlardan gelir; komut adı yanında yazılı.

## 0. Repo bugün gerçekte nasıl? (diğer tüm kararları etkileyen yerel gerçekler)

### Takeaway
Görev metnindeki birkaç varsayım repo ile uyuşmuyor: held-out dosyaları git'te İZLENİYOR ve repo PUBLIC (yani zaten herkese açık); regresyon paketi Playwright değil Puppeteer kullanıyor ve tarayıcı case'leri git'e girmeyen kişisel bir yedek fixture olmadan hiç koşmuyor; HTML artık 4,94 MB / 43.104 satır.

### Cited Findings
- Yerel gözlem (`git ls-files | grep -i heldout`): `tests/cev_seti_heldout.json` ve en az 9 adet `tests/fixtures/*TAM_heldout_iceriyor*.json` dosyası git tarafından izleniyor (`.gitignore` 145. satırda `tests/fixtures/` olsa da bu dosyalar izleniyor) — [repo](https://github.com/dessn7-bit/brewmaster)
- Yerel gözlem (`gh api repos/dessn7-bit/brewmaster`): `"private":false,"visibility":"public","has_pages":true`, repo boyutu 290.299 KB (~283 MB) — [repo](https://github.com/dessn7-bit/brewmaster)
- Yerel gözlem (`package.json`): `"test": "node tests/regresyon.mjs"`, devDependency yalnız `"puppeteer": "^24.43.0"`; `tests/regresyon.mjs` `import puppeteer from 'puppeteer'` yapıyor; `--parca=i/n` dilimleme seçeneği var ("bellek baskısında paket gruplara bölünüp SIRAYLA koşulur"); dosyada 3.769 `__REG.ok` iddiası var — [repo](https://github.com/dessn7-bit/brewmaster)
- Yerel gözlem (`tests/regresyon.mjs` 13–16, 62–66, 16471–16476. satırlar): tarayıcı case'leri gerçek kişisel yedek `tests/fixtures/brewmaster_yedek_2026-06-26.json` ister ("git'e GİRMEZ — kişisel veri + sync anahtarı"); bulunamazsa `FIXTURE YOK` yazıp çıkış kodu 2 ile durur; ikinci aday yol `C:/Users/Kaan/OneDrive/Masaüstü/...` — [repo](https://github.com/dessn7-bit/brewmaster)
- Yerel gözlem (python ile bayt sayımı): `Brewmaster_v2_79_10.html` = 4.942.504 bayt, 43.104 satır, bu klonda yalnız LF (CRLF 0), 13 `<script>` ve 2 `<style>` bloğu. CLAUDE.md "~3,7 MB, ~36.850 satır", `brewmaster-dev` skill'i "~25.9k satir, ~3.5MB" diyor → ikisi de eskimiş — [repo](https://github.com/dessn7-bit/brewmaster)
- Yerel gözlem: repoda `.claude/settings.json` YOK (izin/hook kuralı tanımlı değil), `.github/workflows/` YOK; `.claude/skills/brewmaster-dev/SKILL.md` var — [repo](https://github.com/dessn7-bit/brewmaster)
- Yerel gözlem (`nproc`, `free -g`): bu cloud oturumunun VM'i 2 vCPU, ~7 GB toplam RAM gösteriyor; belgede yazan tavan 4 vCPU / 16 GB / 30 GB — [cloud-environments](https://code.claude.com/docs/en/cloud-environments) (belge "approximate resource ceilings that may change over time" diyor; gözlem ile belge ÇELİŞİYOR)

### Inferences
- "CC held-out dosyasını açmasın" kuralının teknik olarak zorlanması, dosya public GitHub'da durduğu sürece kısmi kalır: CC (veya herhangi bir model/kişi) dosyayı github.com/raw üzerinden, `git show` ile ya da bir klondan okuyabilir. Daha büyük risk: uygulamanın CEV "araştırma modu" web'de arama yapıyorsa, soru metniyle bu public repo'yu bulup beklenen cevapları görebilir → değerlendirme geçerliliği riski (doğrulanmadı; koşu kayıtlarındaki kaynak URL'lerinde `dessn7-bit` / `github.com` geçip geçmediğine bakılmalı).
- Puppeteer, Playwright'tan farklı olarak Chrome for Testing'i `storage.googleapis.com` üzerinden indirir (aşağıda kaynaklı); bu cloud ağ izin listesinde olduğu için cloud'da kurulum kolaylaşır.
- Kişisel fixture olmadan ne cloud'da ne GitHub Actions'ta tam paket koşmaz; her "testi laptoptan taşı" planının ön koşulu anonim/sentetik bir fixture üretmektir.

### Gaps
- Uygulamanın gerçek koşuda held-out setini nereden yüklediği (dosyadan mı, Pages URL'sinden mi) incelenmedi; dosyaların taşınması bu yolu bozabilir.
- 546 case / 6 dilimin her birinin süresi ve tepe RAM kullanımı ölçülmedi (paket bu ortamda koşturulmadı: fixture yok, kurulum yasak).

## 1. Cloud oturumları / arka plan görevleri: ağır testler laptop yerine cloud'da koşabilir mi? Sınırlar ve Max fiyatı

### Takeaway
Teknik olarak evet ama sınırlı: cloud VM ayrıca ücretlendirilmiyor (Max kotasından düşüyor), Node 20–22 ve Docker hazır, Puppeteer'ın Chrome indirme sunucusu "Trusted" ağda açık; fakat komut süreleri (ön planda en çok 10 dk, arka planda varsayılan 30 dk / en çok 2 saat), VM kaynakları (belgede ≤16 GB, bu oturumda gözlenen 7 GB) ve eksik kişisel fixture yüzünden "tam paketi cloud'da koş" bugün hazır değil — DENE (M).

### Cited Findings
- Cloud oturumları Pro, Max, Team ve premium Enterprise koltuklarında var; laptop kapansa da çalışmaya devam eder; "It counts toward your plan's usage limits ... and there's no separate charge for the cloud VM" — [claude-code-on-the-web](https://code.claude.com/docs/en/claude-code-on-the-web)
- Başlatma yüzeyleri: claude.ai/code, mobil Code sekmesi, Desktop, terminalde `claude --cloud`; `--teleport` ile oturum taşıma — [claude-code-on-the-web](https://code.claude.com/docs/en/claude-code-on-the-web)
- Her oturum Ubuntu 24.04 x86_64 taze VM; kaynak tavanı "4 vCPUs, 16 GB of RAM, 30 GB of disk"; "The VM may stop tasks that need significantly more memory, such as large build jobs or memory-intensive tests"; bunun ötesi için Remote Control veya self-hosted ortam öneriliyor — [cloud-environments](https://code.claude.com/docs/en/cloud-environments)
- Süre sınırları: ön plan komutu varsayılan 2 dk, en çok 10 dk; zaman aşımında arka plana alınır ve 30 dk daha koşabilir; `BASH_DEFAULT_TIMEOUT_MS` / `BASH_MAX_TIMEOUT_MS` ortam değişkenleriyle uzatılır; boşta kalan VM birkaç dakika sonra duraklar, sonra geri alınabilir (reclaim) — [cloud-environments](https://code.claude.com/docs/en/cloud-environments)
- Arka plan komutları: Claude'un arka planda başlattığı komut 30 dk (veya verilen timeout, en çok 2 saat); `BASH_MAX_TIMEOUT_MS` 7.200.000 üstüne çıkarılarak 2 saat tavanı yükseltilebilir — [tools-reference](https://code.claude.com/docs/en/tools-reference)
- Hazır araçlar: Node.js 20, 21, 22 (npm, yarn, pnpm, bun, eslint, prettier, chromedriver), Python 3, Docker, PostgreSQL 16, Redis 7, git, gh, jq, ripgrep — [cloud-environments](https://code.claude.com/docs/en/cloud-environments)
- Setup script root olarak çalışır (`apt install` olur), ~5 dakikayı geçmezse dosya sistemi anlık görüntüsü önbelleğe alınır; önbellek ~7 günde bir yeniden kurulur; çıkış kodu 0 olmalı — [cloud-environments](https://code.claude.com/docs/en/cloud-environments)
- Ağ seviyeleri None / Trusted / Full / Custom; Trusted listesinde `registry.npmjs.org`, `github.com`, `raw.githubusercontent.com`, `*.googleapis.com`, `storage.googleapis.com`, `mcr.microsoft.com` vb. var; Custom ile kendi alan adlarını eklersin — [cloud-environments](https://code.claude.com/docs/en/cloud-environments)
- Chrome for Testing indirme öneki `https://storage.googleapis.com/chrome-for-testing-public/` (sayfa güncel Stable: 157.0.8103.38, 2026-11-07) — [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/); Puppeteer "By default ... downloads and uses a specific version of Chrome", önbellek `~/.cache/puppeteer` — [pptr.dev configuration](https://pptr.dev/guides/configuration) (sayfa indirme sunucusunu adıyla söylemiyor)
- GitHub işlemleri bir proxy üzerinden; GraphQL (`gh pr`, `gh issue`) reddedilir, REST (`gh api`) çalışır; dal silme ve etiket push'u reddedilir — [cloud-environments](https://code.claude.com/docs/en/cloud-environments)
- Cloud oturumları `defaultMode` olarak `bypassPermissions` veya `dontAsk` değerlerini yok sayar — [permission-modes](https://code.claude.com/docs/en/permission-modes)
- Ortam değişkeni olarak girilen token "is an ordinary environment variable, so anyone who uses the environment can read it" — [cloud-environments](https://code.claude.com/docs/en/cloud-environments)

### Inferences
- Puppeteer'ın Chrome indirmesi Trusted ağda büyük olasılıkla çalışır (indirme sunucusu `storage.googleapis.com` listede); Chrome'un Linux sistem kütüphaneleri setup script'te `apt` ile kurulmalı. Bu, bu oturumda denenmedi (kurulum yasaktı).
- Tam paketi cloud'da koşmanın engelleri: (1) kişisel fixture cloud'a konmamalı (repo public, ortam değişkenleri ortamı kullanan herkese açık) → sentetik fixture şart; (2) her dilim için arka plan komutu en çok 2 saat (değişkenle artırılabilir); (3) bellek tavanı laptopunkinden yüksek olabilir ama bu oturumda gözlenen 7 GB, laptopun 3–6 GB boş RAM'inden yalnız biraz iyi.
- Cloud'daki doğrulama oturumu (Kaan'ın akışında zaten var) sentetik Playwright testleri koşuyor; yani "küçük, hedefli tarayıcı testi cloud'da" çalışan bir desen. "546 case'in tamamı" için GitHub Actions daha uygun (bkz. bölüm 2): token harcamaz, 16 GB, ücretsiz.
- Belgedeki öneri (bellek aşımında Remote Control = kendi donanımın) Brewmaster'a uymaz, çünkü darboğaz zaten kendi laptopu.

### Gaps
- Max planında bir cloud oturumunun 5 saatlik/7 günlük kotadan ne kadar yediği sayısal olarak belgede yok.
- Self-hosted ortamların bireysel Max hesabında kullanılabilir olup olmadığı doğrulanmadı.
- Playwright'ın tarayıcı indirme sunucularının Trusted listede olup olmadığı doğrulanmadı (Puppeteer kullanıldığı için önemi düşük).

## 2. GitHub entegrasyonu: claude-code-action, regresyonun GitHub Actions'ta ücretsiz koşması, sharding, PR inceleme

### Takeaway
En büyük ve en ucuz kazanç Claude'suz, düz bir GitHub Actions iş akışı: public repoda standart runner "free and unlimited", Ubuntu runner 4 CPU / 16 GB; mevcut `--parca=i/6` ile 6 paralel iş koşulabilir — AL (M), ama önce sentetik fixture ve log gizliliği çözülmeli. claude-code-action (@claude) mevcut cloud + Remote Control akışıyla örtüşüyor ve public repoda saldırı yüzeyi ekliyor — İZLE. Yönetilen Code Review yalnız Team/Enterprise — ALMA.

### Cited Findings
- Standart GitHub-hosted runner: public repoda Ubuntu/Windows 4 CPU / 16 GB RAM / 14 GB SSD (private'ta 2/8/14); "Use of the standard GitHub-hosted runners is free and unlimited on public repositories" — [GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- Sınırlar: iş başına 6 saat, iş akışı 35 gün, Free planda 20 eşzamanlı iş, matris en çok 256 iş, artifact depolama Free 500 MB, cache 10 GB/repo — [Actions limits](https://docs.github.com/en/actions/reference/limits)
- Playwright sharding: `--shard=x/y`, GitHub Actions `strategy.matrix`, blob rapor + `merge-reports` — [Playwright sharding](https://playwright.dev/docs/test-sharding); CI'da `workers: 1` öneriliyor ("to prioritize stability and reproducibility"), tarayıcı ikili dosyalarını önbelleklemek önerilmiyor, `globalTimeout` her zaman ayarlanmalı — [Playwright CI](https://playwright.dev/docs/ci) (Brewmaster Puppeteer kullandığı için desen olarak geçerli, komutlar değil)
- Secrets fork PR'larına geçmez; 48 KB üstü sırlar için gpg ile şifreli dosya + parola secret'ı öneriliyor ve "When using this workaround, GitHub does not redact secrets that are printed in logs" — [Using secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- Pages iki yayın kaynağı: dal veya GitHub Actions iş akışı (`actions/upload-pages-artifact` + `actions/deploy-pages`); deploy adımı PR tetiklemesinde atlanır; `github-pages` ortamına yalnız varsayılan dalın deploy edebileceği koruma kuralı öneriliyor — [Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- Pages sınırları: site ≤ 1 GB, deploy 10 dk'da zaman aşımı, yumuşak 100 GB/ay bant, yumuşak 10 build/saat — "does not apply when you build and publish with a custom GitHub Actions workflow" — [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- claude-code-action v1: `/install-github-app` ile kurulum (repo admin hakkı + `gh` CLI gerekli); kimlik doğrulama `ANTHROPIC_API_KEY` veya `CLAUDE_CODE_OAUTH_TOKEN` ("available on Pro, Max, Team, and Enterprise plans", `claude setup-token` ile üretilir); "If you authenticate with an OAuth token, runs use your Claude subscription instead of API billing"; ayrıca runner dakikası tüketir — [github-actions](https://code.claude.com/docs/en/github-actions)
- Etkileşimli mod (@claude yorumları) ve otomasyon modu (`prompt` girdisi, cron dahil); public repoda zamanlanmış iş akışı 60 gün etkinlik yoksa GitHub tarafından kapatılır; `--max-turns`, `--allowedTools`, `settings` girdileri — [github-actions](https://code.claude.com/docs/en/github-actions)
- Claude GitHub App'in izin kümesi geniş (Actions, Workflows, Repository hooks, Contents, PR, Issues… okuma-yazma) ve alt küme kabul edilemiyor; daha dar izin için özel GitHub App kurulabilir — [github-actions](https://code.claude.com/docs/en/github-actions)
- Güvenlik: tetikleyen kişinin yazma hakkı kontrol edilir; botlar varsayılan engelli; `allowed_non_write_users` "significant security risk"; gizli markdown/HTML yorumlarıyla prompt injection uyarısı (eylem HTML yorumlarını, görünmez karakterleri vb. temizliyor ama "new bypass techniques may emerge"); `show_full_output` varsayılan kapalı çünkü "These logs are publicly visible in GitHub Actions for public repositories!" — [claude-code-action security](https://github.com/anthropics/claude-code-action/blob/main/docs/security.md)
- Yönetilen Code Review: "Plans: Team and Enterprise"; ama `/code-review` komutu "in your Claude Code session on any plan" çalışır — [code-review](https://code.claude.com/docs/en/code-review)
- Secret scanning: 2026-10-13'ten beri `anthropic_service_api_key` ve `anthropic_user_api_key` varsayılan push protection'da; secret scanning açık repolarda, "including free public repositories", bu anahtarları içeren commit'ler otomatik engelleniyor — [GitHub changelog](https://github.blog/changelog/2026-10-13-secret-scanning-blocks-anthropic-keys-by-default-adds-salesforce); public repolara push protection 2024-02-29'dan beri varsayılan açık, hesap düzeyinde kapatılabiliyor — [GitHub blog 2024](https://github.blog/2024-02-29-keeping-secrets-out-of-public-repositories/)

### Inferences
- Önerilen iş akışı (Claude içermez, token harcamaz): `on: push` → `npm ci` → 6'lı matris `node tests/regresyon.mjs --parca=${{matrix.i}}/6` → özet. Laptopta RAM baskısı tamamen kalkar; CC yalnız "Actions yeşil mi" bakar. Efor M (sentetik fixture + iş akışı dosyası + Chrome bağımlılıkları).
- Blokajlar: (1) kişisel fixture CI'a konmamalı — public repoda Actions logları herkese açık ve gpg geçici çözümünde log maskelemesi yok → anonim/sentetik fixture üretilmeli; (2) test çıktıları held-out içeriği yazıyorsa loglar zaten public olan veriyi bir kez daha yayar (küçük ek risk).
- Pages'i "dal" yerine "Actions iş akışı" ile yayınlamak teknik bir kapı kurar: test → `sw.js` CACHE_VERSION kontrolü → anahtar regex taraması → deploy → canlı URL'den indirip md5 = commit'teki dosya. Bu, bugün cloud oturumunun elle yaptığı canlı md5 kontrolünü otomatikleştirir. Efor M; risk: Kaan'ın "doğrudan production push" akışı bir adım daha yavaşlar (deploy ≤10 dk sınırı var).
- Brewmaster akışı PR kullanmıyor (skill: "Dogrudan production: commit + push origin main"); PR tabanlı inceleme araçlarının (claude-code-action review, Code Review) çoğu bu akışa oturmaz.
- GitHub push protection zaten Anthropic anahtarlarını bloklar; yerel `sk-ant-` taramasının yerini tutmaz (kişisel veri, sahte test anahtarları, Firebase vb. kapsamaz) ama ikinci savunma hattıdır — repo ayarında secret scanning'in açık olduğu doğrulanmalı (S).

### Gaps
- Repo'nun Pages yayın kaynağı (dal mı Actions mı) proxy kısıtı yüzünden okunamadı (`gh api .../pages` 403).
- Reponun Settings > Code security'de secret scanning'in fiilen açık olup olmadığı doğrulanmadı.
- Paketin GitHub runner'da toplam süresi bilinmiyor.

## 3. Hooks ve izin kuralları: rutin işleri otomatikleştirme ve held-out kuralını teknik olarak zorlama

### Takeaway
`Read(...)` deny kuralları CC'nin dosya araçlarını ve `cat/head/tail/sed/tee` gibi tanınan komutları engeller ama `grep -r pattern .`, Python/Node betikleri ve (çıkarım) `git show` gibi yolları KAPATMAZ; işletim sistemi düzeyindeki sandbox ise yerel Windows'ta yok (yalnız WSL2). Bu yüzden: deny kuralları + PreToolUse hook = AL (S), ama gerçek çözüm held-out dosyalarını CC'nin çalışma ağacından (ve public repodan) çıkarmak — AL (M). Rutin kontroller için PostToolUse/Stop hook'ları = AL (M).

### Cited Findings
- İzin kuralları `permissions.allow/ask/deny` dizilerinde; deny her zaman kazanır, allow deny'dan istisna açamaz; kurallar "enforced by Claude Code, not by the model" — [permissions](https://code.claude.com/docs/en/permissions)
- Yol sözdizimi gitignore tarzı: `//path` mutlak, `~/path` ev dizini, `/path` ayar kaynağına göre (proje ayarında `<primary working directory>/path`), `path`/`./path` geçerli dizine göre; deny kuralında `Read(secrets/**)` her derinlikteki `secrets` dizinini eşler; Windows'ta yollar POSIX'e çevrilir (`C:\Users\alice` → `/c/Users/alice`) — [permissions](https://code.claude.com/docs/en/permissions)
- Kapsam (birebir): "Read and Edit deny rules apply to Claude's built-in file tools, to file commands Claude Code recognizes in Bash, such as `cat`, `head`, `tail`, `sed`, and `tee`, and to the targets of Bash redirections ... They don't apply to a command that reads files without naming them, such as `grep -r pattern .` run from the directory that holds the file, or to arbitrary subprocesses that read or write files indirectly, like a Python or Node script that opens files itself. For OS-level enforcement ... enable the sandbox." — [permissions](https://code.claude.com/docs/en/permissions)
- `Read` deny, Grep/Glob için "best-effort", ayrıca aynı yolda Edit/Write'ı da engeller; `.claudeignore` dosyasının etkisi yok; `Read` deny symlink hedefine de uygulanır — [permissions](https://code.claude.com/docs/en/permissions)
- Salt-okunur komut seti (`ls`, `cat`, `head`, `tail`, `grep`, `find`, `wc`, `diff`, "read-only forms of `git`" …) her modda izinsiz çalışır; bunun için prompt istenirse `ask`/`deny` kuralı eklenmeli — [permissions](https://code.claude.com/docs/en/permissions)
- Bash argüman desenleri "fragile"; bir deny kuralı programı tam yol ile veya `sh -c` içinde çağrıldığında eşlemez — [permissions](https://code.claude.com/docs/en/permissions)
- Sandbox: "runs on macOS, Linux, and WSL2. On native Windows, Claude Code runs commands unsandboxed"; varsayılan kapalı; `sandbox.filesystem.denyRead/allowRead/denyWrite`; Read/Edit/WebFetch gibi yerleşik araçlar sandbox dışında, onları izin kuralları yönetir; bağımlılık yoksa varsayılan olarak sandboxsız çalışır (`failIfUnavailable: true` ile çıkış); `dangerouslyDisableSandbox` kaçış kapısı `allowUnsandboxedCommands: false` ile kapatılır — [sandboxing](https://code.claude.com/docs/en/sandboxing)
- PreToolUse hook: "fire before any permission-mode check ... A hook that returns `permissionDecision: "deny"` blocks the tool even in `bypassPermissions` mode"; exit 2 = engelle, stderr Claude'a geri bildirim — [hooks-guide](https://code.claude.com/docs/en/hooks-guide)
- Hook olayları (seçme): `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `Stop`, `SubagentStop`, `SessionStart`, `PreCompact`, `FileChanged`, `ConfigChange` …; tipler `command`, `http`, `mcp_tool`, `prompt`, `agent` (agent deneysel); `if` alanı "best-effort, so use the permission system for hard enforcement"; `CLAUDE_PROJECT_DIR` değişkeni — [hooks](https://code.claude.com/docs/en/hooks)
- PostToolUse'da exit 2 aracı geri almaz ama stderr Claude'a gösterilir; `continueOnBlock: true` ile sebep Claude'a dönüp tur devam eder — [hooks](https://code.claude.com/docs/en/hooks), [hooks-guide](https://code.claude.com/docs/en/hooks-guide)
- Stop hook `decision: "block"` ile Claude'u çalışmaya devam ettirir; 8 ardışık engelden sonra Claude Code hook'u geçersiz kılar; `stop_hook_active` kontrolü önerilir — [hooks-guide](https://code.claude.com/docs/en/hooks-guide)
- `Edit|Write` matcher'ı Bash ile yapılan değişiklikleri görmez; her dosya değişikliğini görmek için `Stop` hook'unda çalışma ağacını taramak veya `Bash|PowerShell` + `git status --porcelain` önerilir — [hooks-guide](https://code.claude.com/docs/en/hooks-guide)
- Windows: shell-form hook "Git Bash on Windows, or PowerShell when Git Bash isn't installed" ile çalışır; `"args": []` ile kabuksuz exec formu — [hooks-guide](https://code.claude.com/docs/en/hooks-guide)
- `.claude/settings.json` proje ayarı commit edilebilir/paylaşılabilir; `.claude/settings.local.json` gitignore'lanır — [hooks-guide](https://code.claude.com/docs/en/hooks-guide), [hooks](https://code.claude.com/docs/en/hooks)
- Hook kararları deny kurallarını aşamaz; ama bir "mod" (eklenti mod'u), makinede managed settings ya da Team/Enterprise girişi yoksa "can approve a call that a deny rule refuses or a PreToolUse hook blocked" — [permissions](https://code.claude.com/docs/en/permissions)
- Managed settings'teki izin kuralını hiçbir seviye (CLI dahil) aşamaz — [permissions](https://code.claude.com/docs/en/permissions)
- `claude -p` (bare olmadan) projenin `.claude/settings.json` hook'larını ve `.mcp.json` sunucularını güven diyaloğu olmadan çalıştırır — [headless](https://code.claude.com/docs/en/headless)

### Inferences
- Önerilen `.claude/settings.json` (proje, commit'li) deny çekirdeği — sözdizimi yukarıdaki tabloya göre, test edilmedi:
  `"deny": ["Read(/tests/cev_seti_heldout.json)", "Read(/tests/fixtures/*TAM_heldout_iceriyor*)", "Edit(/tests/cev_seti_heldout.json)", "Edit(/tests/fixtures/*TAM_heldout_iceriyor*)"]`. Bu, Read/Edit/Write/Grep ve `cat/head/sed` yollarını kapatır.
- Kapanmayan yollar: `grep -r ... tests/`, `node -e "fs.readFileSync(...)"`, (çıkarım, test edilmedi) `git show HEAD:tests/cev_seti_heldout.json` ve `git cat-file` (git salt-okunur set içinde; belge git'i "tanınan dosya komutları" arasında saymıyor), WebFetch ile `raw.githubusercontent.com`. Sandbox `denyRead` bile `.git/objects` içindeki blob'u engellemez (çıkarım) ve zaten yerel Windows'ta yok.
- Bu açıkları daraltmak için PreToolUse hook (matcher `Read|Edit|Write|Grep|Glob|Bash|PowerShell|WebFetch`): `tool_input` JSON'unda `heldout`, `TAM_heldout_iceriyor`, `dessn7-bit/brewmaster/.*tests` geçiyorsa veya `grep -r`/`rg` hedefi `tests` ise exit 2. Betik Node ile yazılırsa Git Bash/PowerShell farkından etkilenmez. Kalan açık: dosyayı adını yazmadan açan dolaylı betikler — bunu hiçbir kural %100 kapatamaz.
- En sağlam çözüm (AL, M): held-out dosyalarını public repodan çıkarıp yalnız cloud doğrulama oturumunun eklediği ayrı PRIVATE repoya taşımak (cloud oturumları Claude GitHub App kurulu private repolara erişebiliyor — [claude-code-on-the-web](https://code.claude.com/docs/en/claude-code-on-the-web)). Laptoptaki CC o repoyu hiç klonlamaz → "açma" fiziksel olarak imkânsızlaşır. Geçmişten silmek için git geçmişini yeniden yazmak gerekir; dosyalar zaten public olduğundan geçmiş temizliği "sızıntıyı geri almaz", yalnız ileriyi korur. Uygulamanın held-out yükleme yolu önce kontrol edilmeli.
- Mod kurulmamalı: Max (bireysel) hesapta managed settings yoksa bir mod deny kurallarını aşabiliyor.
- Rutin işler için hook seti (AL, M; hepsi Node betiği, `.claude/hooks/`):
  1. PostToolUse `Edit|Write` (HTML/sw.js): her inline `<script>` bloğu + sw.js için `node --check`; hata stderr ile Claude'a.
  2. Stop: HTML `git diff` ile değiştiyse ama `sw.js` CACHE_VERSION değişmediyse, `sk-ant-[A-Za-z0-9_-]{20,}` eşleşmesi varsa (test sahteleri hariç), CLAUDE.md > 150.000 karakterse, yasak yollar stage'lendiyse → `decision: block` + sebep; `stop_hook_active` kontrolüyle döngü önlenir.
  3. SessionStart: "Bu oturumda held-out dosyaları yasak; SW bump zorunlu" bağlamını `additionalContext` ile ekler.
  Bash ile yapılan node-regex düzenlemeleri `Edit|Write` matcher'ına düşmediği için Stop hook'u asıl güvencedir.
- Yerel git `pre-commit` hook'u (aynı kontroller) CC dışı commit'leri de yakalar; ama `--no-verify` ile atlanabileceği ve `.git/hooks` klonla taşınmadığı bilinen git davranışıdır (kaynak sayfa bu oturumda açılamadı — bkz. Gaps). Asıl kapı GitHub Actions (bölüm 2) olmalı.

### Gaps
- `git show HEAD:<yol>` / `git cat-file -p` komutlarının Read deny tarafından yakalanıp yakalanmadığı belgede yok ve test edilmedi.
- Windows'ta managed settings dosyasının yolu ve yönetici hakkı gereksinimi doğrulanmadı (managed-settings sayfası okunmadı).
- git-scm.com/docs/githooks sayfası izin isteği zaman aşımına uğradı (URL engellendi: https://git-scm.com/docs/githooks); pre-commit/`--no-verify` ayrıntısı oradan doğrulanamadı.

## 4. Skills ve plugin pazarları: resmi depo, topluluk koleksiyonları, proje skill'ini paylaşma

### Takeaway
Mevcut proje skill'i (`.claude/skills/brewmaster-dev`) doğru yer ve git ile zaten paylaşılıyor; yapılacak iş onu güncellemek ve `paths`/`disable-model-invocation` gibi alanlarla sıkılaştırmak — AL (S). Resmi anthropics/skills ve eklenti pazarları bu proje için az değer katıyor; topluluk listeleri incelenmeden kod çalıştıran eklenti getirir — ALMA.

### Cited Findings
- Skill konumları: kişisel `~/.claude/skills/<ad>/SKILL.md`, proje `.claude/skills/<ad>/SKILL.md` ("commit it to share with the team"), eklenti; Agent Skills açık standardı — [skills](https://code.claude.com/docs/en/skills)
- Frontmatter: `description` (+`when_to_use`) listede 1.536 karakterde kesilir; `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `hooks`, `paths` (glob ile otomatik yüklemeyi sınırlar), `shell: powershell`; SKILL.md 500 satırın altında tutulmalı; `` !`komut` `` ile dinamik bağlam; değişiklikler oturum içinde canlı yüklenir — [skills](https://code.claude.com/docs/en/skills)
- Yerleşik skill'ler: `/doctor`, `/code-review`, `/batch`, `/debug`, `/loop`, `/claude-api` — [skills](https://code.claude.com/docs/en/skills)
- anthropics/skills: `/plugin marketplace add anthropics/skills` → `document-skills@anthropic-agent-skills`, `example-skills@anthropic-agent-skills`; çoğu Apache-2.0, belge skill'leri "source-available, not open source"; "provided for demonstration and educational purposes only"; ~187,5k yıldız — [anthropics/skills](https://github.com/anthropics/skills)
- Anthropic pazarları: resmi `claude-plugins-official` (ilk oturumda otomatik eklenir; Anthropic'in kendi `commit-commands`, `code-review`, `feature-dev`, LSP eklentileri + ortak/üçüncü taraf eklentiler), topluluk `claude-community`, demo `claude-code-plugins` — [anthropic-marketplaces](https://code.claude.com/docs/en/plugins/anthropic-marketplaces)
- Eklenti güvenliği: "A Claude Code plugin you install can execute arbitrary code on your machine with your user privileges"; hook'lar ve MCP sunucuları sandbox dışında koşar; otomatik güncelleme incelenen dosyaları değiştirebilir; topluluk kataloğu çoğu girdiyi commit SHA'ya sabitler; kurulum uyarısı "Anthropic does not control what MCP servers, files, or other software are included in plugins" — [plugin security](https://code.claude.com/docs/en/plugins/security)
- `security-guidance` eklentisi ayrı bir model incelemesini hook ile oturuma geri besleyen resmi bir örnek olarak anılıyor — [hooks-guide](https://code.claude.com/docs/en/hooks-guide)
- awesome-claude-code: GitHub sayfasında 56,8k yıldız, "(no affiliation)", vetting/inceleme süreci tarif edilmiyor — [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code); ecosyste.ms kaydı 1.156 yıldız ve son push 2025-06-25 gösteriyor (eski senkron) — [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fhesreallyhim%2Fawesome-claude-code) → iki kaynak çelişiyor, GitHub sayfası daha güncel.

### Inferences
- `brewmaster-dev` skill'i güncellenmeli: satır/MB sayıları (25,9k / 3,5 MB → 43.104 / 4,94 MB), "CRLF working-tree" notu (Windows'a özgü; bu klonda LF) ve test komutunun `--parca=i/6` kullanımı. `paths: ["Brewmaster_v2_79_10.html","sw.js"]` eklemek skill'in yalnız ilgili işte yüklenmesini sağlar.
- Ayrı, `disable-model-invocation: true` bir `/deploy` skill'i (commit → push → canlı md5 → SW sürümü raporu) Kaan'ın "sadece ne istediğini söyle" akışına uyar ve deploy'un yalnız açık istekle olmasını garantiler. Skill'e `hooks` alanı ile deploy'a özgü Stop kontrolü bağlanabilir.
- `example-skills` içindeki web test skill'leri (üçüncü taraf kayıtlar `webapp-testing`'in bu depoda olduğunu söylüyor; resmi sayfa adıyla doğrulamadı) projenin kendi 3.769 iddialı koşucusunun gerisinde kalır → ALMA.
- `commit-commands`, `feature-dev`: Kaan kod yazmadığı ve akış tek dosya + doğrudan main olduğu için katkı düşük → ALMA. `security-guidance`: her araç çağrısına ek model incelemesi = ek token; yalnız ihtiyaç görülürse → İZLE.

### Gaps
- `security-guidance` eklentisinin token maliyeti ve tam davranışı okunmadı.
- `example-skills` paketinin güncel içerik listesi resmi sayfadan doğrulanamadı.

## 5. MCP sunucuları: hangileri bakımlı, güvenli ve bu akışa yararlı?

### Takeaway
Yalnız Chrome DevTools MCP somut yeni yetenek getiriyor (Lighthouse a11y/SEO denetimi, çevrimdışı/ağ kısıtlama emülasyonu, heap snapshot) — DENE (S). GitHub MCP yalnız CI eklenirse anlamlı — İZLE. Context7, filesystem/memory referans sunucuları, Sentry, üçüncü taraf Lighthouse/axe sunucuları — ALMA. MCP Registry bir güvenlik onayı değil, yalnız metadata kataloğu.

### Cited Findings
- Chrome DevTools MCP (Google/ChromeDevTools, Apache-2.0, ~54,7k yıldız): araçlar arasında `lighthouse_audit` (erişilebilirlik, SEO, best practices; "excludes performance"), `performance_start_trace`, `emulate` (`cpuThrottlingRate`, `networkConditions`: Offline/Slow 3G/…), `take_heapsnapshot` (çoğu bellek aracı `--memoryDebugging=true` ister); service worker / localStorage / IndexedDB inceleme aracı YOK — [tool-reference](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md)
- Kurulum: `/plugin marketplace add ChromeDevTools/chrome-devtools-mcp` + `/plugin install chrome-devtools-mcp@chrome-devtools-plugins` veya `npx -y chrome-devtools-mcp@latest`; Node LTS + Chrome gerekir; `--headless`, `--isolated`, `--slim`; kullanım istatistiği varsayılan açık (`--no-usage-statistics`), performans araçları trace URL'lerini CrUX API'ye gönderebilir (`--no-performance-crux`); "exposes content of the browser instance" uyarısı — [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- GitHub MCP (resmi, MIT, ~34k yıldız): uzak URL `https://api.githubcopilot.com/mcp/`, OAuth veya PAT, `--toolsets` (actions, pull_requests, code_security, secret_protection…), `--read-only` — [github-mcp-server](https://github.com/github/github-mcp-server)
- Cloud oturumlarında GitHub araçları kurulumsuz hazır (proxy üzerinden) — [cloud-environments](https://code.claude.com/docs/en/cloud-environments)
- Context7 (Upstash, MIT, ~63,9k yıldız): sürüme özgü kütüphane dokümanı; uzak `https://mcp.context7.com/mcp`, API anahtarı "Recommended"; arka uç kapalı kaynak; içerik topluluk katkılı ve doğruluk/güvenlik garantisi yok — [context7](https://github.com/upstash/context7)
- ast-grep MCP (ast-grep org): "An experimental Model Context Protocol (MCP) server", `uv` + ast-grep CLI gerekir, 455 yıldız, MIT — [ast-grep-mcp](https://github.com/ast-grep/ast-grep-mcp); üçüncü taraf tree-grep-mcp "early development" — [tree-grep-mcp](https://github.com/justar96/tree-grep-mcp)
- Referans sunucular (Everything, Fetch, Filesystem, Git, Memory, Sequential Thinking, Time) "educational examples ... not as production-ready solutions"; Sentry, GitHub, Puppeteer vb. arşivlenmiş — [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- Resmi MCP Registry "a metadata catalog, not a package registry"; sunucular arasında sıralama/seçim yapmak kapsam dışı; Registry API v1 GA durumu "Ideating" — [Registry charter](https://modelcontextprotocol.io/community/working-groups/registry)
- MCP sunucuları ve hook'lar sandbox dışında kullanıcı yetkisiyle çalışır — [plugin security](https://code.claude.com/docs/en/plugins/security), [sandboxing](https://code.claude.com/docs/en/sandboxing)

### Inferences
- Chrome DevTools MCP'nin Brewmaster'a özgü yararı: PWA'nın çevrimdışı davranışını `networkConditions: Offline` ile denemek, 4,9 MB'lık sayfada bellek sızıntısı aramak, Lighthouse a11y raporu. Laptop RAM'i kısıtlı olduğu için cloud doğrulama oturumunda (Chrome for Testing `storage.googleapis.com`'dan iner) kullanmak daha mantıklı. Önceden değerlendirilen Playwright MCP ile kısmen örtüşür; fark Lighthouse + heap + trace.
- Context7'nin değeri düşük: Brewmaster harici framework kullanmıyor (vanilla JS tek dosya; tek devDependency Puppeteer).
- Filesystem/ripgrep/memory MCP'leri CC'nin yerleşik Read/Edit/Grep (ripgrep tabanlı — [tools-reference](https://code.claude.com/docs/en/tools-reference)), CLAUDE.md ve otomatik belleği ile örtüşür; referans sunucular zaten üretim için önerilmiyor.
- ast-grep'in HTML içine gömülü JS'yi ayrıştırıp ayrıştırmadığı doğrulanmadı; doğrulanırsa "id-anchored regex" yerine yapısal arama/değiştirme getirebilir → İZLE.
- Sentry: Brewmaster'da Sentry yok (yerel repo incelemesinde iz yok) → ALMA. Cloudflare (Worker `_cf_worker/` var) daha önce değerlendirildi; kapsam dışı.

### Gaps
- Üçüncü taraf Lighthouse/axe MCP'lerinin (ör. duds/accessibility-mcp) bakım durumu incelenmedi; Chrome DevTools MCP aynı işi resmi kaynaktan yaptığı için gerek görülmedi.
- GitHub MCP'nin "lockdown mode"u belgede görülmedi.

## 6. Subagent'lar, agent teams, statusline, kullanım takibi, izin modları, checkpoint, worktree, headless, zamanlanmış görevler

### Takeaway
Somut kazanç: kör etiketleme ve doğrulama için `.claude/agents/` altında tanımlı, araçları kısıtlı subagent'lar — AL (S); kota görünürlüğü için statusline — DENE (S). Agent teams deneysel — ALMA; ccusage yerleşik `/usage` ile örtüşüyor — ALMA; headless `--bare` API anahtarı istiyor — İZLE; cloud zamanlanmış görevler research preview ve push tetikleyicisi yok — İZLE.

### Cited Findings
- Subagent dosyaları `.claude/agents/*.md` (commit'lenir) veya `~/.claude/agents/`; alanlar: `tools`, `disallowedTools`, `model`, `permissionMode`, `isolation: worktree`, `memory`, `hooks`, `skills`, `mcpServers`, `maxTurns`, `background`, `effort`, `omitClaudeMd`; "Each subagent starts with a fresh, isolated context window. It doesn't see your conversation history"; Bash deny kuralları subagent'lara da uygulanır; özel subagent'lar "independent permissions" ile çalışır — [sub-agents](https://code.claude.com/docs/en/sub-agents)
- Subagent'lar ana konuşmayla aynı kullanım limitine sayılır — [sub-agents](https://code.claude.com/docs/en/sub-agents); "Running several sessions or subagents at once multiplies token usage" — [agents](https://code.claude.com/docs/en/agents)
- Agent teams "Experimental and disabled by default"; agent view "Research preview"; Projects "Public beta on Pro and Max"; dynamic workflows çok sayıda subagent'ı betikle yönetip sonuçları çapraz kontrol eder; `/batch` 5–30 worktree-izole subagent'a böler — [agents](https://code.claude.com/docs/en/agents)
- Checkpoint: yalnız CC'nin dosya düzenleme araçlarını izler; "Checkpointing does not track files modified by Bash commands"; son 100 checkpoint, ~30 gün saklama; `/rewind` veya iki kez Esc — [checkpointing](https://code.claude.com/docs/en/checkpointing)
- İzin modları: `default`, `acceptEdits`, `plan`, `auto` (sınıflandırıcı model), `dontAsk`, `bypassPermissions`; "Deny rules apply in every mode, including bypassPermissions"; auto mod tüm planlarda; korumalı yollar (`.git`, `.claude`, `.husky` …) otomatik onaylanmaz — [permission-modes](https://code.claude.com/docs/en/permission-modes)
- `/usage`: abonelerde plan kullanım çubukları + skill/subagent/eklenti/MCP bazında atıf; oturum dolar rakamı abonelik için faturalama anlamı taşımaz — [costs](https://code.claude.com/docs/en/costs)
- Statusline: `/statusline` doğal dille betik üretir; JSON alanları `context_window.used_percentage`, `cost.total_cost_usd`, `rate_limits.five_hour.used_percentage`, `rate_limits.seven_day.used_percentage`, `resets_at` (rate_limits yalnız Pro/Max abonelerinde); Windows için PowerShell/Git Bash örnekleri var — [statusline](https://code.claude.com/docs/en/statusline)
- ccusage (MIT, ~19,3k yıldız): yerel kullanım verisinden günlük/aylık/oturum raporu, `blocks` = 5 saatlik pencereler, `--offline`; `npx ccusage@latest` ile çalışır — [ccusage](https://github.com/ryoppippi/ccusage)
- Headless: `claude -p`, `--output-format json` (`total_cost_usd` içerir), `--permission-mode dontAsk|acceptEdits|auto`, `--permission-prompts none`, `--max-budget-usd`; `--bare` önerilen script modu ama "bare mode never reads OAuth credentials" → `ANTHROPIC_API_KEY` gerekir; bare olmadan `-p` proje hook'larını ve `.mcp.json`'u güven diyaloğu olmadan çalıştırır; `-p`'de arka plan komut varsayılanı 10 dk — [headless](https://code.claude.com/docs/en/headless), [tools-reference](https://code.claude.com/docs/en/tools-reference)
- Cloud zamanlanmış görevler (eski adı routines): "research preview"; Pro/Max/Team/Enterprise; tetikleyiciler zamanlama, API, GitHub olayları (Pull request, Release, Issue); hesap başına saatte 100 zamanlanmış koşu; abonelik kullanımından düşer — [routines](https://code.claude.com/docs/en/routines)
- Worktree'ler paralel oturumları ayrı git checkout'larında izole eder — [llms.txt index](https://code.claude.com/docs/llms.txt), [agents](https://code.claude.com/docs/en/agents)

### Inferences
- `.claude/agents/kor-etiketci.md`: `tools: Read` (yalnız verilen koşu dosyası), `disallowedTools: Bash, WebFetch, WebSearch, Edit, Write`, `omitClaudeMd: true` (etiketçinin beklenen listeleri/ipuçlarını görmemesi için), `model` sabit. Bugün cloud oturumunun elle kurduğu "kör alt-etiketçi" düzenini tekrarlanabilir ve denetlenebilir yapar. Yazılı kural → teknik araç kısıtı.
- `.claude/agents/dogrulayici.md`: canlı md5, SW sürümü, imza ve anahtar taramasını yapan, yalnız `Bash(git *)`, `Bash(node *)`, `Bash(curl *)` gibi dar araçlı bir subagent; ana bağlamı log ile doldurmaz.
- Checkpoint sınırı Brewmaster için kritik: skill "hedefli node-regex" düzenlemelerini (Bash) tercih ediyor; bunlar `/rewind` ile geri alınamaz → güvence git commit/revert'tir (skill zaten "Rollback = git revert" diyor).
- Worktree / `/batch` / agent teams tek dosyalı bir uygulamada paralel düzenlemeleri aynı dosyada çakıştırır → ALMA.
- Zamanlanmış görevlerin GitHub tetikleyicilerinde push yok; Brewmaster doğrudan main'e push ettiği için PR tetikleyicisi fiilen ateşlenmez. Deterministik kontroller (md5, SW, anahtar) GitHub Actions'ta token harcamadan yapılmalı; zamanlanmış görev yalnız "haftalık yargı gerektiren denetim" için düşünülebilir.
- Statusline'da 5 saat/7 gün kota yüzdesi, Kaan'ın gerçek CEV koşusu sırasında CC'ye sprint verilmemesi kuralıyla birlikte, kota bitmeden önce uyarı verir. ccusage aynı bilgiyi verir ama her çalıştırmada npm'den kod indirir (tedarik zinciri) ve uygulamanın kendi API harcamasını (≈122 $ takibi) hiç görmez.

### Gaps
- Output styles sayfası okunmadı; Kaan'ın "sade Türkçe, jargon yok" tercihini CC çıktısına kalıcı uygulamak için uygun olup olmadığı belirsiz.
- Dynamic workflows'un olgunluk etiketi (deneysel mi) okunan özette yoktu.
- Yerel (Desktop/`/loop`) zamanlanmış görevlerin sınırları okunmadı.

## 7. 4,9 MB tek HTML dosyasını güvenle düzenleme: modüllere bölüp build adımı mı?

### Takeaway
CC'nin araçları büyük dosyayı sayfa sayfa okuyup tam-eşleşme ile düzenlemeye uygun; asıl riskler Bash ile yapılan (checkpoint dışı) düzenlemeler ve eskimiş boyut bilgisi. Vite/esbuild ile modüle bölüp tek dosyaya derlemek yüksek efor + yeni hata noktası + frozen imza/md5/test akışını bozma riski taşıyor — İZLE (L). Hook'lar + güncel bir "bölüm haritası" daha ucuz ve güvenli — DENE (S).

### Cited Findings
- Read aracı: tek çağrıda en çok 25.000 token; "refuses a whole file over 256 KB, so Claude reads a larger file in pages with `offset` and `limit`"; v2.1.296+ `allow_large: true` ile bağlam penceresine göre tüm dosya — [tools-reference](https://code.claude.com/docs/en/tools-reference)
- Edit aracı: regex/bulanık eşleşme yok; `old_string` birebir ve TEK olmalı (değilse daha uzun bağlam ya da `replace_all`); `PARTIAL view` okuması "read-before-edit" sayılmaz; tek dosyada `grep`/`sed -n 'X,Yp'`/`head` ile görmek okuma sayılır; geçersiz UTF-8 dosyada Edit reddeder — [tools-reference](https://code.claude.com/docs/en/tools-reference)
- Bash çıktısı satır içi ~30.000 karakter (`BASH_MAX_OUTPUT_LENGTH`, en çok 150.000) — [tools-reference](https://code.claude.com/docs/en/tools-reference)
- Windows'ta Glob/Grep varsayılan araç setinde; macOS/Linux'ta arama Bash içindeki gömülü `bfs`/`ugrep` ile yapılır ve izin kurallarına `Bash` çağrısı olarak düşer — [tools-reference](https://code.claude.com/docs/en/tools-reference)
- vite-plugin-singlefile: tüm JS/CSS'yi tek `index.html`'e gömer; README "isn't recommended for most situations"; tek giriş noktası; History API SPA yönlendirme, Worklet vb. desteklenmez; sourcemap işe yaramaz; CSP meta'sı `unsafe-inline`/hash/nonce olmadan gömülü kodu bloklar; yazarın "first Vite and first Rollup plugin"i; MIT, ~1,2k yıldız; service worker hakkında bilgi yok — [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile)
- Pages, build adımı içeren özel Actions iş akışından yayınlanabilir — [Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- Yerel gözlem: regresyon koşucusu "Gerçek dosya test edilir (Brewmaster_v2_79_10.html) — kopya YASAK" diyor ve kaynağı `src.slice(src.indexOf('SPRINT AK — PROFİL SEÇİCİ'), ...)` gibi yorum işaretlerinden dilimliyor — [repo](https://github.com/dessn7-bit/brewmaster)

### Inferences
- Bölmenin artıları: CC her modülü 256 KB sınırının altında tek seferde okuyabilir, `node --check` modül başına, diff'ler okunur, tek-eşleşme kuralı daha kolay sağlanır.
- Eksileri (Brewmaster'a özgü): (1) yayınlanan dosya ≠ kaynak → canlı md5 doğrulaması derleme çıktısına göre yeniden tanımlanmalı; (2) donmuş imzalar (AI4/CEV denetleyici hash'leri) kod bölümlerine bağlıysa hepsi yeniden dondurulmalı; (3) koşucu gerçek dosyayı ve yorum işaretlerini kullanıyor → testler derlenmiş dosyaya bakmalı; (4) bir build aracı (npm bağımlılığı) = yeni tedarik zinciri + yeni kırılma noktası; (5) Kaan kod bilmiyor → hata olduğunda "build mi bozuk, kod mu" ayrımı ona görünmez. Bu yüzden şu an karşılığını vermez.
- Orta yol (bundler'sız): kaynak dosyayı aynen bırakıp, CC'nin her oturumda okuyacağı otomatik üretilmiş bir "bölüm haritası" (SPRINT işaretleri → satır aralığı, script blok sınırları) + Stop hook kontrolleri. Ya da ileride: sıralı parça dosyalarını basit `cat` mantığıyla birleştiren, çıktısı byte-byte bugünkü dosyaya eşit olduğu kanıtlanabilen deterministik bir birleştirme betiği (bundler yok).
- Repo 283 MB ve her HTML commit'i ~5 MB'lık yeni blob ekliyor; Pages 1 GB önerisine henüz uzak ama büyüme izlenmeli.

### Gaps
- Donmuş imzaların neyin hash'i olduğu (tüm dosya mı, kod bölümleri mi) incelenmedi; bölme kararının maliyeti buna bağlı.
- esbuild/diğer tek-dosya araçları ayrıca incelenmedi.

## 8. Hangi özellik alınmalı? Karar tablosu (özellik → ne yapar → kurulum → maliyet → olgunluk → Brewmaster faydası → efor → karar)

### Takeaway
Öncelik sırası: (1) held-out dosyalarını public repodan/CC'nin çalışma ağacından ayırmak, (2) `.claude/settings.json` deny kuralları + PreToolUse/Stop hook'ları, (3) Claude'suz GitHub Actions regresyonu (sentetik fixture ile), (4) proje skill'i ve subagent tanımlarını güncellemek. Geri kalanların çoğu karmaşıklık ekleyip az fayda veriyor.

### Cited Findings
(Her satırın kaynağı yukarıdaki bölümlerde; burada özet.)

| # | Özellik | Ne yapar / kurulum | Maliyet | Olgunluk | Brewmaster faydası | Efor | Karar |
|---|---|---|---|---|---|---|---|
| 1 | Held-out → ayrı private repo (yalnız cloud oturumuna bağlı) | Dosyaları public repodan çıkar, cloud oturumu private repoyu GitHub App ile ekler ([cloud](https://code.claude.com/docs/en/claude-code-on-the-web)) | 0 $ | GitHub standart | CC'nin açması fiziken imkânsız; public sızıntı ileriye dönük durur | M | AL |
| 2 | `.claude/settings.json` deny | `Read(/tests/cev_seti_heldout.json)` vb. ([permissions](https://code.claude.com/docs/en/permissions)) | 0 $ | GA | Dosya araçları + cat/head/sed kapanır; grep -r/node/git show açık | S | AL (tek başına yetmez) |
| 3 | PreToolUse hook (held-out bekçisi) | Node betiği, exit 2; bypass modunda bile engeller ([hooks-guide](https://code.claude.com/docs/en/hooks-guide)) | 0 $ | GA | Bash/grep/WebFetch yollarını da daraltır | S | AL |
| 4 | Sandbox | OS düzeyi Bash kısıtı ([sandboxing](https://code.claude.com/docs/en/sandboxing)) | 0 $ | GA (macOS/Linux/WSL2) | Yerel Windows'ta YOK | M (WSL2'ye geçiş) | İZLE |
| 5 | PostToolUse + Stop hook'ları (node --check, SW bump, anahtar, CLAUDE.md ≤150k) | `.claude/hooks/*.mjs` ([hooks](https://code.claude.com/docs/en/hooks)) | 0 $ | GA | Rutin işleri unutulmaz kılar | M | AL |
| 6 | GitHub Actions regresyon (6'lı matris, `--parca`) | `.github/workflows/test.yml`, Puppeteer ([runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)) | 0 $ (public) | GA | Laptop RAM sorunu biter, 16 GB runner | M (sentetik fixture şart) | AL |
| 7 | Pages'i Actions'tan yayınla + test kapısı + canlı md5 | `upload-pages-artifact` + `deploy-pages` ([Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)) | 0 $ | GA | Test geçmeden deploy olmaz; md5 otomatik | M | DENE |
| 8 | Secret scanning push protection | Repo ayarı ([changelog](https://github.blog/changelog/2026-10-13-secret-scanning-blocks-anthropic-keys-by-default-adds-salesforce)) | 0 $ | GA | Anthropic anahtarı push'u bloklanır | S (doğrula) | AL |
| 9 | Cloud oturumunda tam regresyon | Setup script + Custom/Trusted ağ ([cloud-environments](https://code.claude.com/docs/en/cloud-environments)) | Max kotası | GA (scheduled kısmı preview) | Laptoptan taşır ama süre/RAM sınırlı | M | DENE |
| 10 | claude-code-action (@claude) | `/install-github-app`, OAuth token ([github-actions](https://code.claude.com/docs/en/github-actions)) | Max kotası + runner (public'te 0) | v1 GA | Cloud + Remote Control ile örtüşür; public repoda prompt-injection yüzeyi | M | İZLE |
| 11 | Yönetilen Code Review | Team/Enterprise ([code-review](https://code.claude.com/docs/en/code-review)) | — | — | Max'te yok | — | ALMA |
| 12 | Yerleşik `/code-review` | Oturum içinde ([code-review](https://code.claude.com/docs/en/code-review)) | Max kotası | GA | Büyük değişiklik sonrası ikinci göz | S | DENE |
| 13 | Proje skill güncellemesi + `/deploy` skill | `.claude/skills/` ([skills](https://code.claude.com/docs/en/skills)) | 0 $ | GA | Eskimiş sayılar düzelir; deploy yalnız açık istekle | S | AL |
| 14 | anthropics/skills, commit-commands, feature-dev | `/plugin marketplace add …` ([skills repo](https://github.com/anthropics/skills)) | 0 $ | demo/eğitim | Projenin kendi protokolünün gerisinde | S | ALMA |
| 15 | security-guidance eklentisi | Resmi pazar ([hooks-guide](https://code.claude.com/docs/en/hooks-guide)) | ek token | resmi | Belirsiz; maliyet ölçülmedi | S | İZLE |
| 16 | Topluluk eklenti/skill listeleri, mod'lar | awesome-claude-code vb. ([plugin security](https://code.claude.com/docs/en/plugins/security)) | 0 $ | denetimsiz | Kullanıcı yetkisiyle kod; mod'lar deny'ı aşabilir | — | ALMA |
| 17 | Chrome DevTools MCP | plugin veya `npx` ([repo](https://github.com/ChromeDevTools/chrome-devtools-mcp)) | 0 $ | GA, Google | Lighthouse a11y, offline emülasyon, heap | S | DENE (cloud'da, telemetri kapalı) |
| 18 | GitHub MCP | uzak URL, `--read-only` ([repo](https://github.com/github/github-mcp-server)) | 0 $ | GA | CI eklenirse log okuma; yoksa gh yeter | S | İZLE |
| 19 | Context7 | uzak MCP ([repo](https://github.com/upstash/context7)) | ücretsiz anahtar | GA | Framework yok → değer düşük | S | ALMA |
| 20 | ast-grep MCP | `uvx …` ([repo](https://github.com/ast-grep/ast-grep-mcp)) | 0 $ | deneysel | Gömülü JS desteği belirsiz | S | İZLE |
| 21 | Filesystem/Memory/Sentry MCP | referans/arşiv ([servers](https://github.com/modelcontextprotocol/servers)) | 0 $ | eğitim amaçlı | Yerleşiklerle örtüşür / Sentry yok | — | ALMA |
| 22 | Özel subagent'lar (kör etiketçi, doğrulayıcı) | `.claude/agents/*.md` ([sub-agents](https://code.claude.com/docs/en/sub-agents)) | Max kotası | GA | Yazılı "kör" kuralı araç kısıtına döner | S | AL |
| 23 | Agent teams | env ile açılır ([agents](https://code.claude.com/docs/en/agents)) | çok token | deneysel | Tek dosyada çakışma | — | ALMA |
| 24 | Agent view / Projects | ([agents](https://code.claude.com/docs/en/agents)) | Max kotası | preview / beta | Belki uzun süreli işler | S | İZLE |
| 25 | Statusline (kota %) | `/statusline` ([statusline](https://code.claude.com/docs/en/statusline)) | 0 $ | GA | 5s/7g kota görünür | S | DENE |
| 26 | ccusage | `npx ccusage@latest` ([repo](https://github.com/ryoppippi/ccusage)) | 0 $ | topluluk | `/usage` ile örtüşür; uygulama API harcamasını görmez | S | ALMA |
| 27 | Checkpoint / `/rewind` | yerleşik ([checkpointing](https://code.claude.com/docs/en/checkpointing)) | 0 $ | GA | Bash düzenlemelerini geri almaz → git asıl güvence | — | (zaten var; sınırı bil) |
| 28 | Worktree, `/batch` | yerleşik ([agents](https://code.claude.com/docs/en/agents)) | çok token | GA | Tek dosyada paralellik yok | — | ALMA |
| 29 | Headless `claude -p` | CLI ([headless](https://code.claude.com/docs/en/headless)) | kota veya API | GA | `--bare` API anahtarı ister (kurala aykırı) | M | İZLE |
| 30 | Cloud zamanlanmış görevler | `/schedule` ([routines](https://code.claude.com/docs/en/routines)) | Max kotası | research preview | Push tetikleyicisi yok; deterministik kontroller Actions'ta daha iyi | S | İZLE |
| 31 | Auto izin modu | ([permission-modes](https://code.claude.com/docs/en/permission-modes)) | sınıflandırıcı token | GA | Daha az onay; deny'lar yine geçerli | S | İZLE |
| 32 | Modüle bölme + Vite tek-dosya build | ([vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile)) | 0 $ | eklenti olgunluğu orta | İmza/md5/test akışını bozar | L | İZLE |

### Inferences
- "AL" maddelerinin hepsi 0 $ ve Max kotası dışında; çoğu bir kerelik kurulum. Kaan kod yazmadığı için kurulumları CC (veya cloud oturumu) yapmalı; Kaan'ın yapacağı tek şey GitHub ayar ekranında secret scanning'i ve (seçilirse) Pages kaynağını onaylamak.
- En çok değer: #1 + #6. #1 değerlendirme geçerliliğini korur (bugün public), #6 laptop RAM sorununu bütünüyle ortadan kaldırır ve Claude tokenı harcamaz.

### Gaps
- Tablodaki efor tahminleri (S/M/L) ölçüme değil benim değerlendirmeme dayanıyor.
- Hiçbir öğe bu ortamda kurulup denenmedi (kural gereği); "DENE" maddeleri gerçek denemeyle teyit edilmeli.
