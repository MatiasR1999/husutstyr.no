// Diagram keys live here rather than with the components, so the content schema can validate a reference
// without pulling rendering code into the database layer. A revision can only name a diagram that exists.
export const diagramKeys = ['luftfuktighet-arsgang', 'induksjon-mot-keramisk', 'panne-varmefordeling',
  'ventilasjonstyper', 'vaskemiddel-ph', 'filter-forbigang', 'vasketemperatur-avveining',
  'hylle-innfesting', 'trommel-varmevei'] as const;
export type DiagramKey = (typeof diagramKeys)[number];
