/** Shape of every configurable parameter. Rendered verbatim by /a/config. */
export interface ConfigParameter<T = string | number | boolean> {
  key: string;
  group: ConfigGroup;
  label: string;
  value: T;
  unit?: string;
  citation: string;
  effectiveFrom: string;
  changedBy: string;
  previousValue?: T;
  note: string;
}

export type ConfigGroup =
  | 'sla'
  | 'payment'
  | 'eligibility'
  | 'evaluation'
  | 'gate'
  | 'pilot'
  | 'data'
  | 'procurement';

export interface PolicyCitation {
  id: string;
  short: string;
  full: string;
  effectiveFrom: string;
}
