# Shorthaul: Game design document

## Concept

Shorthaul is a multiplayer strategy game played on a world map. Players compete to build airline route networks, fulfil cargo contracts, and become the dominant carrier. The core constraint: no long-haul direct flights. This forces players to build chains of shorter regional hops, making network shape the primary strategic variable.

---

## World graph

### Graph design philosophy

The world is represented as a graph of airports connected by routes. The graph is **fixed across all sessions** to allow deliberate balance and playtesting. Procedural generation may be introduced later, once a good graph is well understood.

Real-world ADS-B frequency data is used as inspiration but not authoritative. African, South American, and Asian airports are underrepresented in real-world data, which would create structural imbalance. Instead, routes are assigned to one of three tiers manually, ensuring each region has comparable strategic depth.

### Airports

Approximately 30 airports, roughly 5–6 per region. Regions:

- North America
- South America
- Europe
- Africa
- Central Asia
- East Asia 
- Oceania

Airport names and IATA codes are real. Their connectivity is designed, not derived.

### Route tiers

| Tier | Haul length | Role |
|------|-------------|------|
| Short | Regional | Cheap, dense, form the backbone of local networks |
| Medium | Continental | Mid-cost, connect regional clusters |
| Long | Inter-regional | Expensive, rare, connect continents at bottleneck airports |

Long-haul intercontinental direct flights are intentionally absent. Getting from one continent to another requires routing through one of a small number of designated intercontinental corridors, each with one or two bottleneck hub airports.

### Intercontinental corridors

| Corridor                  | Example gateway airports | Example routes                                                            |
|---------------------------|--------------------------|---------------------------------------------------------------------------|
| North America ↔ Europe    | Reykjavik, Azores        | NY → Reykjavik → London, Miami → Azores → Lisbon                          |
| North America ↔ East Asia | Anchorage                | Vancouver → Anchorage → Tokyo, Seattle → Anchorage → Seoul                |
| North America ↔ Oceania   | Honolulu, Fiji, Tahiti   | LA → Honolulu → Fiji → Sydney, Mexico City → Honolulu → Tahiti → Auckland |

Each corridor is a genuine bottleneck. Narrow enough to be contested, but not so singular that one player can monopolise intercontinental traffic entirely. Having a few distinct corridors means each starting continent has a different natural intercontinental story, and no single hub airport is essential to every long chain.

### Interconnectedness

The graph is kept deliberately sparse. Between any two major hubs there should be 2–3 viable paths, not many. This ensures individual edge ownership is meaningful and that the bottleneck mechanic (see below) has real bite.

---

## Route ownership

### Shared ownership

Any player can purchase any route regardless of whether it connects to their existing network. All players can own shares in the same route simultaneously. A route's frequency is split equally among all current owners.

If 3 players own a route, each receives 1/3 of its frequency contribution toward their path quality calculations.

### Purchase cost

```
cost = base_frequency_cost + (current_owners × base_frequency_cost × contest_rate)
```

- `base_frequency_cost` scales with the route's tier — higher tier routes cost more
- `contest_rate` is a tunable constant, suggested starting value 0.5
- Each additional owner makes the route more expensive to enter, discouraging pure interference while keeping it possible

Players do not buy multiple shares of the same route (one share per player per route).

### Speculative purchasing

Players may purchase any route, even if it does not connect to their existing network. This allows land-grabbing of strategic edges in advance. The restriction to network-connected purchases only may be introduced in a future version once the open model has been playtested.

---

## Contracts

### Structure

Contracts are the primary economic objective. Each contract specifies:

- A source airport
- A sink airport
- A payout rate per tick

Contracts are **shared and visible to all players**. There is no private hand. All players compete for the same opportunities.

### Fulfillment

A contract is fulfilled by whichever player currently has the **highest path quality** between source and sink, above a minimum threshold.

Path quality is measured as the **bottleneck frequency** of the player's best path, i.e. the minimum frequency edge along any chain connecting source to sink, weighted by the player's ownership share of each edge. A path is only as strong as its weakest link, which discourages routing through low-value airports just to technically complete a chain.

Contract leadership is **dynamic**. A player who currently leads a contract can be displaced if a competitor builds a better path. Buying into a rival's critical bottleneck edge is a valid strategy, diluting their share of that edge and potentially dropping their path quality below the threshold.

### Contract pool

The board has a fixed set of contracts that persist for the entire game. No spawning, no expiry. Contracts are permanent objectives that players compete over from start to finish, giving each one strategic identity that develops over the course of a session.

Suggested pool size: **6–10 contracts** for 2–8 players.

#### Tier split (approximate)

| Tier | Share | Description |
|------|-------|-------------|
| Short-haul | 50% | Achievable with 2–3 routes, early-game accessible |
| Mid-haul | 30% | Requires a small connected subgraph, 1–2 hops |
| Long-haul | 20% | Requires intercontinental chain, high value, rare |

---

## Economy

### Income streams

Players earn money from two sources:

**Passive passenger revenue**: every owned route earns a small income per simulated aircraft landing. This is always-on from the moment a player owns their first route. It is the primary early-game income source and ensures players are never earning zero.

**Contract payout**: the current leader of a contract earns its payout rate each tick. This is the primary mid-to-late game income source and scales with the value of contracts led.

### Income stack summary

| Source | Requirement | Value |
|--------|-------------|-------|
| Passenger revenue | Own any route | Low, steady |
| Contract payout | Lead a contract above threshold | Medium to high, ongoing |

---

## Win condition

**First player to simultaneously lead 3 contracts wins.**

This rewards building a mature, well-connected network rather than hoarding cash. It scales naturally with session settings. In a shorter session or with more players, the threshold can be adjusted to 2 or 4.

The UI should make current contract standings highly legible, especially in the endgame when multiple players may be close to 3 simultaneously.

---

## Game start

### Continent draft

At game start, each player selects a starting continent from the available regions. Duplicate continent picks are allowed. Two players starting in the same region will clash earliest and create early-game tension.

Each continent has one curated starting route assigned to it. The player receives that route already owned at no cost, plus a small cash budget for their first few purchases.

Starter routes are chosen to be broadly comparable in value across continents. No continent should offer a structurally superior starting position.

### Why a draft

Dropping a new player onto an empty world map with no guidance produces analysis paralysis. The continent pick is intuitive (players can reason about geography without domain knowledge) and immediately creates strategic identity. The curated starter route ensures passive income begins from tick one.

---

## Open questions / future work

- Exact values for `contest_rate`, starting budget, contract payout rates, and passenger revenue require playtesting
- Whether to restrict route purchases to network-connected airports only (currently open)
- Procedural graph generation once fixed graph is well balanced
- Whether routes can be sold back (currently no resale, every purchase is a committed investment)
- Handling of a player going bankrupt. Do their route shares evaporate, redistributing frequency to remaining owners?
- Snake draft if players receive more than one starter route in future
- Session-length settings adjusting the win threshold (2–4 contracts)