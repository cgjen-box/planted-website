# Planted Website — Schoolcraft Implementation Guide

## Übersicht

Diese Anleitung beschreibt alle fehlenden Elemente, um der Website die "Schoolcraft-Persönlichkeit" zu geben. Die aktuelle Implementation ist technisch gut, aber es fehlt der freche, selbstbewusste, meta-ehrliche Charakter der Marke.

---

## 🔴 Priorität HOCH

### 1. Meat Lover Ticker

**Position:** Direkt unter der Navigation (vor dem Hero)

**Was es ist:** Ein durchlaufender lila Ticker mit echten Zitaten von Fleischessern, die überzeugt wurden.

**Warum wichtig:** 
- Sofortiger Social Proof
- Zeigt dass die Zielgruppe Fleischesser sind, nicht Veganer
- Setzt den Ton für die ganze Seite

**Siehe:** `planted-schoolcraft-components.html` → Section "MEAT LOVER TICKER"

---

### 2. Hero Section — Copy & TV Set

**Aktuelle Headline:** "Die Zukunft des Fleisches" ❌  
**Neue Headline:** "Wir machen Fleisch." + "Nur halt ohne das Tier." ✅

**Änderungen:**

| Element | Alt | Neu |
|---------|-----|-----|
| Headline | Die Zukunft des Fleisches | Wir machen Fleisch. |
| Subline | Pflanzenbasiert. Swiss-made... | Nur halt ohne das Tier. |
| Whisper | — | (Das klingt einfacher als es ist. Aber nach 6 Jahren Tüfteln haben es sogar Fleischliebhaber abgenommen.) |

**Video-Präsentation:**
Das Video sollte in einem "Retro TV" Frame präsentiert werden mit:
- Schwarzer Rahmen mit abgerundeten Ecken
- Rote LED oben (mit Glow)
- Zwei Drehknöpfe unten
- "planted.tv" Label

**Annotation-Karte** (schwebt rechts oben am TV):
```
🎬
Ja, wir zeigen dir ein Video von brutzelndem Essen. 
Das ist quasi Manipulation. 
Aber es ist auch einfach die Wahrheit.
— Das Marketing-Team
```

**"Beweisstück A"** Label mit Pfeil → zeigt auf den TV

**Siehe:** `planted-schoolcraft-components.html` → Section "HERO WITH TV SET"

---

### 3. Newsletter Section — Copy

**Aktuelle Copy:** "Hungrig nach mehr?" ❌

**Neue Copy:**

```
Headline: Okay, hier kommt die Newsletter-Anmeldung.

Subline: Du weisst wie das funktioniert. Wir fragen nach deiner E-Mail. 
Du überlegst ob wir dich zuspammen werden.

Unser Versprechen:
✅ Rezepte, die tatsächlich funktionieren
✅ Neue Produkte bevor sie im Regal stehen
✅ Gelegentlich ein schlechter Witz
❌ Keine täglichen E-Mails. Wir haben auch anderes zu tun.

Fine-Print: Du kannst dich jederzeit abmelden. 
Wir werden dann leise weinen, aber wir werden dich in Ruhe lassen.
```

**Siehe:** `planted-schoolcraft-components.html` → Section "NEWSLETTER"

---

## 🟡 Priorität MITTEL

### 4. Impact Section — Storytelling

**Hinzufügen — Intro vor den Zahlen:**
```
Okay, jetzt wird's kurz ernst.
(Keine Sorge, nur 30 Sekunden, dann sind wir wieder lustig.)
```

**Kontext unter jeder Zahl hinzufügen:**

| Zahl | Kontext-Text |
|------|--------------|
| 73% weniger CO₂ | Das entspricht etwa 12 Autofahrten von Zürich nach Bern. Pro Packung. Wir haben's nicht erfunden, das haben Wissenschaftler berechnet. |
| 90% weniger Wasser | Genug, um 47 Mal zu duschen. Nicht dass du weniger duschen solltest. Bitte nicht. |
| 0 Tiere | Klingt simpel. Ist es auch. Keine versteckten Fussnoten. Versprochen. |

**Quelle hinzufügen:**
```
Quelle: Unabhängige Ökobilanz-Studie. Wir haben's nicht selbst erfunden.
→ Die ganze nerdy Analyse lesen
```

**Siehe:** `planted-schoolcraft-components.html` → Section "IMPACT"

---

### 5. Product Hover Texts

Jede Produkt-Karte braucht einen Hover-Text der von unten einslided:

| Produkt | Hover-Text |
|---------|------------|
| planted.chicken Nature | Das Huhn, das nie eines war. |
| planted.chicken Lemon Herbs | Zitrone trifft Kräuter trifft kein-Huhn. |
| planted.chicken Jerusalem Style | Tel Aviv auf dem Teller. |
| planted.chicken Crispy Strips | Knusprig wie Nuggets. Besser als Nuggets. |
| planted.chicken Burger | Der Burger der dich anlügt. Auf die gute Art. |
| planted.steak Classic | Für alle, die dachten: "Steak geht doch nicht pflanzlich." |
| planted.steak Paprika | Medium-rare? Geht auch pflanzlich. |
| planted.kebab Original | 3 Uhr nachts. Ohne Reue danach. |
| planted.pulled BBQ | Pulled ohne Schwein. Schmeckt wie texanischer Sommer. |
| planted.pulled Spicy Herbs | Scharf. Kräutrig. Schweinefrei. |
| planted.schnitzel Wiener Art | Sogar die Grossmutter gibt zu: fast wie damals. |
| planted.schnitzel Classic | Schnitzel ohne Kalb. Gleiche Panade. |
| planted.bratwurst Original | Der Grill weiss nicht, dass es pflanzlich ist. |
| planted.bratwurst Herbs | Kräuter-Brat. Ohne Brat. |
| planted.duck Asian Style | Peking-Ente. Ohne Ente. |
| planted.skewers Herbs | Spiessig im besten Sinne. |
| planted.skewers Tandoori | Indien ruft. Das Huhn bleibt daheim. |
| planted.filetwürfel Classic | Würfel ohne Opfer. |
| planted.filetwürfel A La Mexicana | Fiesta ohne Fleisch. |
| planted.burger Crispy | Knusper-Patty mit reinem Gewissen. |
| planted.nuggets Classic | Chicken McNobody. |

**CSS für Hover-Effekt:** Siehe Components HTML

---

### 6. Ambassador Section — Schoolcraft Touch

**Hinzufügen oben (als Badge/Bubble):**
```
😳 Ja, wirklich. DER Christian Stucki.
```

**Hinzufügen unten (als Kontext-Box):**
```
Ein 150-Kilo-Schwingerkönig, der pflanzlich isst. 
Wenn das kein Beweis ist, wissen wir auch nicht.
```

**Hinzufügen:**
```
Christians Favorit: 🥩 planted.steak [Button/Link]
```

**Siehe:** `planted-schoolcraft-components.html` → Section "AMBASSADOR"

---

## 🟢 Nice to Have

### 7. Navigation Hover-Hints

Bei Hover über Nav-Links erscheint ein kleiner Tooltip darunter:

| Link | Hover-Hint |
|------|------------|
| Produkte | Das gute Zeug |
| Rezepte | Kochen ohne Reue |
| Unsere Mission | Warum wir das machen |
| Finde uns | Wo du uns findest |

**Siehe:** `planted-schoolcraft-components.html` → Section "NAV HINTS"

---

### 8. Footer Easter Egg

Ein 🌱 Emoji im Footer, bei Hover erscheint:

```
Du hast uns gefunden! Hier ist ein Geheimnis: 
Der erste Prototyp schmeckte schrecklich. Wirklich schrecklich. 
Aber wir haben nicht aufgegeben. Und nach 347 Versuchen hatten wir's.
```

**Siehe:** `planted-schoolcraft-components.html` → Section "FOOTER EASTER EGG"

---

## Checkliste

- [ ] Meat Lover Ticker implementiert
- [ ] Hero Headline geändert zu "Wir machen Fleisch."
- [ ] Hero Subline geändert zu "Nur halt ohne das Tier."
- [ ] Hero Whisper hinzugefügt
- [ ] TV Set Frame um Video
- [ ] TV Annotation Karte
- [ ] "Beweisstück A" Label
- [ ] Newsletter Copy komplett ersetzt
- [ ] Impact Intro-Text
- [ ] Impact Kontext-Texte unter Zahlen
- [ ] Product Hover-Texts (alle 21 Produkte)
- [ ] Ambassador "😳 DER Christian Stucki"
- [ ] Ambassador Kontext-Box
- [ ] Ambassador Favorit-Link
- [ ] Nav Hover-Hints
- [ ] Footer Easter Egg

---

## Dateien

1. `planted-schoolcraft-components.html` — Alle HTML/CSS Snippets zum Copy-Paste
2. `planted-schoolcraft-implementation.md` — Diese Anleitung

Bei Fragen: Einfach melden!
