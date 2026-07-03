# RA-SALES MASTER v1.4
## RedAssistance értékesítési ökoszisztéma — egységes gerinc

**Modul azonosító:** RA-SALES MASTER v1.4
**Státusz:** R1–R5 MIND LEZÁRVA · a rendszer önmagával konzisztens
**Dátum:** 2026.07.02
**Nyelv:** HU (belső) / RO (ügyfél felé)
**Cél:** A négy különálló értékesítési artefaktumot (Reality Index · PAZ · rövid PDF · teljes Manual) EGYETLEN, ellentmondásmentes rendszerré fűzni. Ez a dokumentum a **kánon** — minden felület (RI CTA, PAZ ajánlat, bemutatkozó lap, e-mail) innen származtatja a szövegét. Nulla drift.

---

## 0. RÖVID ÖSSZEFOGLALÓ

Négy artefaktum létezik, mindegyik önmagában koherens, de **két különböző dolgot mér**:

- **Diagnosztikai réteg** (Reality Index + PAZ) → *visszanyert termelést* mér (üres poszt, elveszett óra, alulárazás). Ígéret: `ore de manoperă recuperate`.
- **Szállítási réteg** (rövid PDF + teljes Manual) → *rechemare*-t mér (ügyfél-visszahívás, carnet digital, heti lista). Ígéret: `clientul revine la timp`.

**A feloldás (a rendszer alaptézise):** ez nem két termék, hanem **egy oksági lánc két vége**.

> `rechemare (MECHANIZMUS) → clientul revine → umple postul gol → oră de manoperă recuperată (EREDMÉNY)`

A Manual a *hogyan*-t dokumentálja, a tool-lánc a *mennyit* méri. A hidegkapuban a termelési sokk horgászik (erősebb), a szállításban a rechemare teljesít (olcsóbb bizonyítani). **Egyetlen forrás, három ajtó.**

---

## 1. IDENTITÁS ÉS EGYSÉGES POZÍCIÓ

### 1.1 A cég

SC Szkaliczki Service SRL · Sângeorgiu de Mureș · CUI RO16250445 · Bosch Car Service partner.
A RedAssistance-t Ferenc Szkaliczki személyesen birtokolja. A SmartDevSolutions szerződéses fejlesztő — nem tulajdonos.

### 1.2 Az egy mondat — három regiszterben

Ez a hetek óta hiányzó „egy mondat". Nem versengenek: a hideg sokkol, a meleg megnyugtat, a belső mér.

**HIDEG (Reality Index CTA — sokk, hideg leadhez):**
> „Câți bani pierzi lunar când posturile stau goale? Află în 2 minute."

**MELEG (Manual 3. old. — ügyfél-arc, első beszélgetés):**
> „Red Assistance conectează proprietarul mașinii cu service-ul, ca istoricul să fie transparent, întreținerea semnalată la timp, iar clientul să revină în loc să dispară după reparație."

**BELSŐ (a tudásbázisba — a valódi ígéret, sosem ússzon el újra):**
> `rechemare (mechanizmus) → clientul revine → umple postul gol → oră de manoperă recuperată (eredmény)`

### 1.3 A pozicionálási szabály (a Manual 2. oldala szerint)

| Közönség | Domináns üzenet |
|---|---|
| Service (tulaj) | „clientul revine la timp" |
| Autótulajdonos | „istoricul e transparent, întreținerea nu se pierde" |
| Partner / hálózat | „strat digital de fidelizare, nu concurent de rețea" |

**Kockázat:** ha a hideg sokk (termelés) és a meleg üzenet (rechemare) között NINCS áthidalás, a prospekt csalást érez. Az áthidaló mondat KÖTELEZŐ a 2. etape-ban (lásd 5.2 sablon).

---

## 2. RENDSZERLOGIKA — a négy artefaktum egy gerincen

### 2.1 Az ökoszisztéma-térkép

```
HIDEG     Reality Index (Tükör)   → termelési SOKK, self-serve, tier A/B/C → abm_accounts
  │
MELEG     Manual 5. old.          → ÁTKERETEZÉS rechemare-ra (Prima discuție)
  │
AUDIT     PAZ + Manual 6. fej.    → KETTŐS pontozás: termelés (PAZ) + rechemare-készség (Manual)
  │
DÖNTÉS    PAZ + Manual 7. fej.    → decizia vânzătorului (Go / Amână / Stop)
  │
CONVINGERE PAZ OBJECTIONS + M.16  → kifogáskezelés + szkeptikus-lefegyverzés
  │
PILOT     Manual 9. fej.          → rechemare BIZONYÍTÉK, 30 nap (80 kontakt → 14.500 RON)
  │
MĂSURARE  Manual 12. fej.         → 3 minimum mutató: kontakt · răspuns · venit
  │
BŐVÍTÉS   RPW / ERP / RedRaktár   → a teljes termelési rendszer
```

### 2.2 A 8 etape → artefaktum leképezés

| Etape (Manual/PDF) | Reality Index | PAZ-B | Manual |
|---|---|---|---|
| 1. Prospectare | ✅ tier A/B/C + kemény kapu | fogadja a leadet | 4. fej. profil |
| 2. Prima discuție | átadás → `abm_accounts` | `leadPick` import | 5. fej. script |
| 3. Audit | teaser (RECOVER 49%) | ✅ `dc_` verify + PAZ 100p | ✅ 6.1–6.5 kérdések |
| 4. Decizia vânzătorului | — | ✅ `suggestDecision` | ✅ 7. fej. |
| 5. Convingere | — | ✅ `OBJECTIONS` (8) | ✅ 8., 16. fej. |
| 6. Pilot | — | ✅ `pilotStart` | ✅ 9. fej. (30 nap) |
| 7. Măsurare | — | ✅ 30/60/90 | ✅ 12. fej. |
| 8. Contract | — | ✅ `salesAccept` | ✅ 18. fej. |

**Olvasat:** a Reality Index az 1–2. etape gépi horgásza; a PAZ a 3–8. etape digitális motorja; a Manual a humán módszertan, amit a PAZ operacionalizál.

---

## 3. KOCKÁZATOK — az öt illeszkedési rés (döntést igényel)

Minden résnél: ajánlott feloldás + Ferenc kalibrálása.

| # | Rés | Következmény | Ajánlott feloldás | Ferenc döntése |
|---|---|---|---|---|
| R1 | PAZ nem auditálja a Manual 6.2 rechemare-blokkját | PAZ-„elite" partner megbukhat a valódi piloton | PAZ-ba 3 rechemare-készség mező + `canRunPilot` kapu (lásd 4.2) | ✅ **ZÁRVA** — PAZ v13 + RI v12-door5 |
| R2 | Két KPI-készlet nincs összekötve | RI termelési számot ígér, a pilot rechemare-számot bizonyít | KPI-híd arány (lásd 5.3) | ✅ **ZÁRVA** — PAZ v14 `bridgeKPI()` |
| R3 | Pilot-hossz: PAZ = 90 nap, Manual = 30 nap | A rendszer önmagával ellentmond | PAZ → 30 belépő + 90 hosszabbítás | ✅ **ZÁRVA** — PAZ v15, döntés: marad 30 |
| R4 | A Manual prózában újraépíti a Prospectare-t (RI) és a CRM-et | Duplikáció, drift-forrás | Manual 4. + 17. fej. → tool-hivatkozás | ✅ **ZÁRVA** — lásd 4.5 (RO bekezdések) |
| R5 | Négy pontrendszer fut | Négy versengő nyelv ugyanarra | Hierarchia: RI tier → PAZ (kánon) → Manual 0–12 nyugdíj (lásd 4.3) | ✅ **ZÁRVA** — 4.3 formalizálva |

**R1 a legkritikusabb:** a Manual pilotja rechemare-alapú (kontakt → programare → venit), de a PAZ csak termelést pontoz. A Manual 5. audit-blokkja (*„cine gestionează mesajele"*) és 6.2 blokkja a valódi pilot-belépő — **e nélkül a pilot nem futtatható, akármekkora a PAZ termelési pontszám.**

---

## 4. HANDOFF-KONTRAKTUSOK ÉS SCORING (a rendszer gerince)

### 4.1 Reality Index → abm_accounts → PAZ (mezőszintű átadás)

A PAZ már MA olvassa: `env.reality`, `env.lead_email`, `env.paz_status`, `env.ts`.
A tiszta kézfogáshoz az `abm_accounts` payloadból KÖTELEZŐEN átadandó:

```javascript
env.reality = {
  fit_tier,             // RI tier A/B/C → PAZ lead prioritás
  decizie,              // "AUDIT"|"FILTRAT" → lead_status seed
  durere_principala,    // q4 → PAZ hasPain elővételezés
  X_pierdut_anual,      // termelési rés → PAZ audit nyitó száma
  Z_recuperabil_anual,  // RECOVER 49% → a pilot ígért kerete
  profil_cumparator     // gain/pain ajtó → PAZ objection-nyelv
}
```

### 4.2 A PAZ rechemare-készség pilot-kapuja (R1 — LEZÁRVA, PAZ v13)

**Megvalósítási tény:** a rechemare-mezők MÁR léteztek a lead modellben — nem kellett új adatmodell, csak a kapu a meglévő mezőkre. A `canRunPilot()` a valós kód szerint:

```javascript
// PAZ v13 — canRunPilot(): a PILOT külön kapuja (a PARTNER-t a PAZ score qualifikálja)
canRunPilot(L) = L.has_followup_responsible === true   // NEVESÍTETT felelős a heti listához (Manual 6.5/8)
              && L.has_digital_customer_db  === true   // kontaktolható ügyfélbázis (Manual 6.1/1)
// L.has_callback_system  → ajánlott jelzés (Manual 6.2), NEM blokkol
```

A 6. lépésben (step6_visit) vizuális rechemare-készség csík + kapuzott „90 napos pilot indítása" gomb (letiltva + indoklás, ha a kapu nem teljesül) + backstop az onclick-ben. Fájl: `redassistance-paz-B_v13_R1.html`.

**Eredeti terv (megtartva referenciának — a mezők a fenti valós nevekre képződtek):**
```
dc_recall_operator  → has_followup_responsible
dc_contactable_base → has_digital_customer_db
dc_recall_system    → has_callback_system (ajánlott)
```

### 4.3 A négy pontrendszer hierarchiája (R5 — LEZÁRVA)

Ezek NEM ugyanazt mérik — egymásra épülnek, nem versengenek:

```
1. RI fit_score (q1–q4) → tier A/B/C     ELŐREJELZÉS (audit előtti szándék)
2. PAZ dc_ verify (100p)                 HITELESÍTÉS (a bemenet igaz-e)
3. PAZ score (7 kat., 100p)              MINŐSÍTÉS (partner-érték)     ← KÁNON
4. Manual 0–12 pontozás                  NYUGDÍJ → csak terep-emlékeztető, nem külön nyelv
```

**Szabály:** ahol számot idézel, a PAZ 100p a hivatkozás. A Manual 0–12 marad a terepkártyán mint gyors emlékeztető, de az `abm_accounts`-ba a PAZ score kerül.

### 4.4 A PAZ kvalifikációs kapui = a Manual pilot-feltételei (ezt jól csinálta a kód)

| PAZ kapu | Manual megfelelője |
|---|---|
| `structureKnown` | „disciplină de date" |
| `hasMeans` (decident + will + canPay + operator) | 4. fej. „decident + persoană responsabilă" |
| `hasPain` (`lost_hours>0 ∨ processGap`) | 5. fej. „proprietarul vede pierderea" |

### 4.5 Manual tool-hivatkozások — anti-duplikáció (R4 — LEZÁRVA)

**A rés:** a Manual 4. (Prospectare) és 17. (CRM) fejezete prózában újraépíti azt, amit a toolok már csinálnak — a próza és a gép **külön él**, ezért driftel. **A szabály:** a Manual próza a *human-readable kritérium*, a tool a *végrehajtó* — a Manual hivatkozik a toolra, nem duplikálja.

**Beillesztendő a Manual 4. fejezet (Prospectare) végére (RO):**
> **Notă de sistem — automatizarea prospectării.** Profilul de mai sus este criteriul human-readable din spatele instrumentului. Pre-calificarea propriu-zisă o face **Reality Index**: tier A/B/C + poarta dură (≥4 oameni productivi ȘI ≥1,5M RON/an cifră). Leadul calificat trece automat în `abm_accounts` cu tier, `decizie` (AUDIT/FILTRAT) și durerea principală. Nu recalcula manual ce instrumentul deja a filtrat — folosește profilul doar ca listă de control a criteriilor.

**Beillesztendő a Manual 17. fejezet (Urmărire, CRM) elejére (RO):**
> **Notă de sistem — CRM-ul propriu-zis.** Datele minime de mai jos NU se țin într-un tabel separat: ele sunt deja capturate de instrumente. `abm_accounts` este CRM-ul (Reality Index scrie leadul; PAZ scrie statusurile de pipeline și scorul). Câmpurile de urmărire — scor, categorie, obiecție principală, următorul pas cu dată — sunt câmpuri PAZ, nu o fișă paralelă. Regula rămâne: **fiecare lead are un următor pas cu dată exactă** (niciodată „deschis"), dar el se notează în instrument, nu pe hârtie.

**Kánon-következmény:** ha a Manual prózája és a tool eltér → a **tool a valóság**, a Manual hivatkozik rá. A Manual frissítésekor a 4. és 17. fejezet csak a kritériumot írja le, a mechanikát nem.

---

## 5. COPY-PASTE-KÉSZ SABLONOK

### 5.1 Prospektálási profil (Manual 4. — RI kemény kapu-küszöbök)

```
JÓ VEVŐ:   ≥ 4 termelő ember · ≥ 1,5M RON/év forgalom · van recepciós/felelős ·
           visszatérő munkák (olaj/fék/klíma/ITP) · 50–100 autós teszt-lot indítható
PIROS:     „mindent fejben tartunk" · nincs post-lucrare felelős · nincs elérhető
           döntéshozó · csak ingyeneset akar · nem lát értéket a rechemare-ban
```

### 5.2 A veszteség-áthidaló mondat (2. etape — a Tükör eredménye UTÁN, RO)

> „Cifra din test arată banii care nu se produc când posturile stau goale. Dar de ce stau goale? De cele mai multe ori pentru că, după reparație, clientul dispare și nu mai e chemat la timp. Postul gol e simptomul — clientul necontactat e cauza. Auditul de 20 de minute arată unde se rupe lanțul, iar pilotul de 30 de zile îl reparăm pe partea cea mai ieftină: rechemarea."

### 5.3 A KPI-híd — termelési ígéret + rechemare-bizonyíték (R2 — LEZÁRVA, PAZ v14)

**Megvalósítási tény:** `bridgeKPI()` a PAZ v14-ben. 5 pilot-eredmény mező (Manual 27.) + a híd-arány + a záró mondat, a step6 pilot-blokkban. Xan-forrás: elsődleges az RI handoff (`L.ri_ref.Xan`), tartalék a PAZ éves termelési vesztesége (`lost_labor_potential*12`).

```javascript
// PAZ v14 — bridgeKPI(): a szerződést záró szám
Xan        = num(L.ri_ref.Xan) || (lost_labor_potential*12)   // RI teaser éves veszteség
XanMonthly = Xan / 12
ratio      = pilot_revenue / XanMonthly                       // havi visszanyerési ráta %
// pilot mezők: pilot_contacted · pilot_responded · pilot_scheduled · pilot_jobs · pilot_revenue
```

Záró mondat (a `bk.venit>0` esetén jelenik meg, RO/HU):
> „A 30 nap ennyit hozott vissza — csak a rechemare-karral, a legolcsóbbal. A termelési és árazási kar még nincs bekapcsolva."
> „Cele 30 de zile au recuperat X% — doar cu pârghia rechemare, cea mai ieftină. Pârghia de producție și de preț nici nu e pornită încă."

**Referencia-képlet (megtartva):**
```
RI teaser (éves):        X_pierdut_anual                → "évi ~X RON folyik el"
Pilot bizonyíték (30 nap, Manual 27.):
   80 kontakt → 32 răspuns → 18 programare → 14 lucrare → 14.500 RON venit
Híd-arány:  pilot_venit ÷ (X_pierdut_anual ÷ 12) = havi visszanyerési ráta %
```

### 5.4 Szkeptikus-lefegyverzés (Manual 16. + a te öt kidobott szoftver történeted, RO)

> „Nu vă sun ca vânzător — și eu am aruncat vreo cinci programe din astea care promiteau marea cu sarea. Diferența e că ăsta l-am făcut pentru mine, în atelierul meu. Nu vă cer să credeți într-un sistem nou — vă propun să măsurăm 30 de zile dacă putem readuce clienți care altfel se pierd. Dacă nu produce rezultat, ce pierdeți în afară de un test limitat?"

### 5.5 Pilot-hossz javítás (R3 — PAZ kód)

```javascript
const PILOT_ENTRY_DAYS = 30;   // Etapa 6 belépő (Manual-konform, kockázatcsökkentés)
const PILOT_EXT_DAYS   = 90;   // validare extinsă (a mostani 30/60/90 ide csúszik)
```

---

## 6. KPI / KONTROLL — az átadási pontokon mérünk

| Mérőpont | Mit mér | Cél | Ha alacsony |
|---|---|---|---|
| RI → PAZ import | tier-A leadből élő audit | ≥ 40% | az átadási mondat/handoff szakad (5.2) |
| PAZ `canRunPilot` arány | auditból futtatható pilot | mérendő | R1 a szűk keresztmetszet — kell a rechemare-blokk |
| Pilot híd-arány | havi visszanyerési % | pozitív + növekvő | a lot/kommunikáció/felelős hibás (Manual 18.) |
| Kifogás-eloszlás | melyik OBJECTION-ön szakad | — | azt a választ élesítsd (PAZ OBJECTIONS) |

**Kontroll-riasztás:** ha egy RI tier-A rendre PAZ-ban „notready", VAGY PAZ-elite rendre `canRunPilot=false` → a diagnosztikai réteg rossz tengelyen szűr a szállításhoz képest. Ekkor kell az RI ötödik q4-ajtaja (rechemare-fájdalom) + a PAZ rechemare-blokk. A két rés EGYÜTT zár.

---

## 7. OPCIONÁLIS BŐVÍTÉSEK (a következő iterációkhoz)

1. ~~**RI ötödik q4-ajtó**~~ — ✅ **LEZÁRVA** (RI v12-door5). „Clienții dispar după reparație" mint ötödik diagnózis-opció (RO/HU), `Q4_TILT` = `[-1,1,-1,-1,-1]`, `DIAG_DOOR[4]` pain/gain, `{x}`=Xan átkeretezve (a rechemare mint az üres poszt OKA — MASTER 1.2). A rechemare-fájdalom mostantól a hidegkapuban is megjelenik, nem csak az auditban.
2. **abm_accounts pipeline-nézet** — egy view, ami egy leadet végigkövet RI tier → PAZ score → decision → pilot → sales státuszon; riaszt, ha egy lead `data_next_step` nélkül áll.
3. **Bemutatkozó lap** — a MASTER 1.2 három regiszteréből építve, egyetlen olvasóra (szerviztulaj) hangolva.
4. **CRAI-SALES tükör-modell összekötés** — a MASTER 5. etape (Convingere) bekötése a kalibrált 3+3 tükör-modellbe (KM v2.0), hogy a kifogáskezelés a belső döntési logikát kövesse.

---

## 8. KÁNON-SZABÁLY (a drift ellen)

Minden felület a MASTER-ből származtatja a szövegét:

- **RI CTA** → MASTER 1.2 HIDEG
- **Prima discuție script** → MASTER 1.2 MELEG + 5.2 áthidaló
- **PAZ ajánlat / objection** → MASTER 5.4 + 4.2
- **Bemutatkozó lap** → MASTER 1.2 három regiszter
- **E-mail audit után** → Manual 17. + MASTER 5.3 híd-arány

Ha egy felület szövege eltér a MASTER-től → a MASTER a helyes. A MASTER módosítása verziószám-emeléssel (v1.1, v1.2…) és changelog-gal történik.

---

## CHANGELOG

- **v1.4 (2026.07.02)** — R4 + R5 rés LEZÁRVA (dokumentációs, nem kód). **Mind az 5 rés zárva — a rendszer önmagával konzisztens.**
  - R4: 4.5 szakasz — Manual 4. + 17. fejezet tool-hivatkozó bekezdései (RO, copy-paste), anti-duplikáció szabály: a tool a valóság, a Manual hivatkozik rá.
  - R5: 4.3 formalizálva — pontrendszer-hierarchia (RI tier ELŐREJELZÉS → PAZ dc_ HITELESÍTÉS → PAZ score KÁNON → Manual 0–12 NYUGDÍJ). Ahol számot idézel: PAZ 100p.
  - **Élő állapot:** kód = PAZ v15 (R1+R2+R3) + Tükör v12-door5 (R1) · kánon = MASTER v1.4.
- **v1.3 (2026.07.02)** — R3 rés LEZÁRVA. Döntés: **belépő pilot = 30 nap** (marad), 60/90 nap opcionális hosszabbításként, 30/60/90 ellenőrzési ütem megtartva. `redassistance-paz-B_v15_R1-R2-R3.html` — minden belépő-pilot hivatkozás 90→30, státusz-kulcs egységesítve `"Pilot Active"`-ra. Szintaxis: `node --check` OK.
- **v1.2 (2026.07.02)** — R2 rés LEZÁRVA. `redassistance-paz-B_v14_R1-R2.html` — `bridgeKPI()` KPI-híd: 5 pilot-eredmény mező (Manual 27.) + havi visszanyerési ráta % + záró mondat a step6-ban. Xan-forrás: RI handoff elsődleges, PAZ éves veszteség tartalék. Szintaxis: `node --check` OK. Nyitott: R3 (pilot-hossz), R4 (Manual tool-hivatkozások), R5 (pontrendszer-hierarchia).
- **v1.1 (2026.07.02)** — R1 rés TELJESEN LEZÁRVA, élő kódban mindkét oldalon:
  - `redassistance-paz-B_v13_R1.html` — `canRunPilot()` pilot-kapu a meglévő audit-mezőkből (`has_followup_responsible` + `has_digital_customer_db`); vizuális rechemare-készség csík + kapuzott gomb. Szintaxis: `node --check` OK.
  - `redassistance-tukor-szuro_v12_R1-door5.html` — ötödik q4 diagnózis-ajtó (rechemare), `Q4_TILT` + `DIAG_DOOR[4]`, `{x}`=Xan átkeretezve. Szintaxis: `node --check` OK.
  - Következő nyitott: R2 (KPI-híd), R3 (pilot-hossz 90→30/90), R4 (Manual tool-hivatkozások), R5 (pontrendszer-hierarchia).
- **v1.0 (2026.07.02)** — Alapverzió. A négy artefaktum (Reality Index v11 · PAZ-B v12 · rövid PDF · teljes Manual) egy gerincre fűzve. 5 illeszkedési rés azonosítva, feloldással. Egységes pozíció három regiszterben.

---

*RA-SALES MASTER v1.0 — co-authoring dokumentum. A váz kész; a kalibráció (R1–R5 döntések + a számok/mondatok finomhangolása) Ferenc feladata. Archiválás: GitHub `redassistance` repo, Contents API (`create_or_update_file`).*
