# 🎵 Music Groover  
### Smart, Element-Specific Humanization for Drum MIDI

Music Groover is a tool that takes perfectly quantized (on-grid) drum MIDI and transforms it into expressive, natural-sounding grooves using intelligent timing offsets, swing, and human-style micro-variations.

---

## 🚧 0. Core Problem Being Solved
Quantized MIDI sounds too robotic. Music Groover delivers smart, element-specific humanization to restore feel, groove, and musicality.

---

## 📘 1. Project Overview

Music Groover takes quantized drum MIDI and outputs:

- Humanized MIDI with intelligent timing shifts per drum element  
- Optional velocity humanization  
- Optional track-delay presets for DAWs  
- UI controls for adjusting “feel” or “humanity”  

This helps producers create realistic, expressive drum grooves consistent with best practices from top session drummers and electronic producers.

---

## 📥 2. Input & Output

### **2.1 Input**
- Standard MIDI file (type 0 or type 1)  
- Must contain drum notes (GM mapping or custom user mapping)

### **2.2 Output**
- Modified MIDI file with humanized timing shifts applied

---

## 🥁 3. Element-Specific Timing Humanization

### **3.1 Baseline Timing Rules**

| Drum Element | Humanization Behavior |
|--------------|------------------------|
| **Kick** | Very tight ±2–6 ms. Avoid early hits unless intentional. |
| **Snare** | ±5–12 ms; backbeats typically slightly late (+3–10 ms). |
| **Hi-Hat** | ±5–20 ms; often late to create pocket. |
| **Percussion** | ±10–30 ms with swing tendencies. |
| **Toms** | Early or on time depending on fill. |
| **Rides** | ±5–15 ms; jazz rides swing more. |

### **3.2 Humanization Modes**
- Groove (intentional micro-delays)  
- Loose (more variance)  
- Tight (subtle shifts)  

#### **Producer Modes**
- LA Pocket (snares late, hats late)  
- UK Garage Shuffle (16th swing, hat stagger)  
- Funky Swung (heavy hat drag + snare delay)  
- Straight but Human (low variance)

Additional:
- Optional DAW-style grid preview  
- Optional per-track delay values (ms)

---

## 🎼 4. Swing & Shuffle Engine

Supports non-uniform swing patterns:

- 16th swing (80%, 62%, etc.)  
- 8th swing  
- Custom per-drum swing (e.g., hats swung, kicks straight, snares slightly late)

---

## 🎚️ 5. Preset System

Users can save/load profiles containing:

- Timing ranges per element  
- Swing settings  
- Randomness seed  
- Track delays  

### **Built-In Presets**
- Human Drummer  
- Tight Pop  
- LA Late Snare  
- UKG Shuffle  
- Organic Hat Jitter  
- Techno 2→4 Snare  
- Producer “Signature” templates  

---

## 🎯 6. Nudge Tool (Per-Note Shifts)

- Clickable ±1, ±3, ±5, ±10 ms nudges  
- Apply per note type or per selection  
- “Random Nudge” applies light jitter around selected values  

---

## 🖥️ 7. App UI Requirements

### **Main Screen Sections**

#### **File Input**
- Drag & drop MIDI  
- Mapping screen (GM or custom)

#### **Humanization Controls Panel**
- Per-drum timing sliders  
- Swing selector  
- Track delay controls  

#### **Groove Preview Panel**
- Horizontal scrollable MIDI-editor-style grid  
- Animated notes when humanized  

#### **Export**
- Export MIDI  
- Export groove profile JSON  

---

## 🧠 8. Humanization Algorithms

### **8.1 High-Level Algorithm**

For each note event:
1. Identify drum type  
2. Retrieve timing rules  
3. Apply:  
   - Base delay offset  
   - Swing offset  
   - Random jitter  
   - Track delay  
4. Constrain max deviation:  
   - Kick ≤ 6–10 ms  
   - Snare ≤ 12 ms  
   - Hat ≤ 20–25 ms  
5. Output adjusted timestamp

### **8.2 Swing Algorithm**

