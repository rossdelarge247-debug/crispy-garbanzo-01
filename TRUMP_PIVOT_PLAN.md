# Trump Policy Trading Intelligence — Architecture Plan

## Product concept

A hyper-focused political risk trading tool that tracks Trump administration
announcements, analyses their market impact, and generates trade
recommendations. Everything centres on one question:

**"What did Trump just say, and what does it mean for markets?"**

## Data sources

### Primary — policy announcements
1. **Truth Social** — Trump's primary communication channel
   - RSS/scraping via public feeds
   - Post content, timestamps, engagement metrics
2. **White House press releases** — whitehouse.gov/briefing-room
   - Executive orders, proclamations, statements
   - Press briefing transcripts
3. **Reuters/AP political feeds** — via GDELT and RSS
   - Real-time policy news
   - Tariff announcements, trade deal updates, sanctions
4. **Congressional actions** — bills, votes affecting policy

### Secondary — market reaction
5. **Yahoo Finance / Polygon** — price data for affected assets
6. **Reddit / StockTwits** — retail sentiment reaction
7. **GDELT + RSS** — news cycle tracking (how media covers it)

### Tertiary — analysis
8. **Claude AI** — policy impact analysis, scenario generation
9. **Grok AI** — second opinion, X/Twitter sentiment proxy

## Core features

### 1. Policy Feed (replaces economic calendar)
- Chronological feed of Trump/White House statements
- Each tagged by policy area: Trade/Tariffs, Energy, Tech, Defence, Fiscal
- Impact rating: how market-moving is this?
- Affected assets auto-detected from content

### 2. Policy Impact Analysis (replaces event playbook)
- For each announcement:
  - Which sectors/assets are directly affected?
  - Historical precedent: what happened last time similar policy was announced?
  - Sentiment: how is the market/media/social reacting?
  - AI scenario analysis: 3 outcomes with trade actions

### 3. Trade Recommendations
- Specific: "Tariff on Chinese EVs → Short NIO, Long F, Long domestic steel"
- £1,000 default with leverage
- 2:1 R:R always
- Timing: immediate vs wait for market open

### 4. Pattern Recognition
- Friday evening announcements → Monday open moves
- Tweet storms → volatility spikes
- Policy reversal patterns (announce, market moves, walk back)
- Sector rotation patterns from policy shifts

### 5. Weekend Monitor
- Active scanning Friday PM through Sunday
- Alert system for weekend announcements
- Pre-market positioning recommendations for Monday

## Page structure

### Dashboard
- Latest policy announcements feed (Truth Social + White House)
- Active trade recommendations
- Sentiment pulse (social reaction gauge)
- Upcoming policy events (trade deadlines, summits, votes)
- Weekend alert status

### Policy Detail (/policy/[id])
- The announcement (full text)
- AI analysis: what it means for markets
- Affected assets with direction + reasoning
- Historical precedent: similar announcements + what happened
- Sentiment: social/media reaction
- Trade plan with £1k/leverage/2:1 R:R
- Journal CTA

### Sector Map
- Visual mapping: which sectors are exposed to which policy areas
- Trade/Tariffs → commodities, FX, specific stocks
- Energy → oil, gas, renewables
- Tech → semiconductors, Chinese tech, US tech
- Defence → defence stocks, geopolitics

### Journal (keep existing)
- Log trades tied to specific policy events
- Track performance by policy category

## Policy categories + affected assets

### Trade & Tariffs
- Tariffs on China → Short Chinese ADRs, Long domestic manufacturers
- Tariffs on EU → Short EUR/USD, Long DXY
- Trade deals → Long affected export sectors
Assets: EUR-USD, USD-CNH, SPY, specific stocks, commodities

### Energy
- Drill baby drill → Long oil stocks, Short renewables
- Strategic reserve → Crude oil directional
- Sanctions on oil producers → Long crude
Assets: BZ=F, CL=F, XLE, USO

### Tech / AI
- China chip bans → Long domestic semis, Short Chinese tech
- AI regulation → Short/Long specific names
- TikTok / social media → specific stocks
Assets: NVDA, AAPL, BABA, semiconductor ETFs

### Fiscal / Tax
- Tax cuts → Long SPY, Long small caps
- Government spending → sector-specific
- Debt ceiling → Risk-off, Long bonds
Assets: SPY, IWM, TLT

### Foreign Policy / Defence
- Escalation → Long defence, Long gold, Short risk
- De-escalation → Short gold, Long risk
- Sanctions → specific country FX + commodities
Assets: GC=F, LMT, GD, specific FX pairs

### Fed / Monetary
- Trump comments on Fed → DXY, Gold
- Rate pressure → Bond market, FX
Assets: DXY, GC=F, TLT

## Build sequence

Phase 1: Policy feed engine + new dashboard
Phase 2: Policy detail page with AI analysis
Phase 3: Trade recommendations + historical precedent
Phase 4: Pattern recognition + weekend monitor
Phase 5: Sector mapping
