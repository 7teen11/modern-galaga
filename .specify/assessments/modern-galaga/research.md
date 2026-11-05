# Idea Research: Modern Galaga-style Internal Shooter Game

- **Slug**: modern-galaga
- **Created**: 2026-11-04
- **Evidence confidence (overall)**: low

> [!NOTE]
> Overall confidence is **low** mainly because there is **no internal evidence** (requester, demand signal, event, headcount, platform policies). The external evidence on prior art, legal constraints, and leaderboard integrity is decent (**medium**), but it only shows the idea *can* be built. It says nothing about whether employees *want* it.
>
> **Method note**: External findings come from web-search summaries (the search tool). No URLs were fetched directly, and the cited pages were **not opened or verified** one by one. Treat specific repo names and statistics as leads to confirm, not established facts.

## Users & Demand

- No internal demand signal is recorded: no requester, survey, ticket, or event tied to the idea (see `intake.md`, Origin & Context). — [source: `.specify/assessments/modern-galaga/intake.md`] (confidence: high that the signal is *missing*)
- The audience is "internal company" employees. Headcount, locations/time zones, and how many play games are unknown. — [ASSUMPTION / NEEDS CLARIFICATION] (confidence: low)
- Workplace gamification studies report that only a small share of participants (cited as roughly 10%, using Bartle's player types) are motivated mainly by competition and leaderboards. Most are driven by social connection or mastery. A pure global high-score board may therefore appeal to a minority of staff. — [source: web-search summary citing shrm.org] (confidence: medium; the Bartle taxonomy describes MUD players and doesn't map rigorously onto workplaces)
- Light internal games and challenges are said to help remote and hybrid staff feel connected. — [source: web-search summary citing hrtechoutlook.com] (confidence: low; vendor/trade-press source)
- Stated vs. observed: the idea is a *stated* wish from one input. Nobody has *observed* employees seeking out or playing such games. — [ASSUMPTION] (confidence: medium)

## Prior Art

- **Internal**: there are no prior specs, plans, or decisions in `.specify/`. The repository has only Spec Kit scaffolding, an unfilled constitution template, and this assessment. — [source: repo listing of `d:\ANTI\modern-galaga`, `.specify/memory/constitution.md`] (confidence: high)
- **Commercial "modernized Galaga" precedents**: *Galaga Legions / Legions DX* (Bandai Namco) modernized the formula with neon visuals, satellite helper pods, and large dynamic swarms. *Space Invaders Extreme* (Taito) modernized a fixed-screen shooter with chains, fever modes, and branching stages. Both show that "modern + fast-paced" on a classic fixed-screen shooter is proven design territory. — [source: web-search summary citing wikipedia.org, g2a.com] (confidence: medium)
- **Roguelite / upgrade-shop shooters**: indie wave-based shooters add between-wave upgrade drafts or shops (currency → upgrades → next wave), which match the "ship upgrade system" in the idea. — [source: web-search summary citing shmup.org] (confidence: medium)
- **Open-source browser clones** that could serve as references: search results name several GitHub projects with Galaga-style shooters in Phaser/TypeScript or vanilla Canvas (e.g., `DanWahlin/agent-arcade` "Galaxy Blaster", `nigelflippo/nf-phaser-games`, `jwilliams219/galaga`, `code-yeongyu/gallag-omo-native`). — [source: web-search summary citing github.com; **repos not opened or verified**; licenses unknown] (confidence: low)
- Takeaway: the genre and the tech are well trodden. Building a basic Galaga-like browser game is a common hobby/tutorial project. — [source: same as above] (confidence: medium)

## Market & Context

- **Alternatives employees use today**: existing casual and social options, such as commercial web/mobile games, team-building vendors, quiz platforms (e.g., Kahoot-style), and chat-integrated mini-games. None of these has been measured for this company. — [ASSUMPTION] (confidence: low)
- **Gamification in general**: research reports gains when gamification fits work people already value. It also warns of a novelty drop-off and "shelfware" within weeks if there is no lasting reason to return. — [source: web-search summary citing shrm.org, happily.ai, columbia.edu, hbs.edu] (confidence: medium; most studies cover work-task gamification, not standalone entertainment games)
- **Cost of doing nothing**: unclear. With no stated business problem (engagement score, event need, etc.), skipping it appears to cost nothing measurable. — [ASSUMPTION] (confidence: low)

## Data & Constraints

- **Trademark**: "Galaga" is an active registered trademark of Bandai Namco. Using the name, or confusingly similar names, in title or branding is a risk even for internal use. — [source: web-search summary citing trademarkia.com, justia.com] (confidence: medium-high)
- **Copyright**: original Galaga sprites, audio, and code are protected, and near-identical redraws can be challenged under "look and feel" reasoning (cf. *Tetris Holding v. Xio Interactive*). Game *mechanics* (formations, dive attacks, capture mechanic) are generally not copyrightable. An original-asset "Galaga-style" game is generally permissible. — [source: web-search summary citing stackexchange.com, wikipedia.org, ielawgroup.net, github.com] (confidence: medium; **not legal advice**, so confirm with company legal if needed)
- **Leaderboard integrity**: in browser games, any score computed on the client can be faked with dev tools or by calling the API directly. Typical measures include server-issued session tokens, minimum-duration and plausibility checks, rate limiting, and (strongest) deterministic replay or input-log verification on the server. Obfuscation and client-side signing do **not** prevent cheating. — [source: web-search summary citing playgama.com, safeguard.sh, gamedev.stackexchange.com, bugnet.io] (confidence: medium-high)
- **Integrity stakes depend on rewards**: if the leaderboard carries prizes or public recognition, the anti-cheat effort and fairness complaints grow. — [ASSUMPTION, inferred from the above] (confidence: medium)
- **Identity & privacy**: an employee leaderboard implies storing employee identifiers and gameplay data, which may fall under internal data/privacy policies and SSO integration requirements. — [ASSUMPTION / NEEDS CLARIFICATION] (confidence: medium)
- **Platform**: no platform constraint is defined. Browser delivery is the most common pattern in the prior art found. — [source: prior-art search above; ASSUMPTION for this company] (confidence: low)
- **Team / budget / timeline**: unknown. — [NEEDS CLARIFICATION]

## Evidence Against the Idea

- **No demonstrated demand or business problem.** Nothing shows employees asked for this or that it solves a measured issue (engagement, onboarding, event need). — [source: `intake.md`] (confidence: high)
- **Competitive leaderboards may alienate most players and can create friction.** Gamification research warns that public rankings can demotivate low scorers and engage only a competitive minority. — [source: web-search summary citing shrm.org] (confidence: medium)
- **Novelty decay.** Internal gamified tools often see engagement fall within weeks without fresh content or events, so a one-off game may get brief use. Ongoing content costs time. — [source: web-search summary citing happily.ai] (confidence: medium)
- **Hidden costs beyond the game itself**: hosting, authentication/SSO, data handling, anti-cheat, and maintenance for an internal tool. — [ASSUMPTION, supported by the leaderboard-integrity sources] (confidence: medium)
- **IP risk if the "Galaga" name or look is copied** (title, sprites, sounds). — [source: trademark/copyright findings above] (confidence: medium)
- **Opportunity cost**: engineering time spent on an internal game rather than core work, unless it's framed as a hackathon, learning project, or culture budget item. — [ASSUMPTION] (confidence: low)
- **Off-the-shelf alternatives** (existing games, team-building platforms) may meet a social/engagement goal at lower cost. — [ASSUMPTION] (confidence: low)

## Gaps & Open Questions

- [NEEDS CLARIFICATION: Who is the sponsor/requester and what outcome do they want (engagement, event, learning project, fun)?]
- [NEEDS CLARIFICATION: Is there any internal demand signal (survey, past events, Slack/Teams interest, prior game nights)?]
- [NEEDS CLARIFICATION: Expected number of players, offices, and time zones?]
- [NEEDS CLARIFICATION: Will the leaderboard carry prizes or recognition? This sets the anti-cheat bar.]
- [NEEDS CLARIFICATION: Is company SSO/identity required, and what data/privacy policy applies to storing employee scores?]
- [NEEDS CLARIFICATION: Target platform (browser, desktop, mobile) and any allowed hosting environment?]
- [NEEDS CLARIFICATION: Is there a deadline (e.g., year-end party, team event) and who will build and maintain it?]
- [NEEDS CLARIFICATION: Does company legal/brand have rules on internal use of third-party-inspired games or names?]
- [NEEDS CLARIFICATION: Verify the licenses and quality of the candidate open-source reference projects before relying on them.]

## Sources

All external sources reached the agent only through web-search result summaries (Google grounding redirect links). **None were fetched directly**, so no URL Trust Policy fetch branch applies. The hosts are listed for traceability.

- `.specify/assessments/modern-galaga/intake.md` (local, read)
- `.specify/memory/constitution.md` (local, read; unfilled template)
- Repository file listing of `d:\ANTI\modern-galaga` (local)
- Trademark / IP: trademarkia.com, justia.com, stackexchange.com, wikipedia.org, ielawgroup.net, github.com, reddit.com (host: various, policy: not fetched, search summary only)
- Workplace gamification: shrm.org, kraftylab.com, columbia.edu, hbs.edu, happily.ai, upgrad-enterprise.com, hrtechoutlook.com, uvt.nl (policy: not fetched, search summary only)
- Open-source prior art: github.com (`DanWahlin/agent-arcade`, `nigelflippo/nf-phaser-games`, `jwilliams219/galaga`, `code-yeongyu/gallag-omo-native`) (host: github.com, policy: allowlisted but not fetched, search summary only)
- Leaderboard anti-cheat: playgama.com, safeguard.sh, gamedev.stackexchange.com, bugnet.io, reddit.com, youtube.com (policy: not fetched, search summary only)
- Modern shooter design: wikipedia.org, g2a.com, shmup.org, steampeek.hu, youtube.com (policy: not fetched, search summary only)

