---
paths:
  - '{resources/js/components/admin/share-bar.tsx,resources/js/components/overview/delivery-bar.tsx,resources/js/components/analytics/devices-card.tsx}'
---

# Js Components Analytics

## Counts that partition a whole are a ShareBar, not a ranked list
admin/share-bar.tsx draws a part-to-whole bar plus a labelled legend. Two callers: DeliveryBar (five statuses summing to `requested`) and the traffic page's DevicesCard (desktop/mobile/tablet summing to visits). Each keeps its own vocabulary and ordering and shares only the drawing.

Use it whenever a handful of counts partition a total. A ranked list is for an open-ended ranking; for a composition it makes the reader work out the remainder, which is the bug it was extracted to fix in both places.

No chart library - a flex row of divs. Reaching for recharts to draw three rectangles would cost the async chunk for nothing.

Every segment is named in the legend, never carried by colour: --chart-1..5 are steps of one accent ramp whose order inverts in dark mode, so they separate a categorical split badly. `icon` swaps the legend dot for the segment's own glyph; `showShare` adds percentages, on for devices (the split IS the reading) and off for deliveries (the count is).

DevicesCard is lg:col-span-2 on purpose: five cards in a two-column grid leaves an orphan, and a wide short strip is the shape this data wants. Keep analytics-skeleton.tsx in step - four h-64 lists plus one short full-width block.
