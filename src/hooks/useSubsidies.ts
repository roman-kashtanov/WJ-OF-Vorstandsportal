import { useEffect, useState } from 'react';
import { Resolution, ResolutionAttachment, Subsidy, SubsidyPerson, SubsidyStatus } from '../types';
import { FirebaseSync } from '../utils/firebaseSync';
import { SubsidyStorage } from '../utils/storage';
import { generateSubsidyReceiptPdf } from '../utils/subsidyReceipt';

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
  /** = handleCreateResolution aus App.tsx */
  createResolution: (
    data: Omit<Resolution, 'id' | 'votes' | 'comments' | 'linkedInvoiceIds' | 'createdAt'>
  ) => Resolution;
  /** = handleAddAttachment aus App.tsx */
  addResolutionAttachment: (resolutionId: string, attachment: ResolutionAttachment) => void;
}

export function useSubsidies({
  resolutions,
  createResolution,
  addResolutionAttachment,
}: UseSubsidiesParams) {
  const [subsidies, setSubsidies] = useState<Subsidy[]>(() => SubsidyStorage.getSubsidies());
  const [subsidyPeople, setSubsidyPeople] = useState<SubsidyPerson[]>(() =>
    SubsidyStorage.getPeople()
  );
  const [subsidyYear, setSubsidyYear] = useState<number>(new Date().getFullYear());
  const [clubAccount, setClubAccount] = useState(() => SubsidyStorage.getClubAccount());
  const [isSubsidyModalOpen, setIsSubsidyModalOpen] = useState(false);
  const [editingSubsidy, setEditingSubsidy] = useState<Subsidy | null>(null);
  const [isSubsidyPeopleOpen, setIsSubsidyPeopleOpen] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);

  useEffect(() => SubsidyStorage.saveSubsidies(subsidies), [subsidies]);
  useEffect(() => SubsidyStorage.savePeople(subsidyPeople), [subsidyPeople]);

  const handleSaveSubsidy = (s: Subsidy) => {
    setSubsidies((prev) => {
      const exists = prev.some((x) => x.id === s.id);
      return exists ? prev.map((x) => (x.id === s.id ? s : x)) : [s, ...prev];
    });
    FirebaseSync.saveSubsidy(s).catch(() => {});
    setEditingSubsidy(null);
  };

  const handleDeleteSubsidy = (id: string) => {
    setSubsidies((prev) => prev.filter((x) => x.id !== id));
    FirebaseSync.deleteSubsidy(id).catch(() => {});
  };

  const handleUpdateSubsidyStatus = (id: string, status: SubsidyStatus) => {
    setSubsidies((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const now = new Date().toISOString();
        const updated: Subsidy = {
          ...x,
          status,
          approvedAt:
            status === 'bestaetigt' || status === 'bezahlt' ? x.approvedAt || now : x.approvedAt,
          paidAt: status === 'bezahlt' ? x.paidAt || now : undefined,
          bundledAt: status === 'im_beschluss' ? x.bundledAt || now : x.bundledAt,
          releasedAt: status === 'zur_zahlung_freigegeben' ? x.releasedAt || now : x.releasedAt,
        };
        FirebaseSync.saveSubsidy(updated).catch(() => {});
        return updated;
      })
    );
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
    setSubsidies((prev) =>
      prev.map((s) => {
        if (!subsidyIds.includes(s.id)) return s;
        const updated: Subsidy = {
          ...s,
          status: 'im_beschluss',
          resolutionId: newRes.id,
          bundledAt: now,
        };
        FirebaseSync.saveSubsidy(updated).catch(() => {});
        return updated;
      })
    );
  };

  /**
   * Markiert Zuschuesse als bezahlt und haengt pro Zuschuss eine
   * Nachweis-Zusammenfassung als PDF an den zugehoerigen Beschluss - das
   * Original-Nachweisfoto haengt dort bereits separat (aus dem Buendeln).
   */
  const handleMarkSubsidiesPaid = (ids: string[]) => {
    ids.forEach((id) => {
      handleUpdateSubsidyStatus(id, 'bezahlt');

      const subsidy = subsidies.find((s) => s.id === id);
      if (!subsidy?.resolutionId) return;
      const resolution = resolutions.find((r) => r.id === subsidy.resolutionId);
      if (!resolution) return;
      const person = subsidyPeople.find((p) => p.id === subsidy.personId);

      const attachment = generateSubsidyReceiptPdf(subsidy, person, resolution);
      addResolutionAttachment(resolution.id, attachment);
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
    setSubsidies((prev) => {
      let changed = false;
      const next = prev.map((s) => {
        if (s.status !== 'im_beschluss' || !s.resolutionId) return s;
        const res = resolutions.find((r) => r.id === s.resolutionId);
        if (!res) return s;
        if (res.status === 'angenommen') {
          changed = true;
          const updated: Subsidy = {
            ...s,
            status: 'zur_zahlung_freigegeben',
            releasedAt: new Date().toISOString(),
          };
          FirebaseSync.saveSubsidy(updated).catch(() => {});
          return updated;
        }
        if (res.status === 'abgelehnt') {
          changed = true;
          const updated: Subsidy = {
            ...s,
            status: 'bestaetigt',
            resolutionId: undefined,
            bundledAt: undefined,
          };
          FirebaseSync.saveSubsidy(updated).catch(() => {});
          return updated;
        }
        return s;
      });
      return changed ? next : prev;
    });
  }, [resolutions]);

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

  return {
    subsidies,
    setSubsidies,
    subsidyPeople,
    setSubsidyPeople,
    subsidyYear,
    setSubsidyYear,
    clubAccount,
    isSubsidyModalOpen,
    setIsSubsidyModalOpen,
    editingSubsidy,
    setEditingSubsidy,
    isSubsidyPeopleOpen,
    setIsSubsidyPeopleOpen,
    isPayoutOpen,
    setIsPayoutOpen,
    isBundleModalOpen,
    setIsBundleModalOpen,
    handleSaveSubsidy,
    handleDeleteSubsidy,
    handleUpdateSubsidyStatus,
    handleBundleSubsidies,
    handleMarkSubsidiesPaid,
    handleSaveSubsidyPerson,
    handleDeleteSubsidyPerson,
    handleSaveClubAccount,
  };
}
