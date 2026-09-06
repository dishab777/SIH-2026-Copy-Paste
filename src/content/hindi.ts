import { HINDI_PROBLEMS } from './hindi-problems';

/**
 * The seeded content, in Hindi.
 *
 * The interface chrome has always translated: every label, button and heading
 * resolves through `t()`. The *content* did not. Switch the product to Hindi
 * and you got a Hindi masthead over an English challenge — the title, the
 * department, the state, the company, the officer's name, the problem
 * statement, the baseline and its unit all still in English. That is not a
 * bilingual product; it is an English product with translated furniture.
 *
 * Fixing it in the components would have meant changing `Challenge.title` from
 * `string` to a bilingual pair and touching every one of the fifty screens that
 * reads one. So it is fixed where a real deployment would fix it: at the API.
 * The client sends the language it is reading in, and the handlers serve the
 * content in it. `challenge.title` is still a string. Nothing downstream knows.
 *
 * This file is the dictionary that makes that possible: seeded English string
 * in, Hindi string out. Anything without an entry is served as it is, which is
 * the right failure — an untranslated case title is legible; a missing key is
 * not.
 *
 * Two things are deliberately NOT in here:
 *   - Case identifiers (CH-2026-0134), checksums and references. A case number
 *     is a number in every language and translating it would break search.
 *   - Contract clause text. Legal wording is never machine-translated in this
 *     product, and translating it in a fixture would be exactly that.
 */

/* ------------------------------------------------------------- geography */

const PLACES: Record<string, string> = {
  Maharashtra: 'महाराष्ट्र',
  Karnataka: 'कर्नाटक',
  Rajasthan: 'राजस्थान',
  'Madhya Pradesh': 'मध्य प्रदेश',
  Gujarat: 'गुजरात',
  'Tamil Nadu': 'तमिलनाडु',
  Kerala: 'केरल',
  Punjab: 'पंजाब',
  Odisha: 'ओडिशा',
  Assam: 'असम',
  Pune: 'पुणे',
  Nagpur: 'नागपुर',
  Mumbai: 'मुंबई',
  Nashik: 'नासिक',
  Thane: 'ठाणे',
  Mysuru: 'मैसूरु',
  'Bengaluru Urban': 'बेंगलुरु शहरी',
  Bengaluru: 'बेंगलुरु',
  Kota: 'कोटा',
  Jaipur: 'जयपुर',
  Indore: 'इंदौर',
  Surat: 'सूरत',
  Coimbatore: 'कोयंबटूर',
  Kochi: 'कोच्चि',
  Ludhiana: 'लुधियाना',
  'India region': 'भारत क्षेत्र',
  'Mumbai region, within India. No processing outside the territory.':
    'मुंबई क्षेत्र, भारत के भीतर। देश के बाहर कोई प्रसंस्करण नहीं।',
};

/* ----------------------------------------------------------- departments */

const DEPARTMENTS: Record<string, string> = {
  'Pune Municipal Corporation': 'पुणे महानगरपालिका',
  'Pune Municipal Corporation, water supply department': 'पुणे महानगरपालिका, जल आपूर्ति विभाग',
  'Directorate of Transport': 'परिवहन निदेशालय',
  'Directorate of Transport, state road transport undertaking': 'परिवहन निदेशालय, राज्य सड़क परिवहन उपक्रम',
  'Department of Agriculture': 'कृषि विभाग',
  'Department of Agriculture, district agriculture office': 'कृषि विभाग, ज़िला कृषि कार्यालय',
  'Directorate of School Education': 'विद्यालयीन शिक्षा निदेशालय',
  'Directorate of School Education, district education office': 'विद्यालयीन शिक्षा निदेशालय, ज़िला शिक्षा कार्यालय',
  'Nagpur Municipal Corporation': 'नागपुर महानगरपालिका',
  'Nagpur Municipal Corporation, solid waste management': 'नागपुर महानगरपालिका, ठोस अपशिष्ट प्रबंधन',
  'Bengaluru revenue department': 'बेंगलुरु राजस्व विभाग',
  'Bruhat Bengaluru revenue department, property tax division': 'बृहत् बेंगलुरु राजस्व विभाग, संपत्ति कर प्रभाग',
  'Directorate of Health Services': 'स्वास्थ्य सेवा निदेशालय',
  'Directorate of Health Services, emergency response cell': 'स्वास्थ्य सेवा निदेशालय, आपात प्रतिक्रिया कक्ष',
  'Public Works Department': 'लोक निर्माण विभाग',
  'Public Works Department, bridges and structures circle': 'लोक निर्माण विभाग, सेतु एवं संरचना मंडल',
  'Centre for Applied Measurement, Pune': 'व्यावहारिक मापन केंद्र, पुणे',
};

/* --------------------------------------------------------------- sectors */

const SECTORS: Record<string, string> = {
  'Water and sanitation': 'जल एवं स्वच्छता',
  Transport: 'परिवहन',
  Agriculture: 'कृषि',
  Education: 'शिक्षा',
  'Solid waste': 'ठोस अपशिष्ट',
  'Revenue and taxation': 'राजस्व एवं कराधान',
  'Health services': 'स्वास्थ्य सेवाएँ',
  'Public works': 'लोक निर्माण',
  Energy: 'ऊर्जा',
  Governance: 'शासन',
};

/* ---------------------------------------------------------- capabilities */

const CAPABILITIES: Record<string, string> = {
  'IoT sensors': 'IoT संवेदक',
  'Acoustic analytics': 'ध्वनिक विश्लेषण',
  'Predictive analytics': 'पूर्वानुमान विश्लेषण',
  'GIS mapping': 'GIS मानचित्रण',
  'Computer vision': 'कंप्यूटर दृष्टि',
  'Edge computing': 'एज कंप्यूटिंग',
  'Satellite imagery': 'उपग्रह चित्रण',
  'Machine learning': 'मशीन लर्निंग',
  'Mobile field applications': 'मोबाइल क्षेत्र अनुप्रयोग',
  'Natural language processing': 'प्राकृतिक भाषा प्रसंस्करण',
  'Workflow automation': 'कार्यप्रवाह स्वचालन',
  'Route optimisation': 'मार्ग अनुकूलन',
  Telemetry: 'दूरमापन',
  'Drone survey': 'ड्रोन सर्वेक्षण',
  'Structural analysis': 'संरचनात्मक विश्लेषण',
  'Digital twin': 'डिजिटल ट्विन',
  'Data integration': 'डेटा एकीकरण',
  Dashboards: 'डैशबोर्ड',
  'Anomaly detection': 'विसंगति पहचान',
  'Speech recognition': 'वाक् पहचान',
  'Document digitisation': 'दस्तावेज़ अंकीकरण',
  'Sensor networks': 'संवेदक जाल',
  'Energy metering': 'ऊर्जा मापन',
  'Fleet management': 'बेड़ा प्रबंधन',
  Geofencing: 'भू-परिसीमन',
};

/* ----------------------------------------------------------------- units */

const UNITS: Record<string, string> = {
  minutes: 'मिनट',
  hours: 'घंटे',
  days: 'दिन',
  percent: 'प्रतिशत',
  'percentage points': 'प्रतिशत अंक',
  litres: 'लीटर',
  'litres per day': 'लीटर प्रतिदिन',
  count: 'संख्या',
  'per thousand': 'प्रति हज़ार',
  'per lakh': 'प्रति लाख',
  rupees: 'रुपये',
  kilometres: 'किलोमीटर',
  students: 'विद्यार्थी',
  households: 'परिवार',
  tonnes: 'टन',
};

/* ------------------------------------------------------- people and firms
 * Proper nouns, transliterated rather than translated. A person's name is not
 * a phrase to be rendered into another language; it is written in the script
 * the reader is reading.
 */

const PEOPLE: Record<string, string> = {
  'A. Deshmukh': 'ए. देशमुख',
  'U. Bhagat': 'यू. भगत',
  'R. Bhat': 'आर. भट',
  'P. Rathore': 'पी. राठौर',
  'D. Patil': 'डी. पाटील',
  'Dr. A. Ramanathan': 'डॉ. ए. रामनाथन',
  'Meera Kulkarni': 'मीरा कुलकर्णी',
  'Nodal officer': 'नोडल अधिकारी',
  'Deputy commissioner': 'उप आयुक्त',
  'Procurement officer': 'खरीद अधिकारी',
  'Senior fellow, public systems': 'वरिष्ठ अध्येता, लोक व्यवस्था',
  'Co-founder and chief executive': 'सह-संस्थापक एवं मुख्य कार्यकारी',
  'Independent validation body': 'स्वतंत्र सत्यापन निकाय',
  'Programme director': 'कार्यक्रम निदेशक',
  'Authorised signatory': 'अधिकृत हस्ताक्षरकर्ता',
  'Technical director': 'तकनीकी निदेशक',
  'Department nodal officer': 'विभागीय नोडल अधिकारी',
  'Department finance officer': 'विभागीय वित्त अधिकारी',
  'Department data custodian': 'विभागीय डेटा संरक्षक',
  'AquaSense project lead': 'AquaSense परियोजना प्रमुख',
};

/* -------------------------------------------------------- problem library
 * The twelve seeded problems, in full. These are what a reader actually reads
 * on a challenge: the title at the top, the problem as the department stated
 * it, what it costs today, the baseline and how it is measured, and the
 * outcome sought.
 */

const PROBLEMS: Record<string, string> = {
  /* ---- titles ---- */
  'Smart water leakage detection': 'जल रिसाव की त्वरित पहचान',
  'Bus depot fuel pilferage': 'बस डिपो में ईंधन की चोरी',
  'Crop residue burning detection and response': 'पराली जलाने की पहचान एवं प्रतिक्रिया',
  'School dropout early warning': 'विद्यालय छोड़ने की पूर्व चेतावनी',
  'Dry waste segregation at source': 'स्रोत पर सूखे कचरे का पृथक्करण',
  'Tax notice language simplification': 'कर सूचना की भाषा का सरलीकरण',
  'Ambulance dispatch routing': 'एम्बुलेंस प्रेषण एवं मार्ग निर्धारण',
  'Signal timing optimisation on arterial corridors': 'मुख्य मार्गों पर संकेत-समय का अनुकूलन',
  'Remote inspection of bridges and culverts': 'सेतुओं एवं पुलियों का दूरस्थ निरीक्षण',
  'Primary health centre access for remote habitations': 'दूरस्थ बस्तियों के लिए प्राथमिक स्वास्थ्य केंद्र तक पहुँच',
  'Street light fault detection and energy loss': 'पथ-प्रकाश की खराबी पहचान एवं ऊर्जा हानि',
  'Property tax assessment gap detection': 'संपत्ति कर निर्धारण में अंतर की पहचान',

  /* ---- the second pass, which reuses a problem for another zone ---- */
  'western zone': 'पश्चिमी क्षेत्र',
  'phase two': 'द्वितीय चरण',
  'northern circle': 'उत्तरी मंडल',
  'second corridor': 'द्वितीय गलियारा',
  'outer wards': 'बाहरी वार्ड',
  'district extension': 'ज़िला विस्तार',
  'peri-urban belt': 'उप-नगरीय पट्टी',
  'east division': 'पूर्वी संभाग',
  'block cluster two': 'खंड समूह दो',
  'ring road corridor': 'रिंग रोड गलियारा',
  'south division': 'दक्षिणी संभाग',
  'satellite towns': 'उपनगरीय कस्बे',

  /* ---- water: the case the whole product is seeded around ---- */
  'About 3.4 lakh households on the eastern distribution zone, plus the 42 field crews who chase leaks by hand.':
    'पूर्वी वितरण क्षेत्र के लगभग 3.4 लाख परिवार, तथा हाथ से रिसाव खोजने वाले 42 क्षेत्रीय दल।',
  'A leak is usually noticed when a resident calls the ward office or when pressure drops enough to be visible. A crew is dispatched, walks the line with an acoustic rod, and isolates the section. On buried mains under carriageway the search can take a full shift.':
    'रिसाव प्रायः तब पता चलता है जब कोई निवासी वार्ड कार्यालय को सूचित करता है या दाब इतना गिर जाता है कि दिखने लगे। एक दल भेजा जाता है, जो ध्वनिक छड़ लेकर पाइपलाइन के साथ चलता है और उस खंड को अलग करता है। सड़क के नीचे दबी मुख्य लाइनों पर यह खोज पूरी पाली ले सकती है।',
  'Around 190 reported leaks a month across the zone, of which roughly 60 are on trunk mains.':
    'क्षेत्र में हर माह लगभग 190 रिसाव दर्ज होते हैं, जिनमें से लगभग 60 मुख्य लाइनों पर होते हैं।',
  'Non-revenue water in the zone is 34 percent. At the current bulk purchase rate this is about ₹4.1 crore a year of treated water that is produced and never billed.':
    'क्षेत्र में गैर-राजस्व जल 34 प्रतिशत है। वर्तमान थोक क्रय दर पर यह लगभग ₹4.1 करोड़ प्रतिवर्ष का शोधित जल है जो उत्पादित तो होता है पर कभी बिल में नहीं आता।',
  'District metering exists but readings are collected manually once a week. There is no continuous pressure telemetry below the reservoir outlet.':
    'ज़िला स्तर पर मापन तो है, पर रीडिंग सप्ताह में एक बार हाथ से ली जाती है। जलाशय निकास के नीचे निरंतर दाब-दूरमापन नहीं है।',
  'Average time from leak occurrence to field crew locating it': 'रिसाव होने से क्षेत्रीय दल द्वारा उसे खोजने तक का औसत समय',
  'Median of the ward complaint register timestamps against crew closure timestamps, sampled over 12 weeks.':
    '12 सप्ताह के प्रतिदर्श पर, वार्ड शिकायत रजिस्टर के समय-अंकन की तुलना में दल द्वारा कार्य बंद करने के समय-अंकन का माध्यक।',
  'Ward complaint register and crew job cards, water supply department':
    'वार्ड शिकायत रजिस्टर एवं दल के कार्य कार्ड, जल आपूर्ति विभाग',
  'Average leak detection time': 'औसत रिसाव पहचान समय',

  /* ---- the remaining eleven, at the fields a reader meets first ---- */
  'Cut the time between a leak starting and a crew standing over it, without adding staff to the zone.':
    'रिसाव शुरू होने और दल के वहाँ पहुँचने के बीच का समय घटाएँ, बिना क्षेत्र में कर्मचारी बढ़ाए।',
  'Know which depot lost fuel, on which shift, without waiting for the monthly reconciliation.':
    'मासिक मिलान की प्रतीक्षा किए बिना जानें कि किस डिपो में, किस पाली में ईंधन कम हुआ।',
  'Reach a burning plot while the evidence is still on the ground.':
    'जलते हुए खेत तक तब पहुँचें जब साक्ष्य ज़मीन पर मौजूद हो।',
  'Identify a child at risk of dropping out while there is still a term left to act in.':
    'विद्यालय छोड़ने के जोखिम वाले बच्चे की पहचान तब करें जब कार्रवाई के लिए एक सत्र शेष हो।',
  'Recover more clean recyclable material without adding a sorting shift.':
    'छँटाई की पाली बढ़ाए बिना अधिक स्वच्छ पुनर्चक्रण योग्य सामग्री प्राप्त करें।',
  'Write a notice an assessee can act on without visiting the ward office, without weakening its legal effect.':
    'ऐसी सूचना लिखें जिस पर करदाता वार्ड कार्यालय गए बिना कार्रवाई कर सके, और जिसका विधिक प्रभाव भी कम न हो।',
  'Get a vehicle on scene inside the service standard more often, with the fleet already in place.':
    'मौजूदा बेड़े के साथ ही, सेवा मानक के भीतर वाहन को घटनास्थल पर अधिक बार पहुँचाएँ।',
  'Cut the time a vehicle spends stopped on the corridor without rebuilding a junction.':
    'किसी चौराहे का पुनर्निर्माण किए बिना, गलियारे पर वाहन के रुके रहने का समय घटाएँ।',
  'Get a complete, comparable condition record for every structure, every year.':
    'हर संरचना का पूर्ण एवं तुलनीय स्थिति-अभिलेख, हर वर्ष प्राप्त करें।',
  'Put the camp where the unmet need is this quarter, not where the rotation says.':
    'शिविर वहाँ लगाएँ जहाँ इस तिमाही में वास्तविक आवश्यकता है, न कि जहाँ चक्र कहता है।',
  'Know a light has failed before a resident reports it, and know what it is costing.':
    'निवासी की शिकायत से पहले जानें कि कोई बत्ती बंद है, और यह भी कि उसकी लागत क्या है।',
  'Find the properties paying on an assessment that no longer matches what is built.':
    'उन संपत्तियों को खोजें जो ऐसे निर्धारण पर भुगतान कर रही हैं जो अब निर्मित ढाँचे से मेल नहीं खाता।',
};

/* ------------------------------------------------------- risks and status */

const OPERATIONAL: Record<string, string> = {
  'Departmental data extract delayed beyond the agreed date': 'विभागीय डेटा निर्यात सहमत तिथि से विलंबित',
  'Field staff do not adopt the mobile workflow': 'क्षेत्रीय कर्मचारी मोबाइल कार्यप्रवाह नहीं अपना रहे',
  'Monsoon restricts site access during the measurement window': 'मापन अवधि में मानसून से स्थल तक पहुँच बाधित',
  'Sensor supply lead time exceeds the milestone schedule': 'संवेदक आपूर्ति का समय मील-पत्थर अनुसूची से अधिक',
  'Sub-processor added without prior written approval': 'पूर्व लिखित अनुमोदन के बिना उप-प्रसंस्करणकर्ता जोड़ा गया',
  'Baseline period is not comparable to the pilot period': 'आधार अवधि पायलट अवधि से तुलनीय नहीं',
  'Milestone payment slips past the configured limit': 'मील-पत्थर भुगतान निर्धारित सीमा से आगे निकला',
  'Scope creep from ward-level requests outside the agreement': 'अनुबंध के बाहर वार्ड-स्तरीय माँगों से कार्यक्षेत्र का विस्तार',

  'Deployment and instrumentation complete': 'तैनाती एवं उपकरण-स्थापना पूर्ण',
  'Measurement period one complete': 'प्रथम मापन अवधि पूर्ण',
  'Final measurement, handover and training complete': 'अंतिम मापन, हस्तांतरण एवं प्रशिक्षण पूर्ण',

  Synthetic: 'कृत्रिम',
  Masked: 'प्रच्छन्न',
  Production: 'वास्तविक',
  production: 'वास्तविक',
  masked: 'प्रच्छन्न',
  synthetic: 'कृत्रिम',
};

/* ------------------------------------------------- gates, stages, roles
 * Programme definitions rather than case content: read straight out of
 * `src/config/*` by the component that draws them, and translated at render
 * through `useSay()` rather than by the API.
 */

const PROGRAMME: Record<string, string> = {
  'Problem is real and funded': 'समस्या वास्तविक है और वित्तपोषित है',
  'Fit for public release': 'सार्वजनिक प्रकाशन योग्य',
  'Shortlist candidates': 'अभ्यर्थियों की संक्षिप्त सूची',
  'Award pilot': 'पायलट का आवंटन',
  'Continue or stop the pilot': 'पायलट जारी रखें या रोकें',
  'Pilot succeeded': 'पायलट सफल रहा',
  'Scale, procure, re-tender or close': 'विस्तार, खरीद, पुनर्निविदा या समापन',

  'Challenge intake and framing': 'चुनौती की प्राप्ति एवं गढ़न',
  'Publication and demand signalling': 'प्रकाशन एवं माँग की सूचना',
  'Discovery and application': 'खोज एवं आवेदन',
  'Eligibility screening': 'पात्रता जाँच',
  'Expert evaluation and selection': 'विशेषज्ञ मूल्यांकन एवं चयन',
  'Pilot design and milestone contracting': 'पायलट अभिकल्प एवं मील-पत्थर अनुबंध',
  'Pilot execution and measurement': 'पायलट क्रियान्वयन एवं मापन',
  'Independent validation': 'स्वतंत्र सत्यापन',
  'Procurement, scale-up and replication': 'खरीद, विस्तार एवं पुनरावृत्ति',

  'Department nodal officer': 'विभागीय नोडल अधिकारी',
  'Programme management unit': 'कार्यक्रम प्रबंधन इकाई',
  Startups: 'स्टार्टअप',
  'Rule engine and screening committee': 'नियम इंजन एवं छँटाई समिति',
  'External evaluators': 'बाह्य मूल्यांकनकर्ता',
  'Department and startup': 'विभाग एवं स्टार्टअप',
  'Startup and department': 'स्टार्टअप एवं विभाग',
  'Independent validator': 'स्वतंत्र सत्यापनकर्ता',
  'Competent authority': 'सक्षम प्राधिकारी',

  'Department administrator': 'विभागीय प्रशासक',
  'Procurement officer': 'खरीद अधिकारी',
  Evaluator: 'मूल्यांकनकर्ता',
  Startup: 'स्टार्टअप',
  Public: 'आम नागरिक',
};

/**
 * One flat table. Built once at module load, because the localiser walks every
 * string in every response and a chain of six lookups per string is six times
 * the work for no benefit.
 */
export const HINDI: Readonly<Record<string, string>> = Object.freeze({
  ...PLACES,
  ...DEPARTMENTS,
  ...SECTORS,
  ...CAPABILITIES,
  ...UNITS,
  ...PEOPLE,
  ...PROBLEMS,
  ...OPERATIONAL,
  ...PROGRAMME,
  ...HINDI_PROBLEMS,
});
