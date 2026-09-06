/**
 * The eleven remaining seeded problems, in full.
 *
 * The water case lives in `hindi.ts` because it is the one the whole product is
 * seeded around and its strings sit beside the geography and department tables
 * a reader meets at the same time. These are the rest — every prose field a
 * reader actually reads on a challenge document: who the problem affects, what
 * happens today, how often, what it costs, what the department is currently
 * limited by, the baseline metric and how it is measured, where the figure
 * comes from, and the metric the outcome is set against.
 *
 * Kept in their own file for one reason: eleven problems times nine fields is
 * ninety-nine strings, and putting them beside the twenty-entry unit table
 * would bury it.
 */

export const HINDI_PROBLEMS: Readonly<Record<string, string>> = Object.freeze({
  /* ------------------------------------------------------ who is affected */
  'Nine depots operating 1,240 buses, and the depot managers accountable for fuel variance.':
    '1,240 बसों का संचालन करने वाले नौ डिपो, और ईंधन के अंतर के लिए उत्तरदायी डिपो प्रबंधक।',
  '11 tehsils, about 78,000 cultivators, and the district agriculture officers who must respond.':
    '11 तहसीलें, लगभग 78,000 कृषक, और वे ज़िला कृषि अधिकारी जिन्हें प्रतिक्रिया देनी होती है।',
  '612 upper primary schools and about 1.9 lakh enrolled children in the district.':
    'ज़िले के 612 उच्च प्राथमिक विद्यालय और लगभग 1.9 लाख नामांकित बच्चे।',
  '1.1 lakh households in four wards and the 320 collection staff who sort by hand at the transfer point.':
    'चार वार्डों के 1.1 लाख परिवार और स्थानांतरण केंद्र पर हाथ से छँटाई करने वाले 320 संग्रहण कर्मी।',
  'About 2.7 lakh property tax assessees receiving demand and default notices each year.':
    'लगभग 2.7 लाख संपत्ति करदाता, जिन्हें हर वर्ष माँग एवं चूक सूचनाएँ मिलती हैं।',
  'About 41 lakh people': 'लगभग 41 लाख लोग',
  '64 ambulances covering an urban and peri-urban area of about 41 lakh people.':
    'लगभग 41 लाख जनसंख्या वाले नगरीय एवं उप-नगरीय क्षेत्र को कवर करने वाली 64 एम्बुलेंस।',
  'About 6.2 lakh daily trips across 38 signalised junctions on three arterial corridors.':
    'तीन मुख्य गलियारों के 38 संकेत-नियंत्रित चौराहों पर प्रतिदिन लगभग 6.2 लाख यात्राएँ।',
  '1,860 minor bridges and culverts, and the 24 assistant engineers responsible for inspecting them.':
    '1,860 लघु सेतु एवं पुलियाँ, और उनके निरीक्षण के लिए उत्तरदायी 24 सहायक अभियंता।',
  'About 2.3 lakh people in 340 habitations more than eight kilometres from a functioning centre.':
    'किसी क्रियाशील केंद्र से आठ किलोमीटर से अधिक दूर 340 बस्तियों के लगभग 2.3 लाख लोग।',
  '48,000 street light points across 12 wards.': '12 वार्डों में फैले 48,000 पथ-प्रकाश बिंदु।',
  'About 4.1 lakh assessed properties and an unknown number of unassessed and under-assessed ones.':
    'लगभग 4.1 लाख निर्धारित संपत्तियाँ, तथा अनिर्धारित एवं कम-निर्धारित संपत्तियाँ जिनकी संख्या अज्ञात है।',

  /* -------------------------------------------------- what happens today */
  'Fuel is issued against a manual indent at the depot pump. Reconciliation happens monthly against odometer readings, by which time the trail is cold.':
    'ईंधन डिपो पंप पर हाथ से भरी माँग-पर्ची के आधार पर दिया जाता है। मिलान महीने में एक बार ओडोमीटर रीडिंग से होता है, तब तक सुराग ठंडा पड़ चुका होता है।',
  'Burning events are identified from satellite thermal anomalies published the next day. By the time a field team reaches the plot, the fire is out and attribution is disputed.':
    'जलने की घटनाएँ अगले दिन प्रकाशित उपग्रह ताप-विसंगतियों से पहचानी जाती हैं। जब तक क्षेत्रीय दल खेत तक पहुँचता है, आग बुझ चुकी होती है और उत्तरदायित्व विवादित हो जाता है।',
  'A child is recorded as a dropout after 30 consecutive days of absence. Intervention starts after that, when the family has usually already moved or the child has started work.':
    'लगातार 30 दिन की अनुपस्थिति के बाद बच्चे को विद्यालय-त्यागी दर्ज किया जाता है। हस्तक्षेप उसके बाद शुरू होता है, जब प्रायः परिवार जा चुका होता है या बच्चा काम पर लग चुका होता है।',
  'Mixed waste arrives at the transfer station and is separated manually on a belt. Recyclable fraction is contaminated by the time it is picked.':
    'मिश्रित कचरा स्थानांतरण केंद्र पर आता है और पट्टे पर हाथ से अलग किया जाता है। पुनर्चक्रण योग्य अंश उठाए जाने तक दूषित हो चुका होता है।',
  'Notices are generated from templates written in legal English and Marathi. Assessees visit the ward office to ask what the notice means, which is where most of the counter load comes from.':
    'सूचनाएँ विधिक अंग्रेज़ी और मराठी में लिखे आदर्श प्रारूपों से बनती हैं। करदाता यह पूछने वार्ड कार्यालय आते हैं कि सूचना का अर्थ क्या है, और काउंटर पर अधिकांश भार यहीं से आता है।',
  'Dispatch is by nearest-vehicle radio call using a static zone map drawn in 2016. Crews route by local knowledge.':
    'प्रेषण 2016 में बने स्थिर क्षेत्र-मानचित्र के आधार पर निकटतम वाहन को रेडियो कॉल से होता है। दल स्थानीय जानकारी के भरोसे मार्ग तय करते हैं।',
  'Signal plans are fixed-time, revised roughly once a year from a manual count. Traffic police override plans manually at peak.':
    'संकेत-योजनाएँ नियत-समय की हैं, जिन्हें हाथ से की गई गणना के आधार पर लगभग वर्ष में एक बार संशोधित किया जाता है। व्यस्त समय में यातायात पुलिस उन्हें हाथ से बदल देती है।',
  'Each structure is inspected visually once a year. Access to soffits and piers usually requires a boat or a ladder party, so many inspections are abbreviated.':
    'हर संरचना का वर्ष में एक बार दृष्टि-निरीक्षण होता है। नीचे की सतह और स्तंभों तक पहुँचने के लिए प्रायः नाव या सीढ़ी-दल चाहिए, इसलिए कई निरीक्षण अधूरे रह जाते हैं।',
  'Outreach camps are scheduled quarterly on a fixed rotation drawn up at the block level, regardless of where need actually is.':
    'पहुँच-शिविर खंड स्तर पर बने नियत चक्र के अनुसार तिमाही आयोजित होते हैं, चाहे वास्तविक आवश्यकता कहीं भी हो।',
  'Faults are reported by residents or found by a deep patrol. Energy is billed on connected load, not on consumption.':
    'खराबियाँ निवासी बताते हैं या गहन गश्त में मिलती हैं। ऊर्जा का बिल जुड़े भार पर बनता है, वास्तविक खपत पर नहीं।',
  'Field surveyors re-measure properties on a rolling basis. A full cycle takes about seven years, by which time much of it is stale.':
    'क्षेत्रीय सर्वेक्षक संपत्तियों को क्रमिक रूप से फिर से मापते हैं। एक पूरा चक्र लगभग सात वर्ष लेता है, तब तक अधिकांश आँकड़े पुराने पड़ चुके होते हैं।',

  /* ------------------------------------------------------------ frequency */
  'Monthly reconciliation, with unexplained variance recorded in seven of the last nine cycles.':
    'मासिक मिलान; पिछले नौ में से सात चक्रों में अस्पष्ट अंतर दर्ज हुआ।',
  'Roughly 2,100 detected events across the season, concentrated in a six-week window.':
    'मौसम भर में लगभग 2,100 घटनाएँ, जो छह सप्ताह की अवधि में केंद्रित रहती हैं।',
  'About 4,300 children crossed the 30-day threshold last academic year.':
    'पिछले शैक्षणिक वर्ष में लगभग 4,300 बच्चों ने 30 दिन की सीमा पार की।',
  'Daily, roughly 96 tonnes across the four wards.': 'प्रतिदिन, चारों वार्डों में लगभग 96 टन।',
  'Roughly 2.7 lakh notices a year, with 41 percent generating a counter visit.':
    'प्रतिवर्ष लगभग 2.7 लाख सूचनाएँ, जिनमें से 41 प्रतिशत पर करदाता काउंटर तक आता है।',
  'About 780 emergency calls a day.': 'प्रतिदिन लगभग 780 आपात कॉल।',
  'Continuous. Peak congestion twice daily on all three corridors.':
    'निरंतर। तीनों गलियारों पर प्रतिदिन दो बार चरम भीड़।',
  'Annual cycle, with about 30 percent of structures inspected only partially.':
    'वार्षिक चक्र, जिसमें लगभग 30 प्रतिशत संरचनाओं का निरीक्षण केवल आंशिक होता है।',
  'Quarterly camps, about 1,360 a year across the district.':
    'तिमाही शिविर; ज़िले भर में प्रतिवर्ष लगभग 1,360।',
  'About 900 fault reports a month, with an average 9-day rectification time.':
    'प्रति माह लगभग 900 खराबी की सूचनाएँ, औसत सुधार समय 9 दिन।',
  'Rolling survey, roughly 58,000 properties a year.': 'क्रमिक सर्वेक्षण; प्रतिवर्ष लगभग 58,000 संपत्तियाँ।',

  /* ------------------------------------------------------ cost of today */
  'Unexplained diesel draw averages 3.8 percent of issue, roughly ₹2.6 crore a year across the nine depots.':
    'अस्पष्ट डीज़ल निकासी औसतन जारी मात्रा का 3.8 प्रतिशत है — नौ डिपो मिलाकर लगभग ₹2.6 करोड़ प्रतिवर्ष।',
  'Air quality penalties and health costs aside, the department spends about ₹90 lakh a season on field verification that arrives too late to act.':
    'वायु गुणवत्ता के अर्थदंड और स्वास्थ्य लागत अलग रखें तो भी विभाग हर मौसम लगभग ₹90 लाख ऐसे क्षेत्रीय सत्यापन पर खर्च करता है जो कार्रवाई के लिए बहुत देर से पहुँचता है।',
  'Re-enrolment drives cost roughly ₹1.4 crore a year and recover under a third of those children.':
    'पुनः नामांकन अभियानों पर प्रतिवर्ष लगभग ₹1.4 करोड़ खर्च होते हैं और उनसे एक-तिहाई से भी कम बच्चे लौटते हैं।',
  'Contaminated recyclables fetch about 40 percent less at auction. The ward loses close to ₹1.8 crore a year in realisable value and pays for manual sorting on top.':
    'दूषित पुनर्चक्रण योग्य सामग्री नीलामी में लगभग 40 प्रतिशत कम दाम पाती है। वार्ड को प्रतिवर्ष लगभग ₹1.8 करोड़ के प्राप्य मूल्य की हानि होती है, और ऊपर से हाथ से छँटाई का खर्च भी।',
  'Counter handling costs about ₹3.2 crore a year and delays collection by an average of 26 days per contested notice.':
    'काउंटर पर निपटान की लागत प्रतिवर्ष लगभग ₹3.2 करोड़ है, और हर विवादित सूचना पर वसूली औसतन 26 दिन विलंबित होती है।',
  'Median response time is 22 minutes against a 15-minute service standard. The gap is measured but not attributed.':
    '15 मिनट के सेवा मानक के विरुद्ध माध्यक प्रतिक्रिया समय 22 मिनट है। यह अंतर मापा तो जाता है, पर उसका कारण तय नहीं होता।',
  'Average corridor travel time in peak is 31 minutes against 19 minutes off-peak. Fuel and time cost is estimated at ₹6.4 crore a year on these corridors alone.':
    'व्यस्त समय में गलियारे का औसत यात्रा समय 31 मिनट है, जबकि सामान्य समय में 19 मिनट। केवल इन्हीं गलियारों पर ईंधन और समय की लागत लगभग ₹6.4 करोड़ प्रतिवर्ष आँकी गई है।',
  'Deferred defect detection has led to four emergency closures in three years, each costing between ₹40 lakh and ₹1.2 crore in emergency works and diversion.':
    'दोषों की पहचान में देरी से तीन वर्षों में चार आपात बंदी हुईं, जिनमें से हर एक पर आपात कार्य और मार्ग परिवर्तन का खर्च ₹40 लाख से ₹1.2 करोड़ के बीच रहा।',
  'Camp utilisation averages 44 percent of planned footfall. Roughly ₹2.1 crore a year is spent on camps that reach fewer people than planned.':
    'शिविरों में उपस्थिति नियोजित संख्या की औसतन 44 प्रतिशत रहती है। ऐसे शिविरों पर प्रतिवर्ष लगभग ₹2.1 करोड़ खर्च होते हैं जो अपेक्षा से कम लोगों तक पहुँचते हैं।',
  'Estimated ₹5.7 crore a year billed for lights that were not burning, plus the safety cost of dark stretches.':
    'न जलने वाली बत्तियों का अनुमानित ₹5.7 करोड़ प्रतिवर्ष बिल बनता है, और अँधेरे हिस्सों की सुरक्षा-लागत इससे अलग है।',
  'Independent sampling suggests 19 percent of properties are under-assessed, worth roughly ₹31 crore a year in foregone demand.':
    'स्वतंत्र प्रतिदर्श से पता चलता है कि 19 प्रतिशत संपत्तियाँ कम-निर्धारित हैं, जिससे लगभग ₹31 करोड़ प्रतिवर्ष की माँग छूट जाती है।',

  /* ------------------------------------------------- current limitations */
  'Pumps have mechanical totalisers only. Odometer readings are entered by hand and are frequently rounded.':
    'पंपों पर केवल यांत्रिक कुल-मापक हैं। ओडोमीटर रीडिंग हाथ से दर्ज होती है और प्रायः गोल कर दी जाती है।',
  'Satellite passes are twice daily and cloud cover blocks a quarter of the season. Plot-level attribution needs a field visit.':
    'उपग्रह दिन में दो बार गुज़रता है और मौसम के एक-चौथाई भाग में बादल दृश्य रोक देते हैं। खेत-स्तर पर उत्तरदायित्व तय करने के लिए क्षेत्रीय दौरा आवश्यक है।',
  'Attendance is entered weekly and often in arrears. There is no signal that combines attendance with the other things schools already know.':
    'उपस्थिति साप्ताहिक और प्रायः विलंब से दर्ज होती है। ऐसा कोई संकेत नहीं है जो उपस्थिति को उन बातों से जोड़े जो विद्यालय पहले से जानते हैं।',
  'Segregation compliance is measured by spot inspection. There is no per-household record and no feedback to the household.':
    'पृथक्करण का पालन आकस्मिक निरीक्षण से मापा जाता है। न प्रति-परिवार अभिलेख है, न परिवार को कोई प्रतिपुष्टि जाती है।',
  'Templates cannot be changed without legal sign-off, and the legal position must survive translation into two languages.':
    'आदर्श प्रारूप विधिक अनुमोदन के बिना नहीं बदले जा सकते, और विधिक स्थिति को दो भाषाओं में अनुवाद के बाद भी अक्षुण्ण रहना चाहिए।',
  'Vehicle location is polled every 90 seconds. There is no live road-condition input and no way to model the effect of a reassignment.':
    'वाहन की स्थिति हर 90 सेकंड में ली जाती है। सड़क की वर्तमान दशा का कोई सजीव आगत नहीं है, और पुनर्नियुक्ति के प्रभाव का प्रतिरूपण करने का कोई तरीका नहीं।',
  'Existing controllers accept plan changes but there is no vehicle detection at most junctions and no corridor-level coordination.':
    'मौजूदा नियंत्रक योजना-परिवर्तन स्वीकार करते हैं, पर अधिकांश चौराहों पर वाहन-पहचान नहीं है और गलियारा-स्तर पर कोई समन्वय नहीं।',
  'Inspection is manual and its quality varies with access. Photographs are stored locally and not comparable year to year.':
    'निरीक्षण हाथ से होता है और उसकी गुणवत्ता पहुँच पर निर्भर करती है। चित्र स्थानीय रूप से रखे जाते हैं और वर्ष-दर-वर्ष तुलनीय नहीं होते।',
  'Scheduling uses a paper rotation. There is no view of which habitations have unmet need in a given quarter.':
    'कार्यक्रम काग़ज़ी चक्र से बनता है। यह देखने का कोई साधन नहीं कि किसी तिमाही में किन बस्तियों की आवश्यकता अपूर्ण है।',
  'No point-level metering. Fault location depends on someone reporting the right pole number.':
    'बिंदु-स्तर पर कोई मापन नहीं। खराबी का स्थान इस पर निर्भर करता है कि कोई सही खंभा संख्या बताए।',
  'Survey is manual and expensive. Imagery exists but is not tied to the assessment roll.':
    'सर्वेक्षण हाथ से होता है और महँगा है। चित्रण उपलब्ध तो है, पर निर्धारण-पंजी से जुड़ा नहीं।',

  /* ------------------------------------------------------ baseline metric */
  'Unexplained fuel draw as a share of total issue': 'कुल जारी ईंधन में अस्पष्ट निकासी का अनुपात',
  'Time from burning event to verified field response': 'जलने की घटना से सत्यापित क्षेत्रीय प्रतिक्रिया तक का समय',
  'Share of at-risk children identified before 30 days of absence':
    '30 दिन की अनुपस्थिति से पहले पहचाने गए जोखिमग्रस्त बच्चों का अनुपात',
  'Recyclable fraction recovered clean at the transfer point':
    'स्थानांतरण केंद्र पर स्वच्छ रूप में प्राप्त पुनर्चक्रण योग्य अंश',
  'Share of notices generating a counter visit for clarification':
    'स्पष्टीकरण हेतु काउंटर तक ले आने वाली सूचनाओं का अनुपात',
  'Median emergency response time': 'माध्यक आपात प्रतिक्रिया समय',
  'Average peak travel time on the corridor': 'गलियारे पर व्यस्त समय का औसत यात्रा समय',
  'Share of structures with a complete, comparable annual inspection record':
    'पूर्ण एवं तुलनीय वार्षिक निरीक्षण अभिलेख वाली संरचनाओं का अनुपात',
  'Outreach camp utilisation against planned footfall': 'नियोजित उपस्थिति के विरुद्ध शिविरों का उपयोग',
  'Average fault rectification time': 'औसत खराबी सुधार समय',
  'Share of properties whose assessed area matches the built area within tolerance':
    'ऐसी संपत्तियों का अनुपात जिनका निर्धारित क्षेत्रफल निर्मित क्षेत्रफल से सहनीय सीमा में मेल खाता है',

  /* ---------------------------------------------------------- the method */
  'Monthly depot fuel reconciliation against kilometres operated, twelve-month trailing average.':
    'संचालित किलोमीटर के विरुद्ध मासिक डिपो ईंधन मिलान, बारह माह का चल औसत।',
  'Median across the season of thermal anomaly timestamp to field verification form submission.':
    'ताप-विसंगति के समय-अंकन से क्षेत्रीय सत्यापन प्रपत्र जमा होने तक का, पूरे मौसम का माध्यक।',
  'Retrospective comparison of intervention records against the eventual dropout register.':
    'हस्तक्षेप अभिलेखों की, अंतिम विद्यालय-त्याग पंजी से पूर्वव्यापी तुलना।',
  'Weekly weighbridge and sort audit at the transfer station, eight-week rolling average.':
    'स्थानांतरण केंद्र पर साप्ताहिक तौल-सेतु एवं छँटाई लेखा-परीक्षा, आठ सप्ताह का चल औसत।',
  'Counter visit register matched to notice reference numbers over a six-month window.':
    'छह माह की अवधि में काउंटर आगमन पंजी का सूचना संदर्भ संख्याओं से मिलान।',
  'Call receipt timestamp to on-scene timestamp, median over 90 days, excluding inter-facility transfers.':
    'कॉल प्राप्ति से घटनास्थल पर पहुँचने तक का समय, 90 दिनों का माध्यक; अंतर-संस्थान स्थानांतरण को छोड़कर।',
  'Probe vehicle travel time, weekday peak, averaged over eight weeks.':
    'जाँच-वाहन का यात्रा समय, कार्यदिवस के व्यस्त समय में, आठ सप्ताह का औसत।',
  'Audit of inspection records against the prescribed inspection proforma.':
    'निर्धारित निरीक्षण प्रपत्र के विरुद्ध निरीक्षण अभिलेखों की लेखा-परीक्षा।',
  'Camp attendance register against planned footfall, all camps, four quarters.':
    'नियोजित उपस्थिति के विरुद्ध शिविर उपस्थिति पंजी; सभी शिविर, चार तिमाहियाँ।',
  'Complaint register timestamp to closure timestamp, six-month median.':
    'शिकायत पंजी के समय-अंकन से कार्य बंद होने के समय-अंकन तक, छह माह का माध्यक।',
  'Independent physical audit of a stratified 1,200-property sample.':
    '1,200 संपत्तियों के स्तरित प्रतिदर्श की स्वतंत्र भौतिक लेखा-परीक्षा।',

  /* -------------------------------------------------- where it comes from */
  'Depot fuel register and vehicle tracking logs': 'डिपो ईंधन पंजी एवं वाहन अनुवर्तन अभिलेख',
  'District agriculture office verification register': 'ज़िला कृषि कार्यालय सत्यापन पंजी',
  'District education management information system': 'ज़िला शिक्षा प्रबंधन सूचना प्रणाली',
  'Transfer station weighbridge and sort audit register': 'स्थानांतरण केंद्र तौल-सेतु एवं छँटाई लेखा पंजी',
  'Ward counter register and notice generation system': 'वार्ड काउंटर पंजी एवं सूचना निर्माण प्रणाली',
  'Emergency response centre call log': 'आपात प्रतिक्रिया केंद्र कॉल अभिलेख',
  'Traffic police corridor survey and probe data': 'यातायात पुलिस गलियारा सर्वेक्षण एवं जाँच आँकड़े',
  'Public works division inspection register': 'लोक निर्माण संभाग निरीक्षण पंजी',
  'Block health office camp register': 'खंड स्वास्थ्य कार्यालय शिविर पंजी',
  'Electrical division complaint register': 'विद्युत संभाग शिकायत पंजी',
  'Assessment roll and independent audit sample': 'निर्धारण-पंजी एवं स्वतंत्र लेखा-परीक्षा प्रतिदर्श',

  /* -------------------------------------------------------- target metric */
  'Unexplained fuel draw': 'अस्पष्ट ईंधन निकासी',
  'Time to verified field response': 'सत्यापित क्षेत्रीय प्रतिक्रिया तक का समय',
  'Early identification rate': 'शीघ्र पहचान दर',
  'Clean recyclable recovery': 'स्वच्छ पुनर्चक्रण योग्य सामग्री की प्राप्ति',
  'Counter visits for clarification': 'स्पष्टीकरण हेतु काउंटर आगमन',
  'Median response time': 'माध्यक प्रतिक्रिया समय',
  'Peak corridor travel time': 'व्यस्त समय में गलियारे का यात्रा समय',
  'Complete inspection coverage': 'पूर्ण निरीक्षण कवरेज',
  'Camp utilisation': 'शिविरों का उपयोग',
  'Fault rectification time': 'खराबी सुधार समय',
  'Assessment accuracy': 'निर्धारण की सटीकता',
});
