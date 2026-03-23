

## Add More Games Across 10 Categories

### Current State
The SkillGamesBrowser has **8 domains** with **40 SkillQuest variants + 8 standalone games = 48 total**. The user wants games added in 10 categories — some map to existing domains, some require new domains or expanded symbol sets.

### Category Mapping

| Requested Category | Action |
|---|---|
| Communication & AAC | Expand existing `communication` domain — add AAC-specific symbols (picture boards, PECS) + 3 new variants |
| Educational Learning | New `educational_learning` domain — alphabet, counting, science, reading symbols + 5 variants |
| Social Skills | Expand existing `social` domain — add social stories symbols + 3 new variants |
| Speech Therapy | New `speech_therapy` domain — mouth shapes, sounds, articulation symbols + 5 variants |
| Daily Routines | Expand existing `daily_living` + `executive_function` — add visual schedule symbols + 3 new variants |
| Storytelling | New `storytelling` domain — narrative elements, characters, story structure + 5 variants |
| Progress Tracking | Skip (already exists as admin/parent feature, not a game domain) |
| Interactive Games | Expand standalone games — add 4 new Memory/Pattern/Sound bonus entries |
| Emotional Regulation | Expand existing `emotional_regulation` — add coping scenario symbols + 3 new variants |
| Cognitive Development | New `cognitive_development` domain — memory training, attention, problem-solving + 5 variants |

### Implementation Plan

#### 1. Add 4 New Domains with Symbol Sets (`skillGameData.ts`)

**Speech Therapy** (20 symbols):
- Groups: `mouth_shape`, `sound_type`, `word_practice`, `articulation`
- Symbols: lip shapes, tongue positions, vowel/consonant sounds, word pairs

**Storytelling** (20 symbols):
- Groups: `character`, `setting`, `action`, `emotion`, `object`
- Symbols: hero, villain, castle, forest, running, finding, magic wand, treasure

**Educational Learning** (20 symbols):
- Groups: `alphabet`, `counting`, `science`, `reading`
- Symbols: letters D-Z, numbers 6-10, planets, weather, books, magnifying glass

**Cognitive Development** (20 symbols):
- Groups: `memory`, `attention`, `logic`, `problem_solving`
- Symbols: brain, puzzle, magnifier, lightbulb, clock, maze, mirror, arrows

#### 2. Add ~28 New Game Variants

Per new domain (5 each = 20):
- **Speech Therapy**: Sound Matcher, Mouth Shape Sort, Rhyme Finder, Word Builder, Articulation Challenge
- **Storytelling**: Story Starter, Character Match, Setting Sorter, Plot Sequencer, Story Detective
- **Educational Learning**: Alphabet Adventure, Counting Quest, Science Sorter, Reading Match, Knowledge Detective
- **Cognitive Development**: Brain Trainer, Memory Challenge, Focus Finder, Logic Puzzle, Pattern Thinker

Per expanded domain (2-3 each = ~8):
- **Communication & AAC**: AAC Board Match, Symbol Sentence Builder, PECS Sorter
- **Social Skills**: Social Story Sequencer, Friendship Scenario, Behavior Sorter
- **Emotional Regulation**: Emotion Scenario, Trigger Identifier, Calm Plan Builder
- **Daily Routines**: Visual Schedule Builder, Routine Timer Sort

#### 3. Add 4 New Standalone Games

- Storytelling Memory (memory game with story elements)
- Speech Sounds Pattern (pattern game with speech sounds)
- Cognitive Memory Challenge (memory game for cognitive domain)
- Educational Pattern (pattern game for learning)

#### 4. Update SkillGamesBrowser (`SkillGamesBrowser.tsx`)

Add the 4 new domain labels and emojis to `DOMAIN_LABELS`:
- `speech_therapy: { label: 'Speech Therapy', emoji: '🗣️' }`
- `storytelling: { label: 'Storytelling', emoji: '📖' }`
- `educational_learning: { label: 'Educational Learning', emoji: '🎓' }`
- `cognitive_development: { label: 'Cognitive Development', emoji: '🧠' }`

### Result
- **Before**: 8 domains, 48 games
- **After**: 12 domains, ~80 games

### Files Changed

| File | Action |
|------|--------|
| `src/components/games/shared/skillGameData.ts` | Add 4 symbol sets, 28 variants, 4 standalone, 4 domain configs |
| `src/components/kids/SkillGamesBrowser.tsx` | Add 4 new domain labels |

