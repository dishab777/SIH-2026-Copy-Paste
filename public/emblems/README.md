# Emblems

Two files belong here. Neither is committed to this repository. The build draws
a stand-in until they exist, and swaps to the real artwork the moment they do —
no code change, no restart beyond the usual reload.

    state-emblem-of-india.svg       (or .png)
    government-of-maharashtra.svg   (or .png)

Both extensions are tried, in that order, so save whichever format you were
given. `src/components/layout/Emblems.tsx` sizes them by height — 34px in the
bar, 30px in the government strip, 28px in the footer — so the source file only
needs to be at least 4x that tall and have a transparent background.

## Where each one appears

| File | Appears in |
| --- | --- |
| `state-emblem-of-india` | the centre of the government strip, standing alone |
| `government-of-maharashtra` | the right of the government strip, beside महाराष्ट्र शासन / Government of Maharashtra |

## Until they are here

The Union slot falls back to the national flag, drawn to the Flag Code's
proportions — 3:2, three equal bands, a navy chakra of twenty-four spokes at
three quarters of the white band. The state slot falls back to a dashed plate,
which reads as an empty slot on purpose.

## A note on use

The State Emblem of India may only be used by the authorities named in the
State Emblem of India (Prohibition of Improper Use) Act, 2005, and state
emblems are restricted comparably. That is why the artwork is a slot rather
than something committed here: supply it when the programme is entitled to
use it.
