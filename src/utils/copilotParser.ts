// Intelligent Teams Copilot Meeting Summary & Text Parser for WJ Offenbach Resolutions

export interface ParsedResolution {
  title: string;
  motionText: string;
  description: string;
  requestedBudget?: number;
  category: 'Veranstaltungen & Projekte' | 'Finanzen & Budget' | 'Marketing & PR' | 'Kooperationen & Sponsoring' | 'Satzung & Verband' | 'Mitglieder & Ehrungen' | 'Sonstiges';
  deadline: string;
  detectedParticipants?: string[];
  confidence: number;
}

export function parseTeamsCopilotSummary(rawText: string): ParsedResolution {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Budget extraction
  let requestedBudget: number | undefined = undefined;
  // Matches patterns like "2.500 €", "2500 EUR", "Budget von 1.200,00 Euro", "Kosten: 500 €", "in Höhe von 3500 Euro"
  const budgetMatches = text.match(/(?:budget|kosten|höhe|betrag|summe|zuschuss|aufwand)?\s*(?:von|in Höhe von|ca\.|max\.?)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+)\s*(?:€|eur|euro)/i);
  if (budgetMatches && budgetMatches[1]) {
    let cleanNum = budgetMatches[1].replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanNum);
    if (!isNaN(parsed) && parsed > 0) {
      requestedBudget = parsed;
    }
  }

  // 2. Category Detection
  let category: ParsedResolution['category'] = 'Veranstaltungen & Projekte';
  if (lower.includes('finanz') || lower.includes('kasse') || lower.includes('konto') || lower.includes('steuer') || lower.includes('abschluss')) {
    category = 'Finanzen & Budget';
  } else if (lower.includes('marketing') || lower.includes('social media') || lower.includes('website') || lower.includes('flyer') || lower.includes('pr') || lower.includes('druck')) {
    category = 'Marketing & PR';
  } else if (lower.includes('sponsor') || lower.includes('kooperation') || lower.includes('partner') || lower.includes('ihk')) {
    category = 'Kooperationen & Sponsoring';
  } else if (lower.includes('satzung') || lower.includes('verband') || lower.includes('landesverband') || lower.includes('bundeskonferenz') || lower.includes('buko')) {
    category = 'Satzung & Verband';
  } else if (lower.includes('mitglied') || lower.includes('aufnahme') || lower.includes('ehrung') || lower.includes('senator')) {
    category = 'Mitglieder & Ehrungen';
  }

  // 3. Title Detection
  let title = '';
  // Try to find summary headline or topic line
  const titlePatterns = [
    /(?:thema|betreff|titel|beschluss|top|agenda|punkt)[:\-–]\s*([^\n\r]+)/i,
    /(?:beschluss über|freigabe von|antrag auf|bewilligung von)\s+([^\n\r.]+)/i,
    /^#+\s*(.+)$/m,
  ];

  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 5) {
      title = match[1].trim().replace(/^[*_#]+|[*_#]+$/g, '');
      break;
    }
  }

  if (!title) {
    // Take first non-empty line
    const firstLine = text.split('\n').map((l) => l.trim()).filter(Boolean)[0] || 'Vorstandsbeschluss';
    title = firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
  }

  // Ensure title starts cleanly
  if (!title.toLowerCase().startsWith('freigabe') && !title.toLowerCase().startsWith('beschluss') && !title.toLowerCase().startsWith('budget')) {
    if (requestedBudget) {
      title = `Freigabe Budget: ${title}`;
    }
  }

  // 4. Motion Text (Der Beschlussantrag / Kernformel)
  let motionText = '';
  // Search for action items / decision sentences
  const motionMatch = text.match(/(?:beschluss|entscheidung|ergebnis|beschlossen|antrag)[:\-–]?\s*([^\n\r]+(?:\n[^\n\r]+)?)/i);
  if (motionMatch && motionMatch[1] && motionMatch[1].trim().length > 15) {
    const extracted = motionMatch[1].trim().replace(/^[*_]+|[*_]+$/g, '');
    motionText = `Der Vorstand der Wirtschaftsjunioren Offenbach am Main beschließt: ${extracted}`;
  } else {
    motionText = `Der Vorstand der Wirtschaftsjunioren Offenbach am Main beschließt ${
      requestedBudget ? `die Bereitstellung eines Budgets von bis zu ${requestedBudget.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € für ` : 'die Umsetzung der Maßnahme '
    }"${title}".`;
  }

  // 5. Reasoning / Explanation (Sachverhalt)
  let description = '';
  // Extract context, discussion points or full text cleaned up
  const cleanSummaryLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.toLowerCase().includes('copilot') && !l.toLowerCase().includes('besprechungsprotokoll'))
    .slice(0, 8)
    .join('\n');

  description = cleanSummaryLines || `Entnommen aus der MS Teams Besprechungszusammenfassung zu "${title}".`;

  // 6. Deadline: Default 14 days
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 14);
  const deadline = targetDate.toISOString().split('T')[0];

  return {
    title,
    motionText,
    description,
    requestedBudget,
    category,
    deadline,
    confidence: requestedBudget ? 0.9 : 0.75,
  };
}

export interface ResolutionTemplate {
  id: string;
  name: string;
  category: ParsedResolution['category'];
  title: string;
  motionText: string;
  description: string;
  suggestedBudget?: number;
}

export const STANDARD_RESOLUTION_TEMPLATES: ResolutionTemplate[] = [
  {
    id: 'sommerfest',
    name: '🎉 Sommerfest & Networking-Event',
    category: 'Veranstaltungen & Projekte',
    title: 'Freigabe Budget WJ Sommerfest / Networking-Abend',
    motionText: 'Der Vorstand der Wirtschaftsjunioren Offenbach am Main beschließt die Bereitstellung eines Budgets von bis zu 2.500,00 € zur Durchführung des diesjährigen WJ Sommerfests inklusive Location-Miete, Catering und Getränke.',
    description: 'Jährliches Sommerfest zur Vernetzung unserer Mitglieder, Fördermitglieder und Interessenten. Angebote von lokalen Gastronomie- und Eventpartnern in Offenbach liegen vor.',
    suggestedBudget: 2500,
  },
  {
    id: 'marketing_flyer',
    name: '📢 Marketing, Flyer & Roll-Up Druck',
    category: 'Marketing & PR',
    title: 'Druckfreigabe neue Mitgliedsflyer & WJ Roll-Up Banner',
    motionText: 'Der Vorstand beschließt die Freigabe von bis zu 650,00 € für die Neugestaltung und den Druck von 500 Image-Flyern sowie 2 Roll-Up Bannern im aktuellen WJ Corporate Design.',
    description: 'Für kommende Messen, IHK-Empfänge und Mitgliederabende wird frisches Werbe- und Informationsmaterial benötigt.',
    suggestedBudget: 650,
  },
  {
    id: 'delegation',
    name: '🚆 Delegationsreise / Bundeskonferenz (BuKo)',
    category: 'Satzung & Verband',
    title: 'Zuschuss Delegierten-Teilnahme Bundeskonferenz (BuKo)',
    motionText: 'Der Vorstand beschließt die Übernahme der Tagungspauschalen und Reisekostenzuschüsse in Höhe von 1.200,00 € für die offizielle Delegationsgruppe des Kreisverbandes Offenbach.',
    description: 'Teilnahme an den satzungsgemäßen Delegiertenversammlungen des Bundesverbandes der Wirtschaftsjunioren Deutschland (WJD).',
    suggestedBudget: 1200,
  },
  {
    id: 'it_hosting',
    name: '💻 IT-Lizenzen, Domain & Cloud-Hosting',
    category: 'Finanzen & Budget',
    title: 'Verlängerung Domain, Webhosting & Vorstands-Tools',
    motionText: 'Der Vorstand genehmigt die laufenden jährlichen IT- und Hostingkosten in Höhe von 380,00 € für den Betrieb der Vereins-Webseite und die Vorstandsinfrastruktur.',
    description: 'Reguläre Verlängerung der Webhosting-Pakete, SSL-Zertifikate und E-Mail-Postfächer bei unserem Provider.',
    suggestedBudget: 380,
  },
  {
    id: 'sponsoring_projekt',
    name: '🤝 Sponsoring & Projektkooperation',
    category: 'Kooperationen & Sponsoring',
    title: 'Kooperationszuschuss Gründerpreis / Schulprojekt Offenbach',
    motionText: 'Der Vorstand beschließt einen Projektzuschuss von 1.000,00 € für das gemeinsame Kooperationsprojekt zur Förderung junger Unternehmer und Schüler in Offenbach.',
    description: 'Gemeinnütziges Engagement im Kreis Offenbach im Rahmen der WJ Bundesprojekte (z.B. "Ein Tag Azubi" oder Gründerförderung).',
    suggestedBudget: 1000,
  },
  {
    id: 'senator_honor',
    name: '🎖️ JCI Senatorenschaft / Ehrung',
    category: 'Mitglieder & Ehrungen',
    title: 'Antrag auf Verleihung der JCI Senatorenwürde / Kreis-Ehrung',
    motionText: 'Der Vorstand beschließt einstimmig, den Antrag auf Verleihung der JCI Senatorenwürde für ein verdientes Vorstands-/Alumni-Mitglied zu befürworten und die anfallenden Verbandsgebühren von 450,00 € zu übernehmen.',
    description: 'Besondere Würdigung langjährigen und herausragenden Engagements für die Wirtschaftsjunioren Offenbach am Main.',
    suggestedBudget: 450,
  },
];
