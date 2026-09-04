import { addDays, addYears, formatISO, subDays, subMonths, subYears } from 'date-fns';
import { DEMO_NOW } from '@/config/clock';
import { digest, intBetween, makeRandom, pick, pickMany } from '@/lib/ids';
import type { Department, DpiitStatus, Startup, StartupDocument, User } from '@/types/models';
import {
  CAPABILITIES,
  CERTIFICATIONS,
  DISTRICTS,
  EVALUATOR_NAMES,
  OFFICER_NAMES,
  SECTORS,
  STARTUP_NAMES,
  STATES,
  VALIDATOR_NAMES,
} from './reference';

export const NOW = DEMO_NOW;

export function iso(d: Date): string {
  return formatISO(d);
}

function initialsOf(name: string): string {
  const cleaned = name.replace(/^(Dr|Prof)\.\s*/, '');
  const parts = cleaned.split(/[\s.]+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

export interface CoreFixtures {
  departments: Department[];
  users: User[];
  startups: Startup[];
  startupDocuments: StartupDocument[];
}

const DEPARTMENT_SPECS: readonly {
  id: string;
  name: string;
  shortName: string;
  state: string;
  district: string;
  sector: string;
}[] = [
  {
    id: 'DEP-01',
    name: 'Pune Municipal Corporation, water supply department',
    shortName: 'Pune Municipal Corporation',
    state: 'Maharashtra',
    district: 'Pune',
    sector: 'Water and sanitation',
  },
  {
    id: 'DEP-02',
    name: 'Directorate of Transport, state road transport undertaking',
    shortName: 'Directorate of Transport',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    sector: 'Urban transport',
  },
  {
    id: 'DEP-03',
    name: 'Department of Agriculture, district agriculture office',
    shortName: 'Department of Agriculture',
    state: 'Rajasthan',
    district: 'Kota',
    sector: 'Agriculture',
  },
  {
    id: 'DEP-04',
    name: 'Directorate of School Education, district education office',
    shortName: 'Directorate of School Education',
    state: 'Rajasthan',
    district: 'Jodhpur',
    sector: 'School education',
  },
  {
    id: 'DEP-05',
    name: 'Nagpur Municipal Corporation, solid waste management',
    shortName: 'Nagpur Municipal Corporation',
    state: 'Maharashtra',
    district: 'Nagpur',
    sector: 'Solid waste',
  },
  {
    id: 'DEP-06',
    name: 'Bruhat Bengaluru revenue department, property tax division',
    shortName: 'Bengaluru revenue department',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    sector: 'Revenue and taxation',
  },
  {
    id: 'DEP-07',
    name: 'Directorate of Health Services, emergency response cell',
    shortName: 'Directorate of Health Services',
    state: 'Maharashtra',
    district: 'Thane',
    sector: 'Health services',
  },
  {
    id: 'DEP-08',
    name: 'Public Works Department, bridges and structures circle',
    shortName: 'Public Works Department',
    state: 'Karnataka',
    district: 'Mysuru',
    sector: 'Public works',
  },
];

export function buildCore(): CoreFixtures {
  const rand = makeRandom(20260903);
  const departments: Department[] = [];
  const users: User[] = [];
  const startups: Startup[] = [];
  const startupDocuments: StartupDocument[] = [];

  // Programme management unit and finance, shared across departments.
  users.push({
    id: 'USR-PMU-01',
    name: 'A. Deshmukh',
    initials: 'AD',
    email: 'a.deshmukh@prayog.gov.in',
    role: 'pmu',
    designation: 'Head, programme management unit',
    active: true,
    lastActiveAt: iso(subDays(NOW, 0)),
  });
  users.push({
    id: 'USR-PMU-02',
    name: 'U. Bhagat',
    initials: 'UB',
    email: 'u.bhagat@prayog.gov.in',
    role: 'pmu',
    designation: 'Programme officer, rules and rubrics',
    active: true,
    lastActiveAt: iso(subDays(NOW, 1)),
  });

  DEPARTMENT_SPECS.forEach((spec, i) => {
    const officerName = OFFICER_NAMES[i % OFFICER_NAMES.length]!;
    const adminName = OFFICER_NAMES[(i + 5) % OFFICER_NAMES.length]!;
    const procName = OFFICER_NAMES[(i + 9) % OFFICER_NAMES.length]!;
    const officerId = `USR-D${String(i + 1).padStart(2, '0')}-OFF`;
    const adminId = `USR-D${String(i + 1).padStart(2, '0')}-ADM`;
    const procId = `USR-D${String(i + 1).padStart(2, '0')}-PRO`;

    users.push(
      {
        id: officerId,
        name: officerName,
        initials: initialsOf(officerName),
        email: `${officerName.replace(/[.\s]/g, '').toLowerCase()}@${spec.id.toLowerCase()}.gov.in`,
        role: 'department_officer',
        departmentId: spec.id,
        designation: 'Nodal officer',
        active: true,
        lastActiveAt: iso(subDays(NOW, intBetween(rand, 0, 3))),
      },
      {
        id: adminId,
        name: adminName,
        initials: initialsOf(adminName),
        email: `${adminName.replace(/[.\s]/g, '').toLowerCase()}@${spec.id.toLowerCase()}.gov.in`,
        role: 'department_admin',
        departmentId: spec.id,
        designation: 'Deputy commissioner',
        active: true,
        lastActiveAt: iso(subDays(NOW, intBetween(rand, 0, 4))),
      },
      {
        id: procId,
        name: procName,
        initials: initialsOf(procName),
        email: `${procName.replace(/[.\s]/g, '').toLowerCase()}@${spec.id.toLowerCase()}.gov.in`,
        role: 'procurement_officer',
        departmentId: spec.id,
        designation: 'Procurement officer',
        active: true,
        lastActiveAt: iso(subDays(NOW, intBetween(rand, 0, 6))),
      },
    );

    departments.push({
      ...spec,
      nodalOfficerId: officerId,
      openChallenges: 0,
      livePilots: 0,
      committedPaise: 0,
      releasedPaise: 0,
    });
  });

  // Twelve evaluators.
  EVALUATOR_NAMES.forEach((name, i) => {
    users.push({
      id: `USR-EVAL-${String(i + 1).padStart(2, '0')}`,
      name,
      initials: initialsOf(name),
      email: `${name.replace(/[^a-zA-Z]/g, '').toLowerCase()}@evaluators.prayog.gov.in`,
      role: 'evaluator',
      designation: pick(rand, [
        'Professor, civil engineering',
        'Principal scientist',
        'Independent domain expert',
        'Professor, computer science',
        'Senior fellow, public systems',
      ]),
      active: true,
      lastActiveAt: iso(subDays(NOW, intBetween(rand, 0, 9))),
    });
  });

  // Three independent validators.
  VALIDATOR_NAMES.forEach((name, i) => {
    users.push({
      id: `USR-VAL-${String(i + 1).padStart(2, '0')}`,
      name,
      initials: initialsOf(name.split(',')[0] ?? name),
      email: `validation@${name.split(',')[0]!.replace(/[^a-zA-Z]/g, '').toLowerCase()}.org.in`,
      role: 'validator',
      designation: 'Independent validation body',
      active: true,
      lastActiveAt: iso(subDays(NOW, intBetween(rand, 0, 5))),
    });
  });

  // Sixty startups. AquaSense is index 0 and is the demo protagonist.
  STARTUP_NAMES.forEach(([legalName, tradeName], i) => {
    const state = i === 0 ? 'Maharashtra' : pick(rand, STATES);
    const district = pick(rand, DISTRICTS[state]!);
    const isHero = i === 0;

    // A deliberate mix of recognition states, per the seed requirements.
    let dpiitStatus: DpiitStatus = 'recognised';
    if (i % 17 === 5) dpiitStatus = 'expired';
    else if (i % 13 === 7) dpiitStatus = 'unverified';
    else if (i % 19 === 11) dpiitStatus = 'not_a_startup';
    if (isHero) dpiitStatus = 'recognised';

    const incorporation =
      dpiitStatus === 'not_a_startup'
        ? subYears(NOW, intBetween(rand, 12, 22))
        : subYears(NOW, intBetween(rand, 2, 9));

    const validTo =
      dpiitStatus === 'expired'
        ? subDays(NOW, intBetween(rand, 5, 120))
        : dpiitStatus === 'recognised'
          ? addYears(incorporation, 10)
          : undefined;

    const capabilityCount = intBetween(rand, 2, 5);
    const capabilities = isHero
      ? ['IoT sensors', 'Acoustic analytics', 'Predictive analytics', 'GIS mapping']
      : pickMany(rand, CAPABILITIES, capabilityCount);

    const certCount = dpiitStatus === 'recognised' ? intBetween(rand, 0, 3) : intBetween(rand, 0, 1);
    const certifications = isHero ? ['ISO 27001', 'CERT-In empanelled audit'] : pickMany(rand, CERTIFICATIONS, certCount);

    const deploymentCount = isHero ? 3 : intBetween(rand, 0, 4);
    const deployments = Array.from({ length: deploymentCount }, (_, d) => {
      const isGov = isHero ? d < 2 : rand() > 0.55;
      return {
        id: `DEP-${i}-${d}`,
        client: isHero
          ? ['Nashik Municipal Corporation', 'Solapur Municipal Corporation', 'Godavari Industrial Estate'][d]!
          : isGov
            ? `${pick(rand, DISTRICTS[state]!)} municipal body`
            : `${pick(rand, ['Industrial estate', 'Private utility', 'Cooperative society'])}, ${state}`,
        isGovernment: isGov,
        summary: isHero
          ? [
              'Acoustic leak localisation across 62 km of trunk main, 14-month deployment.',
              'District metering telemetry across 9 zones with pressure-based leak alerting.',
              'Private water network monitoring across an industrial estate.',
            ][d]!
          : 'Deployment of the core platform with departmental integration and staff training.',
        year: 2026 - intBetween(rand, 1, 5),
        validated: isHero ? d === 0 : rand() > 0.7,
      };
    });

    const slug = tradeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    startups.push({
      id: `STP-${String(i + 1).padStart(3, '0')}`,
      legalName,
      tradeName,
      slug,
      cin: `U${intBetween(rand, 10000, 99999)}${state.slice(0, 2).toUpperCase()}${incorporation.getFullYear()}PTC${intBetween(rand, 100000, 999999)}`,
      gstin: `${intBetween(rand, 10, 36)}AA${String.fromCharCode(65 + intBetween(rand, 0, 25))}CS${intBetween(rand, 1000, 9999)}A1Z${intBetween(rand, 0, 9)}`,
      gstStatus: i % 23 === 9 ? 'suspended' : 'active',
      udyam: `UDYAM-${state.slice(0, 2).toUpperCase()}-${intBetween(rand, 10, 99)}-${intBetween(rand, 1000000, 9999999)}`,
      entityType: legalName.includes('LLP') ? 'llp' : 'private_limited',
      incorporationDate: iso(incorporation),
      city: district,
      state,
      statesServed: isHero ? ['Maharashtra', 'Karnataka', 'Gujarat'] : pickMany(rand, STATES, intBetween(rand, 1, 3)),
      dpiit: {
        status: dpiitStatus,
        recognitionNumber:
          dpiitStatus === 'recognised' || dpiitStatus === 'expired'
            ? `DIPP${intBetween(rand, 100000, 199999)}`
            : undefined,
        validTo: validTo ? iso(validTo) : undefined,
        lastCheckedAt: iso(subDays(NOW, intBetween(rand, 0, 30))),
        verification: dpiitStatus === 'unverified' ? 'pending' : dpiitStatus === 'expired' ? 'failed' : 'verified',
      },
      turnoverCrore:
        dpiitStatus === 'not_a_startup' ? intBetween(rand, 120, 400) : Number((rand() * 18).toFixed(2)),
      capabilities,
      industries: isHero ? ['Water and sanitation'] : pickMany(rand, SECTORS, intBetween(rand, 1, 2)),
      certifications,
      deployments,
      teamSize: isHero ? 34 : intBetween(rand, 4, 90),
      summary: isHero
        ? 'Acoustic and pressure telemetry for water distribution networks, with leak localisation to a 30-metre segment.'
        : `Applies ${capabilities.slice(0, 2).join(' and ').toLowerCase()} to public service delivery problems.`,
      profileCompleteness: isHero ? 96 : intBetween(rand, 52, 100),
      bankAccountMasked: `••••••${intBetween(rand, 1000, 9999)}`,
    });
  });

  // Documents for every startup, with one deliberate failed scan and several expiring.
  startups.forEach((s, i) => {
    const docTypes = [
      'Certificate of incorporation',
      'DPIIT recognition certificate',
      'GST registration certificate',
      'Audited financial statement',
      'Board resolution for authorised signatory',
    ];
    docTypes.forEach((type, d) => {
      const scan: StartupDocument['scan'] = i === 3 && d === 3 ? 'failed' : 'clean';
      const uploaded = subMonths(NOW, intBetween(rand, 1, 20));
      startupDocuments.push({
        id: `DOC-${s.id}-${d}`,
        startupId: s.id,
        type,
        fileName: `${type.toLowerCase().replace(/\s+/g, '-')}-${s.slug}.pdf`,
        validTo:
          type === 'DPIIT recognition certificate' && s.dpiit.validTo
            ? s.dpiit.validTo
            : type === 'GST registration certificate'
              ? iso(addDays(NOW, intBetween(rand, -20, 400)))
              : undefined,
        verification: scan === 'failed' ? 'failed' : s.dpiit.verification === 'pending' && d === 1 ? 'pending' : 'verified',
        uploadedOn: iso(uploaded),
        scan,
        sizeBytes: intBetween(rand, 90_000, 3_400_000),
        hash: digest(`${s.id}-${type}`),
      });
    });
  });

  // One startup user per startup, so the demo can sign in as any of them.
  startups.forEach((s, i) => {
    users.push({
      id: `USR-STP-${String(i + 1).padStart(3, '0')}`,
      name: i === 0 ? 'Meera Kulkarni' : `${pick(rand, ['Ananya', 'Rohit', 'Farhan', 'Divya', 'Karthik', 'Sneha', 'Imran', 'Jaya'])} ${pick(rand, ['Rao', 'Shah', 'Menon', 'Verma', 'Pillai', 'Kaur', 'Desai'])}`,
      initials: i === 0 ? 'MK' : 'ST',
      email: `founder@${s.slug}.in`,
      role: 'startup',
      startupId: s.id,
      designation: i === 0 ? 'Co-founder and chief executive' : 'Founder',
      active: true,
      lastActiveAt: iso(subDays(NOW, intBetween(rand, 0, 14))),
    });
  });

  // Fix initials for startup users after generation.
  users
    .filter((u) => u.role === 'startup')
    .forEach((u) => {
      u.initials = initialsOf(u.name);
    });

  return { departments, users, startups, startupDocuments };
}
