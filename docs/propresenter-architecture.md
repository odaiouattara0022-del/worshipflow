# ProPresenter Architecture Reference

> **Internal reference for WorshipFlow development.**
> Based on analysis of PP 20.0 (build 335544354), Windows, Proto 19beta schemas.

## 1. Directory Structure

```
C:\Users\HP\Documents\ProPresenter\
├── Configuration/
│   ├── KeyMappings     (protobuf - HotKey bindings)
│   ├── Labels          (protobuf - ProLabelsDocument)
│   ├── Props           (protobuf - PropDocument)
│   ├── Stage           (protobuf - Stage.Document)
│   ├── Timers          (protobuf - TimersDocument)
│   └── Workspace       (protobuf - workspace config)
├── Libraries/
│   ├── Default/        (19 .pro files - Bible verses)
│   └── CHANTS/         (.pro files - songs)
├── Media/
│   ├── Assets/         (images, videos, theme assets - UUID-prefixed)
│   ├── Downloads/
│   ├── Import/
│   └── ProContent/
├── Playlists/
│   ├── Library         (protobuf - PlaylistDocument - presentation playlists)
│   ├── Media           (protobuf - PlaylistDocument - media playlists)
│   └── Templates/
│       └── PlaylistTemplates
├── Presets/
│   ├── Effect/
│   └── Transition/
└── Themes/
    ├── BIBLE/
    │   ├── Assets/     (16 model images: landscape + portrait)
    │   └── Theme       (protobuf - Template.Document, 16 slides)
    ├── Chant/
    │   ├── Assets/     (6 images: Fichier 1-6.png)
    │   └── Theme       (protobuf - Template.Document, 6 slides)
    ├── LETRA ANIMADA - TEMAS PP7/
    │   └── Theme       (protobuf - Template.Document, 15 slides, no Assets)
    └── Planche Résumé/
        ├── Assets/     (3 images)
        └── Theme       (protobuf - Template.Document)
```

## 2. File Formats

All PP data files are **Google Protocol Buffers** (not JSON, not XML).

### .pro files (Presentations)
- **Message type:** `rv.data.Presentation`
- **Structure:** uuid, name, background, arrangements[], cueGroups[], cues[], ccli, bibleReference
- **Each cue** contains one or more `Action` objects
- **Slide content** is in `action.slide.presentation.baseSlide.elements[]`

### Theme files
- **Message type:** `rv.data.Template.Document`
- **Structure:** applicationInfo, slides[] (each is `Template.Slide` with baseSlide + name + actions[])
- **Theme slides define** the visual template: element positions, background images, text zones

### Playlist files (Library, Media)
- **Message type:** `rv.data.PlaylistDocument` (NOT `Playlist` directly)
- **Structure:** applicationInfo, type, rootNode (nested Playlist tree)
- **Each playlist** can contain PlaylistItems referencing .pro files

### Configuration files
- KeyMappings, Labels, Props, Stage, Timers, Workspace - each has its own protobuf message type

## 3. Presentation (.pro) Deep Structure

```
Presentation
├── applicationInfo: { platform: 2 (WIN32), versionNumber: 26200 }
├── uuid
├── name: "Song Title"
├── background: { color | gradient }
├── selectedArrangement: UUID
├── arrangements[]: { uuid, name, groupIdentifiers[] }
├── cueGroups[]: { group: { uuid, name, color }, cueIdentifiers[] }
├── cues[]: Cue
│   ├── uuid, name, isEnabled
│   ├── completionTargetType (NONE/NEXT/RANDOM/CUE/FIRST)
│   ├── completionActionType (FIRST/LAST/AFTER_ACTION/AFTER_TIME)
│   └── actions[]: Action
│       ├── uuid, name, isEnabled
│       ├── type: 11 (ACTION_TYPE_PRESENTATION_SLIDE) ← REQUIRED for slides
│       └── slide: { presentation: PresentationSlide }
│           ├── baseSlide: Slide
│           │   ├── elements[]: Slide.Element (see §4)
│           │   ├── backgroundColor
│           │   ├── size: { width: 1920, height: 1080 }
│           │   └── uuid
│           ├── notes: { rtfData, attributes }
│           └── chordChart
├── ccli: { songTitle, author, publisher, copyrightYear, songNumber }
├── transition: { duration, effect }
└── contentDestination: GLOBAL (0) or ANNOUNCEMENTS (1)
```

### Action Types (field 9)
| Value | Constant | Description |
|-------|----------|-------------|
| 0 | UNKNOWN | |
| 1 | STAGE_LAYOUT | Change stage display |
| 2 | MEDIA | Trigger media |
| 3 | TIMER | Control timer |
| 4 | COMMUNICATION | MIDI/GVG/Sony BVS |
| 5 | CLEAR | Clear layer |
| 6 | PROP | Show/clear prop |
| 7 | MASK | Apply mask |
| 8 | MESSAGE | Show message |
| 11 | PRESENTATION_SLIDE | **Display slide** |
| 12 | FOREGROUND_MEDIA | Foreground media |
| 13 | BACKGROUND_MEDIA | Background media |
| 14 | PRESENTATION_DOCUMENT | Reference another doc |
| 15 | PROP_SLIDE | Prop slide |
| 23 | MACRO | Trigger macro |
| 24 | CLEAR_GROUP | Clear group |
| 25 | CAPTURE | Start/stop capture |

## 4. Slide Element Structure

Each slide contains an array of `Slide.Element` objects:

```
Slide.Element
├── element: Graphics.Element
│   ├── uuid
│   ├── name
│   ├── bounds: { origin: {x, y}, size: {width, height} }
│   ├── rotation, opacity, locked
│   ├── path: { closed, points[], shape: { type: RECTANGLE(1) } }
│   ├── fill: (oneof)
│   │   ├── color: { red, green, blue, alpha }
│   │   ├── gradient: { type, angle, stops[] }
│   │   ├── media: Media (image/video - see §5)
│   │   └── backgroundEffect: { blur | invert }
│   │   └── enable: bool (REQUIRED true for media fill)
│   ├── stroke: { style, width, color, enable }
│   ├── shadow: { style, angle, offset, radius, color, opacity, enable }
│   ├── feather: { style, radius, enable }
│   ├── text: Graphics.Text
│   │   ├── attributes: { font, capitalization, underline, paragraphStyle, ... }
│   │   ├── shadow
│   │   ├── rtfData: bytes (RTF-encoded text)
│   │   ├── verticalAlignment: TOP(0)/MIDDLE(1)/BOTTOM(2)
│   │   ├── scaleBehavior: NONE(0)/ADJUST_HEIGHT(1)/SCALE_DOWN(2)/SCALE_UP(3)/UP_DOWN(4)
│   │   ├── margins: { left, right, top, bottom }
│   │   └── chordPro: { enabled, notation, color }
│   └── flipMode, hidden, textLineMask
├── info: uint32 (Element.Info flags)
│   ├── 0 = INFO_NONE (regular element)
│   ├── 1 = IS_TEMPLATE_ELEMENT (background/template image)
│   ├── 2 = IS_TEXT_ELEMENT (editable text zone)
│   ├── 3 = TEXT_ELEMENT + also lyrics target
│   └── 4 = IS_TEXT_TICKER
├── buildIn, buildOut (transitions per element)
├── revealType: NONE/BULLET/UNDERLINE
├── dataLinks[]: data-driven content (timers, clocks, RSS, etc.)
├── childBuilds[]
└── textScroller: { scrollRate, shouldRepeat, repeatDistance, direction }
```

### Element Info Values Explanation
- **info: 0** = Plain element (placeholder, decoration)
- **info: 1** = Template element (IS_TEMPLATE_ELEMENT) - background image marked as part of theme
- **info: 2** = Text element (IS_TEXT_ELEMENT) - editable text zone in theme editor
- **info: 3** = Text element + text target - the main lyrics/content text area (2+1=3 is a bitmask)

### Typical Themed Song Slide Elements (3 elements)
1. **info: 3** — Lyrics text (positioned where theme defines, has RTF content)
2. **info: 0** — Empty full-screen text placeholder (1920x1080)
3. **info: 1** — Background image (IS_TEMPLATE_ELEMENT, full-screen, media fill with theme image)

### Typical Bible Verse Theme Elements (3 elements in BIBLE theme)
1. **info: 2** — Main verse text body (positioned inside content area)
2. **info: 2** — Verse reference text (smaller, top area)
3. **info: 0** — Background image (no info flag, full-screen)

## 5. Media References

Media elements use the `rv.data.Media` message:

```
Media
├── uuid
├── url: URL
│   ├── absoluteString: "C:\...\Media\Assets\{uuid}{filename}"
│   ├── platform: 2 (WIN32)
│   └── local: { root: 10 (ROOT_SHOW), path: "Media/Assets/{uuid}{filename}" }
├── metadata: { format: "png" | "mp4" | ... }
└── (oneof TypeProperties)
    ├── image: { drawing: { naturalSize, customImageBounds, cropInsets, alphaType } }
    │           { file: { localUrl: same URL } }
    ├── video: { drawing, audio, transport, video: { frameRate, endBehavior } }
    ├── audio: { audio, transport }
    └── liveVideo: { videoDevice, audioDevice }
```

### URL Root Values
| Value | Constant | Meaning |
|-------|----------|---------|
| 0 | ROOT_UNKNOWN | |
| 1 | ROOT_BOOT_VOLUME | |
| 2 | ROOT_USER_HOME | |
| 3 | ROOT_USER_DOCUMENTS | |
| 10 | ROOT_SHOW | **PP data directory** (most common for assets) |
| 12 | ROOT_CURRENT_RESOURCE | |

### Media Asset Naming Convention
Files in `Media/Assets/` follow the pattern: `{slideUUID}{originalFilename}`
- Example: `0c377484-9fc9-4034-a278-4828595645e5Fichier 1.png`
- The UUID prefix is the **theme slide UUID** that uses this image
- PP copies theme assets from `Themes/{name}/Assets/` to `Media/Assets/` with UUID prefix

## 6. Theme (Template.Document) Structure

```
Template.Document
├── applicationInfo
└── slides[]: Template.Slide
    ├── baseSlide: Slide (same structure as presentation slides)
    │   ├── elements[]: see §4
    │   ├── backgroundColor
    │   ├── size: { width: 1920, height: 1080 }
    │   └── uuid ← THIS IS THE slideUuid used everywhere
    ├── name: "Diapositive du thème N"
    └── actions[]: Action (optional, e.g. media actions)
```

### Theme "Chant" - 6 slides
| Index | UUID | Elements | Description |
|-------|------|----------|-------------|
| 0 | 1eb424f0-... | 2 (info:2 + media) | Text area (y:835) + image "Fichier 6.png" |
| 1 | 0c377484-... | 2 (info:2 + media) | Text area (y:808) + image "Fichier 5.png" |
| 2 | c9c9aedb-... | 2 (info:2 + media) | Text area (y:816) + image "Fichier 4.png" |
| 3 | 1a960b52-... | 2 (info:2 + media) | Text area (y:842) + image "Fichier 3.png" |
| 4 | 614e9bfe-... | 1 (media only) | Image only "Fichier 2.png" (no text) |
| 5 | c44f0eb8-... | 1 (media only) | Image only "Fichier 1.png" (no text) |

**Note:** Theme files use `info: 2` (IS_TEXT_ELEMENT) for text zones. When PP applies a theme to a presentation, the resulting .pro file uses `info: 3` (IS_TEXT_ELEMENT + lyrics target). The media elements use relative paths (`Assets/Fichier X.png`) in the theme, but absolute UUID-prefixed paths in .pro files.

### Theme "BIBLE" - 16 slides
- 8 landscape + 8 portrait variants
- Each has 3 elements: text body (info:2) + reference text (info:2) + background image
- Models: MONTAGNE, OCEAN, GALAXIE, BLEU-MODERNE, CREME, SOMBRE, VIOLET, SUNSET, CLASSIQUE

## 7. RTF Text Format

PP stores all text as RTF (Rich Text Format) in the `rtfData` bytes field.

### RTF Structure
```
{\rtf0\ansi\ansicpg1252
  {\fonttbl\f0\fnil ArialMT;}
  {\colortbl;\red255\green255\blue255;\red255\green255\blue255;}
  {\*\expandedcolortbl;...}
  {\*\listtable}{\*\listoverridetable}
  \uc1\paperw28800\margl0\margr0\margt0\margb0
  \pard\li0\fi0\ri0\qc\sb0\sa0\sl192\slmult1\slleading0
  \f0\b\i0\ul0\strike0\fs200\expnd0\expndtw0
  \CocoaLigature1\cf1\strokewidth0\strokec1\nosupersub\ulc0\highlight2\cb2
  Lyrics text here\par
  \pard...(paragraph format repeated)...
  Next line here
}
```

### Key RTF Parameters
- `\fs200` = font size 200 half-points = 100pt
- `\sl192` = line spacing 192 twips
- `\b` = bold, `\b0` = not bold
- `\qc` = center aligned, `\ql` = left, `\qr` = right
- `\cf1` = text color index 1 from colortbl
- `\cb2` = background color index 2
- `\u233 ?` = Unicode character é (accent)

## 8. REST API (Port 12345)

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/version` | PP version, hostname, platform |

### Libraries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/libraries` | List all libraries [{uuid, name, index}] |
| GET | `/v1/library/{uuid}` | List items in library [{uuid, name, index}] |

### Themes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/themes` | All themes with slides [{id, slides[]}] |

### Playlists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/playlists` | List presentation playlists |
| GET | `/v1/playlist/{uuid}` | Get playlist items (headers, presentations, placeholders, cues) |
| GET | `/v1/media/playlists` | List media playlists |
| GET | `/v1/audio/playlists` | List audio playlists |

### Presentations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/presentation/active` | Current active presentation |
| GET | `/v1/presentation/{uuid}` | Get presentation by UUID |
| GET | `/v1/presentation/{uuid}/thumbnail/{cueIndex}` | Get slide thumbnail |
| POST | `/v1/presentation/active/focus/{cue}` | Focus slide |
| POST | `/v1/presentation/active/trigger/{cue}` | Trigger slide |

### Triggering
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/trigger/next` | Trigger next slide |
| GET | `/v1/trigger/previous` | Trigger previous slide |

### Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/status/slide` | Current + next slide text |
| GET | `/v1/status/layers` | Active layers (slide, media, props, etc.) |
| GET | `/v1/status/screens` | Screen configurations |

### Timers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/timers` | List all timers |

### Props, Messages, Macros
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/props` | List all props |
| GET | `/v1/messages` | List all messages |
| GET | `/v1/macros` | List all macros |

### Clear
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/clear/groups` | List clear groups |

### Stage
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/stage/layouts` | List stage layouts |

### Capture
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/capture/status` | Recording status |

### Transport
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/transport/presentation/current` | Current transport state |

### Video Inputs / Looks / Masks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/video_inputs` | List video inputs |
| GET | `/v1/looks` | List audience looks |
| GET | `/v1/masks` | List masks |

## 9. Current PP State (This Installation)

### Libraries
- **Default** (19 files): Bible verses with MONTAGNE theme
- **CHANTS** (1 file): Songs

### Playlists
- Par défaut (empty)
- Par défaut (1 item)
- CULTE (service order with headers: Avant le Culte, Démarage du Culte, etc.)
- 22-04-2026

### Themes
- **BIBLE** (16 slides, landscape+portrait, 10 background models)
- **Chant** (6 slides, each with different bottom-area text zone)
- **LETRA ANIMADA** (15 slides, text animation effects, no images)
- **Planche Résumé** (2 slides with summary layout)

### Screens
- Écran 1: 1920x1080 (audience)
- Écran: 1920x1080 (audience)

### Timers
- Compte à rebours du segment (5 min countdown)
- Compte à rebours avant le spectacle (countdown to 5:00 AM)
- Minuterie du jeu (15 min countdown)

### Props
- Pasteur GUILLAUME Guettey + 14 generic "Accessoire" props

### Clear Groups
- "Tout effacer" (clears all layers)

### Stage Layouts
- "Current + Next Text"

## 10. Proto Schema Files Reference

### Core Types
| File | Key Messages |
|------|-------------|
| `presentation.proto` | Presentation, CCLI, BibleReference, Arrangement, CueGroup, Timeline |
| `cue.proto` | Cue, CompletionTargetType, CompletionActionType |
| `action.proto` | Action (26+ action types), MediaType, ClearType, TimerType, etc. |
| `slide.proto` | Slide, Slide.Element, DataLink (40+ data link types), TextScroller |
| `graphicsData.proto` | Graphics.Element, Fill, Stroke, Shadow, Path, Text, Attributes |
| `presentationSlide.proto` | PresentationSlide (wraps Slide + Notes) |
| `template.proto` | Template.Document, Template.Slide |

### Media & URLs
| File | Key Messages |
|------|-------------|
| `graphicsData.proto` | Media, Media.ImageTypeProperties, Media.VideoTypeProperties |
| `url.proto` | URL, LocalRelativePath (Root enum with ROOT_SHOW=10) |

### Configuration
| File | Key Messages |
|------|-------------|
| `playlist.proto` | Playlist, PlaylistItem, PlaylistDocument |
| `timers.proto` | Timer, TimersDocument, Clock |
| `messages.proto` | Message, MessageDocument, Token, TokenValue |
| `stage.proto` | Stage.Layout, Stage.Document, ScreenAssignment |
| `macros.proto` | MacrosDocument, Macro, MacroCollection |
| `clearGroups.proto` | ClearGroupsDocument, ClearGroup |
| `effects.proto` | Effect, Transition, EffectVariable |
| `groups.proto` | Group, ProGroupsDocument |
| `labels.proto` | ProLabelsDocument |
| `propDocument.proto` | PropDocument, PropCollection |
| `propSlide.proto` | PropSlide |
| `screens.proto` | Screen, OutputDisplay, EdgeBlend |
| `proAudienceLook.proto` | ProAudienceLook, AudienceLookCollection |
| `background.proto` | Background (color or gradient) |

### API
| File | Key Messages |
|------|-------------|
| `proApiV1.proto` | NetworkAPI_v1 (root), all request/response types |
| `proApiV1Presentation.proto` | Presentation API (active, focused, trigger, thumbnail) |
| `proApiV1Trigger.proto` | Trigger API (cue, playlist, media, audio, next, previous) |
| Other proApiV1*.proto | Each module's API (Library, Theme, Timer, etc.) |

## 11. Key Implementation Notes

### Generating .pro Files
1. **Action type MUST be 11** (PRESENTATION_SLIDE) for PP to render slides
2. **RTF data** must be encoded as bytes (base64 in JSON representation)
3. **Media URLs** need both `absoluteString` AND `local: { root: 10, path: "relative" }`
4. **Fill.enable must be true** for media fills to render
5. **Fresh UUIDs** for every element, cue, group, arrangement, presentation

### Applying Themes
1. Read `Themes/{name}/Theme` as `Template.Document`
2. Select desired slide by index/UUID
3. Clone element structure (positions, fills, media refs)
4. Theme media paths are relative (`Assets/Fichier X.png`), in .pro they become `Media/Assets/{slideUUID}{filename}`
5. PP copies theme images to `Media/Assets/` with UUID prefix automatically
6. In theme: text elements use `info: 2`, in .pro: lyrics elements use `info: 3`
7. **Do NOT change element positions** — text goes where the theme defines it

### Reading Theme Directly (Better Approach)
Instead of scanning .pro files for templates, read the Theme file directly:
```javascript
const root = await protobuf.load('template.proto');
const TemplateDoc = root.lookupType('rv.data.Template.Document');
const buf = readFileSync('Themes/Chant/Theme');
const theme = TemplateDoc.toObject(TemplateDoc.decode(buf), { bytes: String });
const slide = theme.slides[1]; // slideUuid 0c377484...
// Clone slide.baseSlide.elements for each verse
```

## 12. MultiTracks.com Integration

### Overview
MultiTracks.com provides song resources (lyrics, chords, backing tracks) that integrate directly into ProPresenter since version 7.8. The integration uses an in-app search connected to MultiTracks' cloud service.

### Subscription Tiers & Features

| Tier | Price | Includes |
|------|-------|----------|
| **Chart Pro** | Part of subscription | Lyrics-only import (no chords), searchable catalog |
| **Chart Pro + PP Add-on** | Extra add-on | Lyrics + chords import, stage display chord overlay |
| **Chart Pro + PP Add-on + Cloud Pro Plus** | Extra | Above + MIDI automation (Production Cues) |
| **Individual Templates** | $5/song | Downloadable .pro files from website (PP6+) |
| **Stage Display Add-on** | Subscription | Smart chord transposition, stage display layout integration |

### Import Methods

1. **In-app Search (PP 7.8+)**: Settings > Integrations > MultiTracks login. Then search via toolbar or `File > Import > MultiTracks`. Requires active internet + valid subscription.
2. **Website Download**: Purchase individual .pro template files from multitracks.com, drag-and-drop into PP library/playlist. Works with PP6+, offline after download.

### Data Imported

**Chart Pro (lyrics only)**:
- Pre-formatted lyrics (1, 2, or 4 lines per slide)
- Song metadata (title, artist, album, artwork)
- Two arrangements: "Full Song" (all sections repeated) and "Master" (unique sections only)
- NO chord data, NO MIDI cue compatibility

**Stage Display Add-on (lyrics + chords)**:
- Everything above PLUS embedded chord data
- Chord formats: Chords, Numbers, Numerals, Solfege (switchable)
- Key transposition (all 12 keys)
- Capo chord options
- Stage display layout template ("MultiTracks Chords + Lyrics")
- MIDI Production Cue compatibility

**Website Templates (.pro files)**:
- Formatted lyrics + simple text chords in slide Notes section
- All 12 keys available as separate downloads
- Full Song + Master arrangements
- MIDI cue compatible
- Chords NOT transposable natively (static text)

### Protobuf Data Structures

```protobuf
// In presentation.proto — stored per-song in the .pro file
message Presentation {
  message MultiTracksLicensing {
    enum Subscription {
      SUBSCRIPTION_CHART_PRO = 0;   // Lyrics only
      SUBSCRIPTION_SLIDE_PRO = 1;   // Lyrics + chords + stage display
    }
    int64 song_identifier = 1;      // MultiTracks song ID
    string customer_identifier = 2; // User's MT account ID
    Timestamp expiration_date = 3;  // When the license expires
    Timestamp license_expiration = 4;
    Subscription subscription = 5;
  }
  
  MultiTracksLicensing multi_tracks_licensing = 21;
  string music_key = 22;  // Current key (e.g., "G", "Bb")
}

// In analyticsMultiTracks.proto — telemetry
message Import {
  Status chart_pro = 1;           // DISABLED/CANCELLED/ACTIVE
  Status propresenter_addon = 2;  // DISABLED/CANCELLED/ACTIVE
  bool charts_automation = 3;     // Whether MIDI cues were imported
  int32 lines = 4;                // Lines-per-slide setting used
}
```

### MIDI Automation (Production Cues)

MultiTracks' Playback app sends MIDI messages over the network to ProPresenter to auto-advance slides in sync with backing tracks.

- **Requires**: "Master" arrangement (unique sections, shorter slide count)
- **Lines-per-slide must match**: The cue file corresponds to a specific format (1/2/4 lines)
- **Network MIDI**: Playback sends MIDI Note messages to PP's configured MIDI input
- **Cloud sync**: Edited cues saved to MultiTracks Cloud, sync across devices

### Stage Display Layout

PP's Stage Editor has a "MultiTracks Chords + Lyrics" layout template with:
- Customizable chord color and text color
- Chord notation format selector (Chords/Numbers/Numerals/Solfege)
- Text boxes linked to current/next slide content
- Dynamic chord data rendered from embedded metadata (not static text)

### WorshipFlow Implementation Notes

To replicate MultiTracks-like features:
1. **Chord embedding**: Store chord data in slide elements or metadata (not just Notes)
2. **Arrangements**: Support "Full Song" vs "Master" arrangement generation
3. **Key transposition**: Store chords as intervals/degrees, render in any key
4. **Stage display**: Leverage PP's stage API to push chord+lyric content
5. **MIDI**: Not needed initially — WorshipFlow controls slides directly via REST API

## 13. SongSelect / CCLI Integration

### Overview
SongSelect (by CCLI) provides licensed song lyrics and metadata. ProPresenter integrates directly to search, import lyrics, and report usage for CCLI license compliance.

### Prerequisites
- Active CCLI license for the church/organization
- SongSelect subscription (Advanced tier recommended)
- "Show House of Worship Integrations" enabled in PP Settings > General

### Import Process

1. Open QuickSearch: toolbar Search button, `Ctrl+F`, or `File > Import > SongSelect`
2. Search by: title, author, keywords, or CCLI number
3. Preview lyrics in search results
4. Click "Import" — song added to PP library as a .pro file
5. Copyright metadata auto-filled from SongSelect data

### Data Imported per Song

| Field | Proto Field | Description |
|-------|-------------|-------------|
| Author | `Presentation.CCLI.author` | Song writer(s) |
| Artist Credits | `Presentation.CCLI.artist_credits` | Performing artist(s) |
| Song Title | `Presentation.CCLI.song_title` | Official title |
| Publisher | `Presentation.CCLI.publisher` | Publishing company |
| Copyright Year | `Presentation.CCLI.copyright_year` | Year of copyright |
| CCLI Song Number | `Presentation.CCLI.song_number` | Unique CCLI catalog number |
| Display flag | `Presentation.CCLI.display` | Whether to show copyright |
| Album | `Presentation.CCLI.album` | Album name |
| Artwork | `Presentation.CCLI.artwork` | Album artwork reference |

### Protobuf Structures

```protobuf
// In presentation.proto — stored in each .pro file
message Presentation {
  message CCLI {
    string author = 1;
    string artist_credits = 2;
    string song_title = 3;
    string publisher = 4;
    int32 copyright_year = 5;
    int32 song_number = 6;       // CCLI Song # (unique identifier)
    bool display = 7;            // Show copyright on slides?
    string album = 8;
    string artwork = 9;
  }
  
  CCLI ccli = 14;  // Field 14 in Presentation
}

// In ccli.proto — global PP settings (Configuration/CCLI file)
message CCLIDocument {
  enum DisplayType {
    DISPLAY_TYPE_FIRST_SLIDE = 0;
    DISPLAY_TYPE_LAST_SLIDE = 1;
    DISPLAY_TYPE_FIRST_AND_LAST_SLIDE = 2;
    DISPLAY_TYPE_ALL_SLIDES = 3;
  }
  
  ApplicationInfo application_info = 1;
  bool enable_ccli_display = 2;       // Master switch
  string ccli_license = 3;            // Church's CCLI license number
  DisplayType display_type = 4;       // When to show copyright
  Template.Slide template = 5;        // Copyright overlay template
}

// Copyright text layout with token system
message CopyrightLayout {
  message Token {
    TokenType token_type = 1;
    string text = 2;  // Static text for Text type, empty for dynamic types
  }
  
  enum TokenType {
    Text = 0;            // Literal text (e.g., "© ", " | ", "CCLI #")
    Artist = 1;          // → Presentation.CCLI.artist_credits
    Author = 2;          // → Presentation.CCLI.author
    Publisher = 3;       // → Presentation.CCLI.publisher
    Title = 4;           // → Presentation.CCLI.song_title
    CopyrightYear = 5;   // → Presentation.CCLI.copyright_year
    LicenseNumber = 6;   // → CCLIDocument.ccli_license (church's number)
    SongNumber = 7;      // → Presentation.CCLI.song_number
  }
  
  repeated Token tokens = 2;
}
```

### Copyright Display System

PP overlays copyright info on slides using a **token-based template**:

1. **Global settings** (`CCLIDocument`):
   - `enable_ccli_display`: Master on/off switch
   - `ccli_license`: Church's CCLI license number (e.g., "1234567")
   - `display_type`: Which slides show the overlay (first, last, first+last, all)
   - `template`: A `Template.Slide` defining the visual layout (font, size, color, position)

2. **Token system** (`CopyrightLayout`):
   - Active tokens on the left panel define what's shown
   - Example layout: `[Title] " - " [Author] " © " [CopyrightYear] " " [Publisher] " | CCLI License #" [LicenseNumber]`
   - Dynamic tokens pull from each song's `Presentation.CCLI` fields
   - `Text` tokens provide literal separators/labels
   - Default style: small white text, left-aligned at bottom

3. **Template editor**: Customize font, size, color, position of the copyright overlay

### CCLI Reporting

PP tracks song usage for CCLI compliance reporting:

- **Auto-reporting**: When enabled + SongSelect signed in, triggers once per day per song when a slide with a CCLI number is displayed
- **Manual reporting**: Export usage reports anytime from Settings > General > Reporting
- **Status indicators**:
  - 🟢 Green = Successfully auto-reported
  - 🟡 Yellow = Pending/in progress
  - 🔴 Red = Not signed in or offline
  - ⚪ White = Song used when auto-reporting was disabled

### SongSelect Analytics

```protobuf
// In analyticsImport.proto — telemetry for import behavior
message SongSelect {
  enum LineDelimiter {
    UNKNOWN = 0;
    LINE_BREAK = 1;       // Songs split on line breaks
    PARAGRAPH_BREAK = 2;  // Songs split on paragraph breaks
  }
  
  int32 template_slide_text_element_count = 1;
  bool import_into_playlist = 2;        // Imported directly to playlist?
  LineDelimiter line_delimiter = 3;      // How lyrics were split
  int32 line_delimiter_count = 4;        // Number of delimiters found
  bool did_open_edit_view = 5;           // User edited after import?
  multitracks.Import multitracks = 6;    // Combined MT analytics
}
```

### WorshipFlow Implementation Notes

To replicate SongSelect/CCLI features:
1. **CCLI metadata storage**: Add CCLI fields to Song model (author, publisher, copyright_year, song_number, artist_credits)
2. **Copyright display**: When generating .pro files, populate `Presentation.CCLI` fields so PP can overlay copyright using its built-in system
3. **CCLI license config**: Store church's CCLI license number in WorshipFlow settings
4. **Usage tracking**: Log when songs are sent to PP for CCLI reporting export
5. **SongSelect import**: Could implement direct SongSelect API access (requires CCLI partnership) or manual .usr/.txt file import
6. **Copyright tokens**: Use PP's token system — no need to render copyright ourselves, just fill in the CCLI metadata and let PP handle display

## 14. Planning Center Integration (PP's Built-in)

### Overview
ProPresenter has built-in Planning Center Online (PCO) integration for importing service plans. Understanding this helps WorshipFlow replicate/replace the workflow.

### Protobuf Structure

```protobuf
message PlanningCenterPlan {
  message PlanItem {
    enum PlanItemType {
      PLAN_ITEM_TYPE_ITEM = 0;    // Generic item
      PLAN_ITEM_TYPE_SONG = 1;    // Song with lyrics
      PLAN_ITEM_TYPE_MEDIA = 2;   // Media file
      PLAN_ITEM_TYPE_HEADER = 3;  // Section header (e.g., "Worship", "Message")
    }
    
    message SongItem {
      message Sequence {
        uint32 pco_id_num = 1;
        string name = 2;
        repeated string group_names = 3;  // Ordered section names
      }
      
      uint32 pco_id_num = 1;
      uint32 arrangement_id_num = 2;
      Presentation.CCLI ccli = 3;          // CCLI data from PCO
      Sequence sequence = 4;               // Song arrangement
    }
    
    PlanItemType item_type = 1;
    string name = 5;
    repeated Attachment attachments = 6;
    SongItem linked_song = 8;              // Only for SONG type
  }
  
  uint32 plan_id_num = 1;
  string series_title = 3;
  string plan_title = 4;
  string date_list = 5;
  repeated PlanItem items = ...;  // Service order items
}
```

### What PP Imports from PCO
- Service plan structure (headers, songs, media, items)
- Song arrangements with section ordering (`group_names`)
- CCLI metadata per song
- File attachments (linked by URL)
- Plan dates and series titles

### WorshipFlow Advantage
WorshipFlow replaces this entire flow:
- Service planning is built-in (no external service)
- Songs are managed locally with full control
- Direct .pro file generation (no import delay)
- Real-time PP control via REST API
- No PCO subscription needed
