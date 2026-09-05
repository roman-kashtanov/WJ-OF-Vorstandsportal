import { useEffect, useState } from 'react';
import {
  ActiveTab,
  AuditLogEntry,
  BoardMember,
  NotificationSettings,
  NotificationType,
  Resolution,
  ResolutionAttachment,
  Subsidy,
  SubsidyPerson,
  SubsidyStatus,
  SubsidyKind,
} from '../types';
import { FirebaseSync } from '../utils/firebaseSync';
import { SubsidyStorage } from '../utils/storage';
import { generateSubsidyReceiptPdf } from '../utils/subsidyReceipt';
import { normalizeNameKey, STATUS_LABEL, subsidyKind, KIND_TEXTS } from '../utils/subsidies';
import { formatCurrency } from '../utils/formatters';
import { SubsidyCatalogueSettings, DEFAULT_SUBSIDY_CATALOGUE_SETTINGS } from '../data/subsidyCatalogue';
import { parseSubsidyBackupCsv } from '../utils/subsidyBackupCsv';

/**
 * Kapselt den kompletten Zuschuss-Bereich (Zuschuesse, Personen,
 * Auszahlung/SEPA), 1:1 aus App.tsx herausgeloest - reine Verschiebung,
 * keine Verhaltensaenderung. Erster Schritt der Monolith-Auflösung von
 * App.tsx (siehe CLAUDE.md).
 *
 * Zwei Funktionen aus der Resolutions-Domain werden als Parameter
 * hereingereicht statt importiert, weil sie selbst App.tsx-lokalen State
 * (resolutions) schreiben - so bleibt dieser Hook unabhaengig davon, ob/wie
 * die Resolutions-Domain irgendwann ebenfalls extrahiert wird.
 */

interface UseSubsidiesParams {
  resolutions: Resolution[];
  currentMember: BoardMember;
  /** = handleCreateResolution aus App.tsx */
  createResolution: (
    data: Omit<Resolution, 'id' | 'votes' | 'comments' | 'linkedInvoiceIds' | 'createdAt'>
  ) => Resolution;
  /** = handleAddAttachment aus App.tsx */
  addResolutionAttachment: (resolutionId: string, attachment: ResolutionAttachment) => void;
  addAuditLogEntry: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  /**
   * Fehler beim Speichern in die Cloud sichtbar machen. Vorher wurden sie
   * nur in die Browser-Konsole geschrieben - der naechste Firestore-Snapshot
   * hat die lokale Aenderung dann stillschweigend wieder ueberschrieben, und
   * es sah so aus, als haette der Klick einfach nichts getan.
   */
  setSystemBanner: (
    banner: { type: 'success' | 'info' | 'error'; title: string; message: string } | null
  ) => void;
  notificationSettings: NotificationSettings;
  addInAppAndPushNotification: (notif: {
    title: string;
    message: string;
    type: NotificationType;
    targetTab?: ActiveTab;
    targetId?: string;
    recipientMemberIds?: string[];
  }) => void;
}

export function useSubsidies({
  resolutions,
  currentMember,
  createResolution,
  addResolutionAttachment,
  addAuditLogEntry,
  setSystemBanner,
  notificationSettings,
  addInAppAndPushNotification,
}: UseSubsidiesParams) {
  const [subsidies, setSubsidies] = useState<Subsidy[]>(() => SubsidyStorage.getSubsidies());
  const [subsidyPeople, setSubsidyPeople] = useState<SubsidyPerson[]>(() =>
    SubsidyStorage.getPeople()
  );
  const [subsidyYear, setSubsidyYear] = useState<number>(new Date().getFullYear());
  const [clubAccount, setClubAccount] = useState(() => SubsidyStorage.getClubAccount());
  const [catalogueSettings, setCatalogueSettings] = useState<SubsidyCatalogueSettings>(() =>
    SubsidyStorage.getCatalogueSettings()
  );
  const [isSubsidyModalOpen, setIsSubsidyModalOpen] = useState(false);
  const [editingSubsidy, setEditingSubsidy] = useState<Subsidy | null>(null);
  const [isSubsidyPeopleOpen, setIsSubsidyPeopleOpen] = useState(false);
  const [isSubsidyCatalogueOpen, setIsSubsidyCatalogueOpen] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);

  useEffect(() => SubsidyStorage.saveSubsidies(subsidies), [subsidies]);
  useEffect(() => SubsidyStorage.savePeople(subsidyPeople), [subsidyPeople]);
  useEffect(() => SubsidyStorage.saveCatalogueSettings(catalogueSettings), [catalogueSettings]);

  const handleSaveSubsidy = (s: Subsidy) => {
    setSubsidies((prev) => {
      const exists = prev.some((x) => x.id === s.id);
      addAuditLogEntry({
        entityType: 'subsidy',
        entityId: s.id,
        entityLabel: `${s.personName} – ${s.eventName}`,
        action: exists ? 'Zuschuss bearbeitet' : 'Zuschuss erfasst',
        actorName: currentMember.name,
        actorId: currentMember.id,
      });
      return exists ? prev.map((x) => (x.id === s.id ? s : x)) : [s, ...prev];
    });
    FirebaseSync.saveSubsidy(s).catch(() => {});
    setEditingSubsidy(null);
  };

  const handleDeleteSubsidy = (id: string) => {
    setSubsidies((prev) => prev.filter((x) => x.id !== id));
    FirebaseSync.deleteSubsidy(id).catch(() => {});
  };

  /**
   * Meldet fehlgeschlagene Cloud-Schreibvorgaenge sichtbar.
   *
   * Wichtig, weil `applyRemote` in App.tsx die lokale Liste bei jedem
   * Firestore-Snapshot komplett ersetzt: Schlaegt ein Schreibvorgang fehl
   * (z. B. weil ein alter Zuschuss mit grossem Nachweisfoto ueber der
   * 1-MiB-Grenze liegt), springt der Zuschuss beim naechsten Snapshot
   * kommentarlos auf den alten Stand zurueck - fuer den Vorstand sah das
   * so aus, als haette der Klick nichts bewirkt.
   */
  const reportSaveFailures = (failed: { label: string; error?: string }[]) => {
    if (failed.length === 0) return;
    setSystemBanner({
      type: 'error',
      title: failed.length === 1 ? 'Ein Zuschuss wurde nicht gespeichert' : `${failed.length} Zuschüsse wurden nicht gespeichert`,
      message: `${failed.map((f) => f.label).join(', ')} – die Änderung gilt nur auf diesem Gerät und wird beim nächsten Abgleich überschrieben. Grund: ${
        failed[0].error || 'unbekannt'
      }`,
    });
    setTimeout(() => setSystemBanner(null), 12000);
  };

  const handleUpdateSubsidyStatus = (id: string, status: SubsidyStatus) => {
    const now = new Date().toISOString();
    const target = subsidies.find((x) => x.id === id);
    if (!target) return;

    const updated: Subsidy = {
      ...target,
      status,
      approvedAt:
        status === 'bestaetigt' || status === 'bezahlt' ? target.approvedAt || now : target.approvedAt,
      paidAt: status === 'bezahlt' ? target.paidAt || now : target.paidAt,
      bundledAt: status === 'im_beschluss' ? target.bundledAt || now : target.bundledAt,
      releasedAt:
        status === 'zur_zahlung_freigegeben' ? target.releasedAt || now : target.releasedAt,
    };

    setSubsidies((prev) => prev.map((x) => (x.id === id ? updated : x)));

    addAuditLogEntry({
      entityType: 'subsidy',
      entityId: target.id,
      entityLabel: `${target.personName} – ${target.eventName}`,
      action: `Status auf "${STATUS_LABEL[status]}" gesetzt`,
      actorName: currentMember.name,
      actorId: currentMember.id,
    });

    FirebaseSync.saveSubsidy(updated).then((res) => {
      if (!res?.success) {
        reportSaveFailures([
          { label: `${target.personName} – ${target.eventName}`, error: res?.error },
        ]);
      }
    });
  };

  /**
   * Haengt einen Zuschuss manuell an einen anderen (oder gar keinen) Beschluss -
   * die Ausnahme, wenn eine Buendelung schiefgelaufen ist oder ein Zuschuss
   * nachtraeglich einem tatsaechlich angenommenen Beschluss zugeordnet werden
   * muss, um "Zur Zahlung freigegeben" ueberhaupt waehlen zu koennen (siehe
   * die Sperre in SubsidiesView.tsx).
   */
  const handleReassignSubsidyResolution = (id: string, resolutionId: string | null) => {
    const target = subsidies.find((x) => x.id === id);
    if (!target) return;

    const now = new Date().toISOString();

    // Wird ein noch nicht gebuendelter Vorgang einem bestehenden Beschluss
    // zugeordnet, rueckt er damit in die Beschlussphase - genau wie beim
    // Buendeln ueber "Beschluss erstellen". Ist der Beschluss bereits
    // angenommen, gibt ihn die Kaskade weiter unten sofort zur Zahlung frei.
    const entersResolutionPhase =
      !!resolutionId && (target.status === 'beantragt' || target.status === 'bestaetigt');

    const updated: Subsidy = {
      ...target,
      resolutionId: resolutionId || undefined,
      status: entersResolutionPhase ? 'im_beschluss' : target.status,
      bundledAt: entersResolutionPhase ? target.bundledAt || now : target.bundledAt,
    };
    setSubsidies((prev) => prev.map((x) => (x.id === id ? updated : x)));

    addAuditLogEntry({
      entityType: 'subsidy',
      entityId: target.id,
      entityLabel: `${target.personName} – ${target.eventName}`,
      action: resolutionId
        ? entersResolutionPhase
          ? 'Einem bestehenden Beschluss zugeordnet'
          : 'Manuell einem anderen Beschluss zugeordnet'
        : 'Beschluss-Verknüpfung manuell entfernt',
      actorName: currentMember.name,
      actorId: currentMember.id,
    });

    FirebaseSync.saveSubsidy(updated).then((res) => {
      if (!res?.success) {
        reportSaveFailures([
          { label: `${target.personName} – ${target.eventName}`, error: res?.error },
        ]);
      }
    });
  };

  /**
   * Buendelt mehrere geprueften Zuschuesse zu einem neuen Vorstandsbeschluss
   * und markiert sie als "im_beschluss". Erst wenn dieser Beschluss
   * angenommen wird, greift die Kaskade weiter unten und gibt sie zur
   * Zahlung frei - siehe die Statuskette in SubsidyStatus (types.ts).
   */
  const handleBundleSubsidies = (
    subsidyIds: string[],
    resolutionData: Omit<Resolution, 'id' | 'votes' | 'comments' | 'linkedInvoiceIds' | 'createdAt'>
  ) => {
    const newRes = createResolution(resolutionData);
    const now = new Date().toISOString();

    // Bewusst ausserhalb des setSubsidies-Updaters berechnet: der Updater
    // darf keine Seiteneffekte enthalten (React ruft ihn im Dev-Modus
    // doppelt auf - das hat frueher Audit-Eintraege und Cloud-Schreibvorgaenge
    // verdoppelt) und wird nicht garantiert synchron ausgefuehrt.
    const updates = subsidies
      .filter((s) => subsidyIds.includes(s.id))
      .map<Subsidy>((s) => ({
        ...s,
        status: 'im_beschluss',
        resolutionId: newRes.id,
        bundledAt: now,
      }));

    const updatedById = new Map(updates.map((u) => [u.id, u]));
    setSubsidies((prev) => prev.map((s) => updatedById.get(s.id) || s));

    updates.forEach((u) =>
      addAuditLogEntry({
        entityType: 'subsidy',
        entityId: u.id,
        entityLabel: `${u.personName} – ${u.eventName}`,
        action: `Zu Beschluss ${newRes.number} gebündelt`,
        actorName: currentMember.name,
        actorId: currentMember.id,
      })
    );

    // Alle Schreibvorgaenge abwarten und Fehlschlaege melden - sonst
    // verschwindet die Verknuepfung beim naechsten Snapshot lautlos wieder
    // und der Beschluss haengt an weniger Zuschuessen als ausgewaehlt.
    Promise.all(
      updates.map(async (u) => {
        const res = await FirebaseSync.saveSubsidy(u);
        return res?.success ? null : { label: `${u.personName} – ${u.eventName}`, error: res?.error };
      })
    ).then((results) => {
      reportSaveFailures(results.filter((r): r is { label: string; error: any } => !!r));
    });
  };

  /**
   * Markiert Zuschuesse als bezahlt und haengt pro Zuschuss eine
   * Nachweis-Zusammenfassung als PDF an den zugehoerigen Beschluss - das
   * Original-Nachweisfoto haengt dort bereits separat (aus dem Buendeln).
   */
  const PAYOUT_FORMAT_LABEL: Record<'sepa-xml' | 'girocode-pdf', string> = {
    'sepa-xml': 'SEPA-Datei (XML)',
    'girocode-pdf': 'QR-Code-PDF (GiroCode)',
  };

  const handleMarkSubsidiesPaid = (ids: string[], format: 'sepa-xml' | 'girocode-pdf') => {
    ids.forEach((id) => {
      handleUpdateSubsidyStatus(id, 'bezahlt');

      const subsidy = subsidies.find((s) => s.id === id);
      if (!subsidy) return;

      // Sichtbar in der "Historie anzeigen" je Zuschuss - beantwortet "welche
      // Zahlungsdatei wurde wann in welchem Format erzeugt", ohne dafuer eine
      // eigene Firestore-Sammlung zu brauchen.
      addAuditLogEntry({
        entityType: 'subsidy',
        entityId: id,
        entityLabel: `${subsidy.personName} – ${subsidy.eventName}`,
        action: `Zahlungsdatei erzeugt (${PAYOUT_FORMAT_LABEL[format]}) und als bezahlt markiert`,
        actorName: currentMember.name,
        actorId: currentMember.id,
      });

      if (!subsidy.resolutionId) return;
      const resolution = resolutions.find((r) => r.id === subsidy.resolutionId);
      if (!resolution) return;
      const person = subsidyPeople.find((p) => p.id === subsidy.personId);

      const attachment = generateSubsidyReceiptPdf(subsidy, person, resolution);
      addResolutionAttachment(resolution.id, attachment);
    });
  };

  /**
   * Reine Protokoll-Notiz, wenn eine Zahlungsdatei fuer einen bereits
   * bezahlten Zuschuss erneut heruntergeladen wird (Reiter "Erledigt") -
   * die eigentliche Datei wird clientseitig aus den aktuellen Daten neu
   * erzeugt (deterministisch, IBAN/Betrag/Verwendungszweck aendern sich im
   * Nachhinein nicht), es muss also nichts gespeichert werden ausser dieser
   * Nachvollziehbarkeits-Notiz.
   */
  const handleLogPaymentFileRegenerated = (id: string, format: 'sepa-xml' | 'girocode-pdf') => {
    const subsidy = subsidies.find((s) => s.id === id);
    if (!subsidy) return;
    addAuditLogEntry({
      entityType: 'subsidy',
      entityId: id,
      entityLabel: `${subsidy.personName} – ${subsidy.eventName}`,
      action: `Zahlungsdatei erneut heruntergeladen (${PAYOUT_FORMAT_LABEL[format]})`,
      actorName: currentMember.name,
      actorId: currentMember.id,
    });
  };

  /**
   * Reaktive Kaskade: sobald ein Beschluss, an den Zuschuesse gebuendelt
   * sind, angenommen oder abgelehnt wird, folgen die Zuschuesse automatisch.
   *
   * Bewusst NICHT in handleVoteForMember verdrahtet: Stimmen per E-Mail-Link
   * aendern den Beschluss-Status serverseitig direkt in Firestore (api/vote.ts),
   * nie ueber handleVoteForMember. Nur ein Effekt, der auf den resolutions-State
   * selbst reagiert, erfasst beide Wege gleichermassen - egal ob der
   * Statuswechsel lokal oder durch die Live-Firestore-Subscription hereinkam.
   */
  useEffect(() => {
    // Sammelt pro Beschluss, wie viele/welcher Betrag an Zuschuessen in
    // diesem Durchlauf zur Auszahlung freigegeben wurden - fuer EINE
    // gebuendelte Benachrichtigung statt einer pro Einzelzuschuss (ein
    // Sammelbeschluss kann mehrere Zuschuesse gleichzeitig freigeben).
    //
    // Bewusst AUSSERHALB des setSubsidies-Updaters berechnet (auf Basis von
    // `subsidies` aus dem Hook-State, nicht `prev` im Updater): der an
    // setState uebergebene Updater wird von React nicht garantiert
    // synchron mit diesem Aufruf ausgefuehrt (insbesondere im Dev-Modus mit
    // StrictMode), Code direkt danach saehe eine noch leere Map. Diese
    // Berechnung hier ist rein lesend, hat also keine solche Race Condition.
    const releasedByResolution = new Map<
      string,
      { count: number; total: number; kind: SubsidyKind }
    >();
    for (const s of subsidies) {
      if (s.status !== 'im_beschluss' || !s.resolutionId) continue;
      const res = resolutions.find((r) => r.id === s.resolutionId);
      if (res?.status !== 'angenommen') continue;
      const entry = releasedByResolution.get(res.id) || {
        count: 0,
        total: 0,
        kind: subsidyKind(s),
      };
      entry.count += 1;
      entry.total += s.amount || 0;
      releasedByResolution.set(res.id, entry);
    }

    // Die Statuswechsel werden - wie beim Buendeln - ausserhalb des
    // setSubsidies-Updaters berechnet, damit keine Seiteneffekte im Updater
    // stehen und Schreibfehler gemeldet werden koennen.
    const cascadeUpdates: Subsidy[] = [];
    for (const s of subsidies) {
      if (s.status !== 'im_beschluss' || !s.resolutionId) continue;
      const res = resolutions.find((r) => r.id === s.resolutionId);
      if (!res) continue;
      if (res.status === 'angenommen') {
        cascadeUpdates.push({
          ...s,
          status: 'zur_zahlung_freigegeben',
          releasedAt: new Date().toISOString(),
        });
      } else if (res.status === 'abgelehnt') {
        cascadeUpdates.push({
          ...s,
          status: 'bestaetigt',
          resolutionId: undefined,
          bundledAt: undefined,
        });
      }
    }

    if (cascadeUpdates.length > 0) {
      const byId = new Map(cascadeUpdates.map((u) => [u.id, u]));
      setSubsidies((prev) => prev.map((s) => byId.get(s.id) || s));

      Promise.all(
        cascadeUpdates.map(async (u) => {
          const res = await FirebaseSync.saveSubsidy(u);
          return res?.success
            ? null
            : { label: `${u.personName} – ${u.eventName}`, error: res?.error };
        })
      ).then((results) => {
        reportSaveFailures(results.filter((r): r is { label: string; error: any } => !!r));
      });
    }

    if (notificationSettings.notifyOnQuorumReached) {
      releasedByResolution.forEach(({ count, total, kind }, resolutionId) => {
        const res = resolutions.find((r) => r.id === resolutionId);
        const texts = KIND_TEXTS[kind];
        const subject =
          count === 1
            ? `1 ${texts.singular} (${formatCurrency(total)})`
            : `${count} ${texts.plural} (${formatCurrency(total)})`;
        addInAppAndPushNotification({
          title: `💶 ${texts.plural} zur Auszahlung bereit`,
          message: `${subject} aus "${res?.title || 'einem Sammelbeschluss'}" ${
            count === 1 ? 'kann' : 'können'
          } jetzt überwiesen werden.`,
          type: 'subsidy',
          targetTab: kind === 'auslage' ? 'expenses' : 'subsidies',
        });
      });
    }
  }, [resolutions]);

  /**
   * Anträge für Veranstaltungen, die noch nicht stattgefunden haben,
   * starten im eigenen Status "nicht_stattgefunden" (siehe api/subsidy.ts) -
   * sobald das Veranstaltungsdatum erreicht ist, rutschen sie automatisch
   * in die normale Prüfung. Gleiches Kaskaden-Muster wie oben beim
   * Beschluss-Status: der "changed"-Guard verhindert eine Endlosschleife,
   * weil setSubsidies(prev) bei unveraendertem Ergebnis dieselbe Referenz
   * zurueckgibt.
   */
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSubsidies((prev) => {
      let changed = false;
      const next = prev.map((s) => {
        if (s.status !== 'nicht_stattgefunden' || !s.eventDate || s.eventDate > today) return s;
        changed = true;
        const updated: Subsidy = { ...s, status: 'beantragt' };
        FirebaseSync.saveSubsidy(updated).catch(() => {});
        return updated;
      });
      return changed ? next : prev;
    });
  }, [subsidies]);

  /**
   * Fasst zwei Personen-Eintraege zusammen, die vermutlich dieselbe Person
   * sind (z. B. Name mal andersrum geschrieben) - haengt alle Zuschuesse der
   * Duplikat-Person auf den behaltenen Eintrag um.
   */
  const handleMergeSubsidyPeople = (keepId: string, mergeId: string) => {
    if (keepId === mergeId) return;
    const keepName = subsidyPeople.find((p) => p.id === keepId)?.name;
    setSubsidies((prev) =>
      prev.map((s) => {
        if (s.personId !== mergeId) return s;
        const updated: Subsidy = { ...s, personId: keepId, personName: keepName || s.personName };
        FirebaseSync.saveSubsidy(updated).catch(() => {});
        return updated;
      })
    );
    setSubsidyPeople((prev) => prev.filter((p) => p.id !== mergeId));
    FirebaseSync.deleteSubsidyPerson(mergeId).catch(() => {});
  };

  /**
   * Liest die Sicherungsdatei ein, die das oeffentliche Formular als
   * Ruecksicherung anbietet, und legt Person + Zuschuss lokal genauso an,
   * wie es ein erfolgreich uebertragener Antrag getan haette (ohne Anhaenge -
   * die kommen separat per E-Mail). Dieselbe Betragskappung/Status-Logik wie
   * in api/subsidy.ts handleSubmitSubsidy, damit beide Wege gleich rechnen.
   */
  const handleImportSubsidyCsv = (text: string): { ok: true } | { ok: false; error: string } => {
    const parsed = parseSubsidyBackupCsv(text);
    if (!parsed) {
      return { ok: false, error: 'Diese Datei sieht nicht wie eine WJOF-Sicherungsdatei aus.' };
    }
    const entry = catalogueSettings.entries.find((e) => e.key === parsed.eventKey);
    if (!entry) {
      return { ok: false, error: 'Unbekannte Veranstaltung in der Sicherungsdatei.' };
    }

    const nameKey = normalizeNameKey(parsed.personName);
    let person = subsidyPeople.find(
      (p) => normalizeNameKey(p.name) === nameKey && (!parsed.iban || p.iban === parsed.iban)
    );
    const now = new Date().toISOString();
    if (!person) {
      person = {
        id: `csv_${Date.now()}`,
        name: parsed.personName,
        type: 'interessent',
        email: parsed.personEmail || undefined,
        iban: parsed.iban || undefined,
        bic: parsed.bic || undefined,
        accountHolder: parsed.accountHolder || undefined,
        isActive: true,
        note: 'Aus Sicherungsdatei importiert',
        createdAt: now,
      };
      handleSaveSubsidyPerson(person);
    }

    const isFuture = parsed.eventDate > now.slice(0, 10);
    const subsidy: Subsidy = {
      id: `csv_${Date.now()}`,
      personId: person.id,
      personName: person.name,
      category: entry.category,
      eventKey: entry.key,
      eventName: entry.label,
      eventDate: parsed.eventDate || undefined,
      amount: Math.min(entry.amount, parsed.actualCost),
      actualCost: parsed.actualCost,
      status: isFuture ? 'nicht_stattgefunden' : 'beantragt',
      source: 'public',
      appliedAt: now,
      proofState: 'offen',
      costProofState: 'offen',
      note: parsed.comment || undefined,
      year: new Date().getFullYear(),
      createdAt: now,
    };
    handleSaveSubsidy(subsidy);
    return { ok: true };
  };

  const handleSaveSubsidyPerson = (person: SubsidyPerson) => {
    setSubsidyPeople((prev) => {
      const exists = prev.some((p) => p.id === person.id);
      return exists ? prev.map((p) => (p.id === person.id ? person : p)) : [...prev, person];
    });
    FirebaseSync.saveSubsidyPerson(person).catch(() => {});

    // Name in bereits erfassten Zuschuessen mitfuehren
    setSubsidies((prev) =>
      prev.map((s) => (s.personId === person.id ? { ...s, personName: person.name } : s))
    );
  };

  const handleDeleteSubsidyPerson = (id: string) => {
    setSubsidyPeople((prev) => prev.filter((p) => p.id !== id));
    FirebaseSync.deleteSubsidyPerson(id).catch(() => {});
  };

  const handleSaveClubAccount = (a: { name: string; iban: string; bic?: string }) => {
    setClubAccount(a);
    SubsidyStorage.saveClubAccount(a);
  };

  /**
   * Speichert den admin-editierbaren Zuschuss-Katalog (Veranstaltungen +
   * Jahres-Obergrenzen) - lokal, per Firestore synchronisiert (siehe
   * subscribeSubsidyCatalogueSettings in App.tsx) und im Backend gelesen
   * (api/subsidy.ts::loadCatalogueSettings), damit /antrag denselben Stand
   * sieht wie die Admin-Ansicht.
   */
  const handleSaveCatalogueSettings = (settings: SubsidyCatalogueSettings) => {
    setCatalogueSettings(settings);
    FirebaseSync.saveSubsidyCatalogueSettings(settings).catch(() => {});
  };

  const handleResetCatalogueToDefault = () => {
    handleSaveCatalogueSettings(DEFAULT_SUBSIDY_CATALOGUE_SETTINGS);
  };

  return {
    subsidies,
    setSubsidies,
    subsidyPeople,
    setSubsidyPeople,
    subsidyYear,
    setSubsidyYear,
    clubAccount,
    catalogueSettings,
    setCatalogueSettings,
    isSubsidyModalOpen,
    setIsSubsidyModalOpen,
    editingSubsidy,
    setEditingSubsidy,
    isSubsidyPeopleOpen,
    setIsSubsidyPeopleOpen,
    isSubsidyCatalogueOpen,
    setIsSubsidyCatalogueOpen,
    isPayoutOpen,
    setIsPayoutOpen,
    isBundleModalOpen,
    setIsBundleModalOpen,
    handleSaveSubsidy,
    handleDeleteSubsidy,
    handleUpdateSubsidyStatus,
    handleReassignSubsidyResolution,
    handleBundleSubsidies,
    handleMarkSubsidiesPaid,
    handleLogPaymentFileRegenerated,
    handleSaveSubsidyPerson,
    handleDeleteSubsidyPerson,
    handleSaveClubAccount,
    handleMergeSubsidyPeople,
    handleImportSubsidyCsv,
    handleSaveCatalogueSettings,
    handleResetCatalogueToDefault,
  };
}
