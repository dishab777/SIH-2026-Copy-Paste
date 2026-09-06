/** Reference vocabulary. Real Indian problems, plausible fictional companies, no lorem ipsum. */

export const STATES = ['Maharashtra', 'Karnataka', 'Rajasthan'] as const;

/** The statutory forms an applicant entity can take, with the labels people use. */
export const ENTITY_TYPES: readonly { value: 'private_limited' | 'llp' | 'partnership' | 'proprietorship'; label: string }[] = [
  { value: 'private_limited', label: 'Private limited company' },
  { value: 'llp', label: 'Limited liability partnership' },
  { value: 'partnership', label: 'Registered partnership' },
  { value: 'proprietorship', label: 'Sole proprietorship' },
];

export const DISTRICTS: Record<string, string[]> = {
  Maharashtra: ['Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur'],
  Karnataka: ['Bengaluru Urban', 'Mysuru', 'Belagavi', 'Hubballi-Dharwad', 'Kalaburagi'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Kota', 'Udaipur', 'Bikaner', 'Ajmer'],
};

export const SECTORS = [
  'Water and sanitation',
  'Urban transport',
  'Agriculture',
  'School education',
  'Solid waste',
  'Revenue and taxation',
  'Health services',
  'Public works',
] as const;

export const CAPABILITIES = [
  'IoT sensors',
  'Computer vision',
  'Satellite imagery',
  'Acoustic analytics',
  'Route optimisation',
  'Predictive analytics',
  'Natural language processing',
  'Edge computing',
  'GIS mapping',
  'Telemetry',
  'Mobile field applications',
  'Drone survey',
  'Machine learning',
  'Speech recognition',
  'Digital twin',
  'Workflow automation',
] as const;

export const CERTIFICATIONS = [
  'ISO 27001',
  'SOC 2 Type II',
  'CERT-In empanelled audit',
  'ISO 9001',
  'STQC certification',
] as const;

/** Plausible fictional companies. None of these are real firms. */
export const STARTUP_NAMES: readonly [string, string][] = [
  ['AquaSense Technologies Private Limited', 'AquaSense'],
  ['Nirmal Flow Systems Private Limited', 'Nirmal Flow'],
  ['Setu Grid Analytics Private Limited', 'Setu Grid'],
  ['Kaveri Hydrolytics LLP', 'Kaveri Hydrolytics'],
  ['DhaaraTech Labs Private Limited', 'DhaaraTech'],
  ['Pravaah Instruments Private Limited', 'Pravaah'],
  ['Chalak Mobility Systems Private Limited', 'Chalak Mobility'],
  ['Marg Transit Intelligence Private Limited', 'Marg Transit'],
  ['Depot Nine Telematics Private Limited', 'Depot Nine'],
  ['Vahan Insight Analytics LLP', 'Vahan Insight'],
  ['Sanchaar Fleet Systems Private Limited', 'Sanchaar Fleet'],
  ['Khet Signal Agritech Private Limited', 'Khet Signal'],
  ['Parali Vision Systems Private Limited', 'Parali Vision'],
  ['Bhoomi Remote Sensing Private Limited', 'Bhoomi RS'],
  ['Ankur Crop Analytics LLP', 'Ankur Crop'],
  ['Fasal Drishti Technologies Private Limited', 'Fasal Drishti'],
  ['Vidya Track Learning Systems Private Limited', 'Vidya Track'],
  ['Shala Signal Analytics Private Limited', 'Shala Signal'],
  ['Padho Insight Private Limited', 'Padho Insight'],
  ['Nayi Disha Edutech LLP', 'Nayi Disha'],
  ['Kachra Vision Robotics Private Limited', 'Kachra Vision'],
  ['Swachh Sort Systems Private Limited', 'Swachh Sort'],
  ['ReCycle Matrix Private Limited', 'ReCycle Matrix'],
  ['Nirmalya Waste Analytics LLP', 'Nirmalya'],
  ['Saral Bhasha Systems Private Limited', 'Saral Bhasha'],
  ['Spashta Language Technologies Private Limited', 'Spashta'],
  ['Suchna Text Labs Private Limited', 'Suchna Text'],
  ['Sahaj Notice Systems LLP', 'Sahaj Notice'],
  ['Jeevan Route Health Private Limited', 'Jeevan Route'],
  ['Aarogya Dispatch Systems Private Limited', 'Aarogya Dispatch'],
  ['Prathmik Care Networks Private Limited', 'Prathmik Care'],
  ['Sanjeevani Response Labs LLP', 'Sanjeevani Response'],
  ['Yatra Flow Systems Private Limited', 'Yatra Flow'],
  ['Signal Sanchalan Technologies Private Limited', 'Signal Sanchalan'],
  ['Traffic Vyavastha Analytics Private Limited', 'Traffic Vyavastha'],
  ['Chowk Intelligence LLP', 'Chowk Intelligence'],
  ['Setu Inspect Robotics Private Limited', 'Setu Inspect'],
  ['Pul Drishti Systems Private Limited', 'Pul Drishti'],
  ['Asset Nirikshan Technologies Private Limited', 'Asset Nirikshan'],
  ['Drone Bharat Survey LLP', 'Drone Bharat'],
  ['Meter Sanchay Systems Private Limited', 'Meter Sanchay'],
  ['Vidyut Loss Analytics Private Limited', 'Vidyut Loss'],
  ['Urja Grid Labs Private Limited', 'Urja Grid'],
  ['Prakash Metering LLP', 'Prakash Metering'],
  ['Jal Nigrani Systems Private Limited', 'Jal Nigrani'],
  ['Boond Analytics Private Limited', 'Boond Analytics'],
  ['Sinchai Tech Private Limited', 'Sinchai Tech'],
  ['Talab Monitoring LLP', 'Talab Monitoring'],
  ['Kosh Revenue Systems Private Limited', 'Kosh Revenue'],
  ['Kar Sahayak Technologies Private Limited', 'Kar Sahayak'],
  ['Rajaswa Analytics Private Limited', 'Rajaswa Analytics'],
  ['Lekha Compliance LLP', 'Lekha Compliance'],
  ['Nagar Seva Platforms Private Limited', 'Nagar Seva'],
  ['Municipal Mind Systems Private Limited', 'Municipal Mind'],
  ['Sheher Data Works Private Limited', 'Sheher Data'],
  ['Basti Insight LLP', 'Basti Insight'],
  ['Suraksha Vision Systems Private Limited', 'Suraksha Vision'],
  ['Nigrani Edge Technologies Private Limited', 'Nigrani Edge'],
  ['Rakshak Sensor Labs Private Limited', 'Rakshak Sensor'],
  ['Chetna Safety Analytics LLP', 'Chetna Safety'],
];

export const PROBLEM_LIBRARY: readonly {
  title: string;
  sector: string;
  whoAffected: string;
  whatHappensToday: string;
  frequency: string;
  costToday: string;
  currentLimitations: string;
  baselineMetric: string;
  baselineValue: number;
  baselineUnit: string;
  method: string;
  sourceOfTruth: string;
  targetMetric: string;
  direction: 'decrease' | 'increase';
  magnitude: number;
  capabilities: string[];
  outcomeStatement: string;
}[] = [
  {
    title: 'Smart water leakage detection',
    sector: 'Water and sanitation',
    whoAffected:
      'About 3.4 lakh households on the eastern distribution zone, plus the 42 field crews who chase leaks by hand.',
    whatHappensToday:
      'A leak is usually noticed when a resident calls the ward office or when pressure drops enough to be visible. A crew is dispatched, walks the line with an acoustic rod, and isolates the section. On buried mains under carriageway the search can take a full shift.',
    frequency: 'Around 190 reported leaks a month across the zone, of which roughly 60 are on trunk mains.',
    costToday:
      'Non-revenue water in the zone is 34 percent. At the current bulk purchase rate this is about ₹4.1 crore a year of treated water that is produced and never billed.',
    currentLimitations:
      'District metering exists but readings are collected manually once a week. There is no continuous pressure telemetry below the reservoir outlet.',
    baselineMetric: 'Average time from leak occurrence to field crew locating it',
    baselineValue: 180,
    baselineUnit: 'minutes',
    method: 'Median of the ward complaint register timestamps against crew closure timestamps, sampled over 12 weeks.',
    sourceOfTruth: 'Ward complaint register and crew job cards, water supply department',
    targetMetric: 'Average leak detection time',
    direction: 'decrease',
    magnitude: 120,
    capabilities: ['IoT sensors', 'Acoustic analytics', 'Predictive analytics', 'GIS mapping'],
    outcomeStatement:
      'Cut the time between a leak starting and a crew standing over it, without adding staff to the zone.',
  },
  {
    title: 'Bus depot fuel pilferage',
    sector: 'Urban transport',
    whoAffected: 'Nine depots operating 1,240 buses, and the depot managers accountable for fuel variance.',
    whatHappensToday:
      'Fuel is issued against a manual indent at the depot pump. Reconciliation happens monthly against odometer readings, by which time the trail is cold.',
    frequency: 'Monthly reconciliation, with unexplained variance recorded in seven of the last nine cycles.',
    costToday: 'Unexplained diesel draw averages 3.8 percent of issue, roughly ₹2.6 crore a year across the nine depots.',
    currentLimitations:
      'Pumps have mechanical totalisers only. Odometer readings are entered by hand and are frequently rounded.',
    baselineMetric: 'Unexplained fuel draw as a share of total issue',
    baselineValue: 3.8,
    baselineUnit: 'percent',
    method: 'Monthly depot fuel reconciliation against kilometres operated, twelve-month trailing average.',
    sourceOfTruth: 'Depot fuel register and vehicle tracking logs',
    targetMetric: 'Unexplained fuel draw',
    direction: 'decrease',
    magnitude: 2,
    capabilities: ['IoT sensors', 'Telemetry', 'Predictive analytics', 'Edge computing'],
    outcomeStatement: 'Bring unexplained diesel draw down to a level the depot manager can investigate the same week.',
  },
  {
    title: 'Crop residue burning detection and response',
    sector: 'Agriculture',
    whoAffected: '11 tehsils, about 78,000 cultivators, and the district agriculture officers who must respond.',
    whatHappensToday:
      'Burning events are identified from satellite thermal anomalies published the next day. By the time a field team reaches the plot, the fire is out and attribution is disputed.',
    frequency: 'Roughly 2,100 detected events across the season, concentrated in a six-week window.',
    costToday:
      'Air quality penalties and health costs aside, the department spends about ₹90 lakh a season on field verification that arrives too late to act.',
    currentLimitations:
      'Satellite passes are twice daily and cloud cover blocks a quarter of the season. Plot-level attribution needs a field visit.',
    baselineMetric: 'Time from burning event to verified field response',
    baselineValue: 26,
    baselineUnit: 'hours',
    method: 'Median across the season of thermal anomaly timestamp to field verification form submission.',
    sourceOfTruth: 'District agriculture office verification register',
    targetMetric: 'Time to verified field response',
    direction: 'decrease',
    magnitude: 8,
    capabilities: ['Satellite imagery', 'Computer vision', 'GIS mapping', 'Mobile field applications'],
    outcomeStatement: 'Reach a burning plot while the evidence is still on the ground.',
  },
  {
    title: 'School dropout early warning',
    sector: 'School education',
    whoAffected: '612 upper primary schools and about 1.9 lakh enrolled children in the district.',
    whatHappensToday:
      'A child is recorded as a dropout after 30 consecutive days of absence. Intervention starts after that, when the family has usually already moved or the child has started work.',
    frequency: 'About 4,300 children crossed the 30-day threshold last academic year.',
    costToday:
      'Re-enrolment drives cost roughly ₹1.4 crore a year and recover under a third of those children.',
    currentLimitations:
      'Attendance is entered weekly and often in arrears. There is no signal that combines attendance with the other things schools already know.',
    baselineMetric: 'Share of at-risk children identified before 30 days of absence',
    baselineValue: 18,
    baselineUnit: 'percent',
    method: 'Retrospective comparison of intervention records against the eventual dropout register.',
    sourceOfTruth: 'District education management information system',
    targetMetric: 'Early identification rate',
    direction: 'increase',
    magnitude: 55,
    capabilities: ['Predictive analytics', 'Machine learning', 'Mobile field applications'],
    outcomeStatement: 'Find the child who is about to stop coming, while a teacher can still do something about it.',
  },
  {
    title: 'Dry waste segregation at source',
    sector: 'Solid waste',
    whoAffected: '1.1 lakh households in four wards and the 320 collection staff who sort by hand at the transfer point.',
    whatHappensToday:
      'Mixed waste arrives at the transfer station and is separated manually on a belt. Recyclable fraction is contaminated by the time it is picked.',
    frequency: 'Daily, roughly 96 tonnes across the four wards.',
    costToday:
      'Contaminated recyclables fetch about 40 percent less at auction. The ward loses close to ₹1.8 crore a year in realisable value and pays for manual sorting on top.',
    currentLimitations:
      'Segregation compliance is measured by spot inspection. There is no per-household record and no feedback to the household.',
    baselineMetric: 'Recyclable fraction recovered clean at the transfer point',
    baselineValue: 22,
    baselineUnit: 'percent',
    method: 'Weekly weighbridge and sort audit at the transfer station, eight-week rolling average.',
    sourceOfTruth: 'Transfer station weighbridge and sort audit register',
    targetMetric: 'Clean recyclable recovery',
    direction: 'increase',
    magnitude: 45,
    capabilities: ['Computer vision', 'Edge computing', 'Mobile field applications'],
    outcomeStatement: 'Recover more clean recyclable material without adding a sorting shift.',
  },
  {
    title: 'Tax notice language simplification',
    sector: 'Revenue and taxation',
    whoAffected: 'About 2.7 lakh property tax assessees receiving demand and default notices each year.',
    whatHappensToday:
      'Notices are generated from templates written in legal English and Marathi. Assessees visit the ward office to ask what the notice means, which is where most of the counter load comes from.',
    frequency: 'Roughly 2.7 lakh notices a year, with 41 percent generating a counter visit.',
    costToday:
      'Counter handling costs about ₹3.2 crore a year and delays collection by an average of 26 days per contested notice.',
    currentLimitations:
      'Templates cannot be changed without legal sign-off, and the legal position must survive translation into two languages.',
    baselineMetric: 'Share of notices generating a counter visit for clarification',
    baselineValue: 41,
    baselineUnit: 'percent',
    method: 'Counter visit register matched to notice reference numbers over a six-month window.',
    sourceOfTruth: 'Ward counter register and notice generation system',
    targetMetric: 'Counter visits for clarification',
    direction: 'decrease',
    magnitude: 22,
    capabilities: ['Natural language processing', 'Machine learning', 'Workflow automation'],
    outcomeStatement:
      'Write a notice an assessee can act on without visiting the ward office, without weakening its legal effect.',
  },
  {
    title: 'Ambulance dispatch routing',
    sector: 'Health services',
    whoAffected: '64 ambulances covering an urban and peri-urban area of about 41 lakh people.',
    whatHappensToday:
      'Dispatch is by nearest-vehicle radio call using a static zone map drawn in 2016. Crews route by local knowledge.',
    frequency: 'About 780 emergency calls a day.',
    costToday:
      'Median response time is 22 minutes against a 15-minute service standard. The gap is measured but not attributed.',
    currentLimitations:
      'Vehicle location is polled every 90 seconds. There is no live road-condition input and no way to model the effect of a reassignment.',
    baselineMetric: 'Median emergency response time',
    baselineValue: 22,
    baselineUnit: 'minutes',
    method: 'Call receipt timestamp to on-scene timestamp, median over 90 days, excluding inter-facility transfers.',
    sourceOfTruth: 'Emergency response centre call log',
    targetMetric: 'Median response time',
    direction: 'decrease',
    magnitude: 15,
    capabilities: ['Route optimisation', 'Predictive analytics', 'GIS mapping', 'Telemetry'],
    outcomeStatement: 'Get a vehicle on scene inside the service standard more often, with the fleet already in place.',
  },
  {
    title: 'Signal timing optimisation on arterial corridors',
    sector: 'Urban transport',
    whoAffected: 'About 6.2 lakh daily trips across 38 signalised junctions on three arterial corridors.',
    whatHappensToday:
      'Signal plans are fixed-time, revised roughly once a year from a manual count. Traffic police override plans manually at peak.',
    frequency: 'Continuous. Peak congestion twice daily on all three corridors.',
    costToday:
      'Average corridor travel time in peak is 31 minutes against 19 minutes off-peak. Fuel and time cost is estimated at ₹6.4 crore a year on these corridors alone.',
    currentLimitations:
      'Existing controllers accept plan changes but there is no vehicle detection at most junctions and no corridor-level coordination.',
    baselineMetric: 'Average peak travel time on the corridor',
    baselineValue: 31,
    baselineUnit: 'minutes',
    method: 'Probe vehicle travel time, weekday peak, averaged over eight weeks.',
    sourceOfTruth: 'Traffic police corridor survey and probe data',
    targetMetric: 'Peak corridor travel time',
    direction: 'decrease',
    magnitude: 24,
    capabilities: ['Computer vision', 'Route optimisation', 'Edge computing', 'Predictive analytics'],
    outcomeStatement: 'Move the same vehicles through the corridor faster in peak, using the controllers already installed.',
  },
  {
    title: 'Remote inspection of bridges and culverts',
    sector: 'Public works',
    whoAffected: '1,860 minor bridges and culverts, and the 24 assistant engineers responsible for inspecting them.',
    whatHappensToday:
      'Each structure is inspected visually once a year. Access to soffits and piers usually requires a boat or a ladder party, so many inspections are abbreviated.',
    frequency: 'Annual cycle, with about 30 percent of structures inspected only partially.',
    costToday:
      'Deferred defect detection has led to four emergency closures in three years, each costing between ₹40 lakh and ₹1.2 crore in emergency works and diversion.',
    currentLimitations:
      'Inspection is manual and its quality varies with access. Photographs are stored locally and not comparable year to year.',
    baselineMetric: 'Share of structures with a complete, comparable annual inspection record',
    baselineValue: 68,
    baselineUnit: 'percent',
    method: 'Audit of inspection records against the prescribed inspection proforma.',
    sourceOfTruth: 'Public works division inspection register',
    targetMetric: 'Complete inspection coverage',
    direction: 'increase',
    magnitude: 95,
    capabilities: ['Drone survey', 'Computer vision', 'Digital twin', 'GIS mapping'],
    outcomeStatement: 'Get a complete, comparable condition record for every structure, every year.',
  },
  {
    title: 'Primary health centre access for remote habitations',
    sector: 'Health services',
    whoAffected: 'About 2.3 lakh people in 340 habitations more than eight kilometres from a functioning centre.',
    whatHappensToday:
      'Outreach camps are scheduled quarterly on a fixed rotation drawn up at the block level, regardless of where need actually is.',
    frequency: 'Quarterly camps, about 1,360 a year across the district.',
    costToday:
      'Camp utilisation averages 44 percent of planned footfall. Roughly ₹2.1 crore a year is spent on camps that reach fewer people than planned.',
    currentLimitations:
      'Scheduling uses a paper rotation. There is no view of which habitations have unmet need in a given quarter.',
    baselineMetric: 'Outreach camp utilisation against planned footfall',
    baselineValue: 44,
    baselineUnit: 'percent',
    method: 'Camp attendance register against planned footfall, all camps, four quarters.',
    sourceOfTruth: 'Block health office camp register',
    targetMetric: 'Camp utilisation',
    direction: 'increase',
    magnitude: 70,
    capabilities: ['Predictive analytics', 'GIS mapping', 'Mobile field applications'],
    outcomeStatement: 'Put the camp where the unmet need is this quarter, not where the rotation says.',
  },
  {
    title: 'Street light fault detection and energy loss',
    sector: 'Public works',
    whoAffected: '48,000 street light points across 12 wards.',
    whatHappensToday:
      'Faults are reported by residents or found by a deep patrol. Energy is billed on connected load, not on consumption.',
    frequency: 'About 900 fault reports a month, with an average 9-day rectification time.',
    costToday: 'Estimated ₹5.7 crore a year billed for lights that were not burning, plus the safety cost of dark stretches.',
    currentLimitations: 'No point-level metering. Fault location depends on someone reporting the right pole number.',
    baselineMetric: 'Average fault rectification time',
    baselineValue: 9,
    baselineUnit: 'days',
    method: 'Complaint register timestamp to closure timestamp, six-month median.',
    sourceOfTruth: 'Electrical division complaint register',
    targetMetric: 'Fault rectification time',
    direction: 'decrease',
    magnitude: 3,
    capabilities: ['IoT sensors', 'Telemetry', 'Edge computing'],
    outcomeStatement: 'Know a light has failed before a resident tells you, and fix it inside a week.',
  },
  {
    title: 'Property tax assessment gap detection',
    sector: 'Revenue and taxation',
    whoAffected: 'About 4.1 lakh assessed properties and an unknown number of unassessed and under-assessed ones.',
    whatHappensToday:
      'Field surveyors re-measure properties on a rolling basis. A full cycle takes about seven years, by which time much of it is stale.',
    frequency: 'Rolling survey, roughly 58,000 properties a year.',
    costToday:
      'Independent sampling suggests 19 percent of properties are under-assessed, worth roughly ₹31 crore a year in foregone demand.',
    currentLimitations: 'Survey is manual and expensive. Imagery exists but is not tied to the assessment roll.',
    baselineMetric: 'Share of properties whose assessed area matches the built area within tolerance',
    baselineValue: 81,
    baselineUnit: 'percent',
    method: 'Independent physical audit of a stratified 1,200-property sample.',
    sourceOfTruth: 'Assessment roll and independent audit sample',
    targetMetric: 'Assessment accuracy',
    direction: 'increase',
    magnitude: 93,
    capabilities: ['Satellite imagery', 'Computer vision', 'GIS mapping', 'Machine learning'],
    outcomeStatement: 'Find the assessment gap from imagery, and send a surveyor only where it matters.',
  },
];

export const OFFICER_NAMES = [
  'R. Bhat',
  'S. Nair',
  'A. Deshmukh',
  'K. Iyer',
  'M. Chauhan',
  'P. Rathore',
  'V. Kulkarni',
  'N. Sharma',
  'T. Menon',
  'D. Patil',
  'L. Gowda',
  'H. Jain',
  'B. Reddy',
  'G. Solanki',
  'J. Fernandes',
  'U. Bhagat',
] as const;

export const EVALUATOR_NAMES = [
  'Dr. A. Ramanathan',
  'Dr. S. Mukhopadhyay',
  'Prof. N. Venkataraman',
  'Dr. P. Bhandari',
  'Dr. M. Sengupta',
  'Prof. R. Dsouza',
  'Dr. K. Vasudevan',
  'Dr. I. Qureshi',
  'Prof. L. Chandrasekhar',
  'Dr. Y. Sathe',
  'Dr. O. Mathew',
  'Prof. W. Barman',
] as const;

export const VALIDATOR_NAMES = [
  'Centre for Applied Measurement, Pune',
  'Institute of Public Systems Audit, Bengaluru',
  'State Technical Evaluation Cell, Jaipur',
] as const;

export const EVIDENCE_TYPES = [
  'Field test report',
  'Sensor calibration record',
  'Measurement dataset',
  'Site photograph set',
  'Acceptance test log',
  'Security scan report',
  'Training attendance record',
  'Integration test report',
] as const;

export const RISK_LIBRARY: readonly { title: string; category: 'delivery' | 'data' | 'security' | 'adoption' | 'legal' | 'financial'; mitigation: string }[] = [
  {
    title: 'Departmental data extract delayed beyond the agreed date',
    category: 'data',
    mitigation: 'Synthetic phase brought forward so build continues while the extract is cleared.',
  },
  {
    title: 'Field staff do not adopt the mobile workflow',
    category: 'adoption',
    mitigation: 'Two training rounds per depot, and a paper fallback retained for the first four weeks.',
  },
  {
    title: 'Monsoon restricts site access during the measurement window',
    category: 'delivery',
    mitigation: 'Measurement window extended by three weeks with the department, recorded as a change request.',
  },
  {
    title: 'Sensor supply lead time exceeds the milestone schedule',
    category: 'delivery',
    mitigation: 'Partial deployment accepted for milestone 1 with the balance moved to milestone 2.',
  },
  {
    title: 'Sub-processor added without prior written approval',
    category: 'security',
    mitigation: 'Register reviewed fortnightly; any addition raised as an incident before work begins.',
  },
  {
    title: 'Baseline period is not comparable to the pilot period',
    category: 'data',
    mitigation: 'Confounders documented and a matched historical window added to the analysis.',
  },
  {
    title: 'Milestone payment slips past the configured limit',
    category: 'financial',
    mitigation: 'Claim raised on the acceptance date and tracked on the department payment ledger.',
  },
  {
    title: 'Scope creep from ward-level requests outside the agreement',
    category: 'legal',
    mitigation: 'All additional requests routed through a change request with money and time impact stated.',
  },
];
