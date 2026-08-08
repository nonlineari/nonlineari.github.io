# Optical Lattice Storage & Unfolding Mechanisms

Self-contained page for **iama.cc** (NLS RECORDS / nonlineari GitHub Pages).

Matches site design language:
- Background `#050505`
- Accent `#33F7DD`
- IBM Plex Sans / Mono
- Existing header, nav and footer structure

## Placement

```
optical-lattice/
├── index.html
├── assets/
│   ├── carrier.jpg
│   ├── desktop.jpg
│   ├── cockpit-dock.jpg
│   ├── cockpit-controls.jpg
│   ├── phone-unfold-seq.jpg
│   ├── phone-unfold.jpg
│   ├── network-cap2n.jpg
│   └── media-release.jpg
└── README.md
```

Drop the folder at the root of the site (or under `journal/optical-lattice/` if preferred).  
The page is immediately available at:

```
https://iama.cc/optical-lattice/
```

## Asset list

| File | Source diagram | Purpose |
|------|----------------|---------|
| `carrier.jpg` | Tesseract Crystal Memory Carrier | Core vision diagram |
| `desktop.jpg` | Integrated Laser Playback System | Desktop dock + signal path |
| `cockpit-dock.jpg` | Cockpit Retro-Fit Playback Unit | Vehicle dock view |
| `cockpit-controls.jpg` | Cockpit with live control class | ASR / Additive / Mobility displays |
| `phone-unfold-seq.jpg` | Phone unfolding sequence (3 stages) | Portable form factor |
| `phone-unfold.jpg` | Phone-back unfolding crystal carrier | Alternate phone sequence |
| `network-cap2n.jpg` | Network & CAP2N Architecture Layer | Metatronics + network |
| `media-release.jpg` | Media Release & Distribution Layer | Hierarchical workflow + Sator |

## Commit suggestion

```bash
git add optical-lattice/
git commit -m "Add Optical Lattice Storage & Unfolding Mechanisms page

La Crahc01 / CO-I-CO continuum presentation.
Crystal memory, Hellschreiber readout, metatronics,
unfolding form factors (desktop / cockpit / phone),
CAP2N network layer and media distribution workflow.
Matches site chrome and accent."
```

## Notes

- All images are already optimised for web.
- Page re-uses `/styles.css` and site header/nav.
- No external JS required beyond what the main site already loads.
- Text mode / terminal browsers can still reach the content via the existing text-mode banner pattern if desired later.
