import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, firebaseConfig } from '../lib/firebase';
import { 
  BoardMember, 
  Resolution, 
  Invoice, 
  Meeting, 
  SecuritySettings, 
  EmailNotificationLog, 
  InvoiceRequest, 
  InAppNotification,
  NotificationSettings,
  EmailServerConfig,
  AppVersionConfig,
  InvoiceFolder
} from '../types';

export interface FirebaseSyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  projectId: string;
  databaseId: string;
  error: string | null;
  pendingCount?: number;
}

// Global status listeners
type StatusListener = (status: FirebaseSyncStatus) => void;
const statusListeners: Set<StatusListener> = new Set();

let currentStatus: FirebaseSyncStatus = {
  isConnected: true,
  isSyncing: false,
  lastSyncedAt: null,
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
  error: null,
};

function updateStatus(updates: Partial<FirebaseSyncStatus>) {
  currentStatus = { ...currentStatus, ...updates };
  statusListeners.forEach((listener) => listener(currentStatus));
}

/**
 * Strips undefined properties recursively so Firestore setDoc never throws Unsupported field value errors
 */
function cleanData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}

export const FirebaseSync = {
  subscribeStatus(listener: StatusListener) {
    statusListeners.add(listener);
    listener(currentStatus);
    return () => {
      statusListeners.delete(listener);
    };
  },

  getStatus(): FirebaseSyncStatus {
    return currentStatus;
  },

  // Auto-bootstrap: Check if Firestore is empty, if so ensure security settings exist
  async autoInitCloudIfEmpty(initialData: {
    members: BoardMember[];
    resolutions: Resolution[];
    invoices: Invoice[];
    meetings: Meeting[];
    invoiceRequests: InvoiceRequest[];
    securitySettings: SecuritySettings;
    folders?: InvoiceFolder[];
  }) {
    try {
      updateStatus({ isSyncing: true });
      // Remove any legacy mock docs if they were previously created
      try {
        await deleteDoc(doc(db, 'resolutions', 'res_1')).catch(() => {});
        await deleteDoc(doc(db, 'invoices', 'inv_1')).catch(() => {});
        await deleteDoc(doc(db, 'meetings', 'meet_1')).catch(() => {});
        await deleteDoc(doc(db, 'invoiceRequests', 'req_1')).catch(() => {});
      } catch {}

      const snap = await getDocs(collection(db, 'members'));
      if (snap.empty && initialData.members.length > 0) {
        console.log('Firebase members empty. Syncing current members & settings to cloud...');
        await this.seedAllDataToCloud({
          ...initialData,
          resolutions: initialData.resolutions || [],
          invoices: initialData.invoices || [],
          meetings: initialData.meetings || [],
          invoiceRequests: initialData.invoiceRequests || [],
          folders: initialData.folders || [],
        });
      } else {
        updateStatus({ isConnected: true, isSyncing: false, lastSyncedAt: new Date().toISOString(), error: null });
      }
    } catch (err: any) {
      console.warn('Firebase autoInit info:', err?.message || err);
      updateStatus({ isSyncing: false, error: err?.message || 'Verbindung wird aufgebaut...' });
    }
  },

  // Listen to Resolutions collection in realtime
  subscribeResolutions(callback: (resolutions: Resolution[]) => void) {
    try {
      const q = collection(db, 'resolutions');
      return onSnapshot(
        q,
        (snapshot) => {
          const list: Resolution[] = snapshot.docs.map((docSnap) => docSnap.data() as Resolution);
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          callback(list);
          updateStatus({ isConnected: true, lastSyncedAt: new Date().toISOString(), error: null });
        },
        (err) => {
          console.warn('Firebase Resolutions subscription warning:', err.message);
          updateStatus({ error: err.message });
        }
      );
    } catch (e: any) {
      console.warn('Firebase sync error:', e);
      return () => {};
    }
  },

  // Direct fetch of all resolutions
  async fetchResolutions(): Promise<Resolution[]> {
    try {
      const snap = await getDocs(collection(db, 'resolutions'));
      const list: Resolution[] = snap.docs.map((d) => d.data() as Resolution);
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return list;
    } catch (err: any) {
      console.warn('Error fetching resolutions from Firebase:', err.message);
      return [];
    }
  },

  // Save or update a single resolution
  async saveResolution(resolution: Resolution) {
    try {
      updateStatus({ isSyncing: true });
      const payload = cleanData(resolution);
      await setDoc(doc(db, 'resolutions', resolution.id), payload, { merge: true });
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
      return { success: true };
    } catch (err: any) {
      console.error('Failed to save resolution to Firebase:', err);
      updateStatus({ isSyncing: false, error: err.message });
      return { success: false, error: err.message };
    }
  },

  // Delete a resolution
  async deleteResolution(resolutionId: string) {
    try {
      updateStatus({ isSyncing: true });
      await deleteDoc(doc(db, 'resolutions', resolutionId));
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to delete resolution from Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Listen to Invoices collection in realtime
  subscribeInvoices(callback: (invoices: Invoice[]) => void) {
    try {
      const q = collection(db, 'invoices');
      return onSnapshot(
        q,
        (snapshot) => {
          const list: Invoice[] = snapshot.docs.map((docSnap) => docSnap.data() as Invoice);
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          callback(list);
          updateStatus({ isConnected: true, lastSyncedAt: new Date().toISOString(), error: null });
        },
        (err) => {
          console.warn('Firebase Invoices subscription warning:', err.message);
          updateStatus({ error: err.message });
        }
      );
    } catch (e: any) {
      console.warn('Firebase sync error:', e);
      return () => {};
    }
  },

  // Save or update an invoice
  async saveInvoice(invoice: Invoice) {
    try {
      updateStatus({ isSyncing: true });
      const payload = cleanData(invoice);
      await setDoc(doc(db, 'invoices', invoice.id), payload, { merge: true });
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to save invoice to Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Delete an invoice
  async deleteInvoice(invoiceId: string) {
    try {
      updateStatus({ isSyncing: true });
      await deleteDoc(doc(db, 'invoices', invoiceId));
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to delete invoice from Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Listen to Invoice Folders collection in realtime
  subscribeInvoiceFolders(callback: (folders: any[]) => void) {
    try {
      const q = collection(db, 'invoiceFolders');
      return onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((docSnap) => docSnap.data());
          callback(list);
        },
        (err) => {
          console.warn('Firebase InvoiceFolders subscription warning:', err.message);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  // Save or update invoice folder
  async saveInvoiceFolder(folder: any) {
    try {
      updateStatus({ isSyncing: true });
      const payload = cleanData(folder);
      await setDoc(doc(db, 'invoiceFolders', folder.id), payload, { merge: true });
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to save invoice folder to Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Delete an invoice folder
  async deleteInvoiceFolder(folderId: string) {
    try {
      updateStatus({ isSyncing: true });
      await deleteDoc(doc(db, 'invoiceFolders', folderId));
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to delete invoice folder from Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Listen to Meetings collection in realtime
  subscribeMeetings(callback: (meetings: Meeting[]) => void) {
    try {
      const q = collection(db, 'meetings');
      return onSnapshot(
        q,
        (snapshot) => {
          const list: Meeting[] = snapshot.docs.map((docSnap) => docSnap.data() as Meeting);
          list.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
          callback(list);
          updateStatus({ isConnected: true, lastSyncedAt: new Date().toISOString(), error: null });
        },
        (err) => {
          console.warn('Firebase Meetings subscription warning:', err.message);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  // Save or update meeting
  async saveMeeting(meeting: Meeting) {
    try {
      updateStatus({ isSyncing: true });
      const payload = cleanData(meeting);
      await setDoc(doc(db, 'meetings', meeting.id), payload, { merge: true });
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to save meeting to Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Delete meeting
  async deleteMeeting(meetingId: string) {
    try {
      updateStatus({ isSyncing: true });
      await deleteDoc(doc(db, 'meetings', meetingId));
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to delete meeting from Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Listen to Members collection in realtime
  subscribeMembers(callback: (members: BoardMember[]) => void) {
    try {
      const q = collection(db, 'members');
      return onSnapshot(
        q,
        (snapshot) => {
          const list: BoardMember[] = snapshot.docs.map((docSnap) => docSnap.data() as BoardMember);
          if (list.length > 0) {
            list.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name));
            callback(list);
            updateStatus({ isConnected: true, lastSyncedAt: new Date().toISOString(), error: null });
          }
        },
        (err) => {
          console.warn('Firebase Members subscription warning:', err.message);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  // Save member to Firestore
  async saveMember(member: BoardMember) {
    try {
      updateStatus({ isSyncing: true });
      const payload = cleanData(member);
      await setDoc(doc(db, 'members', member.id), payload, { merge: true });
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to save member to Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Delete member from Firebase
  async deleteMember(memberId: string) {
    try {
      updateStatus({ isSyncing: true });
      await deleteDoc(doc(db, 'members', memberId));
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to delete member from Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Sync entire members list
  async syncAllMembers(membersList: BoardMember[]) {
    this.syncAllowlist(membersList).catch(() => {});
    try {
      updateStatus({ isSyncing: true });
      const snap = await getDocs(collection(db, 'members'));
      const currentRemoteIds = snap.docs.map((d) => d.id);
      const newIds = new Set(membersList.map((m) => m.id));

      // Remove deleted members from Firestore
      for (const remId of currentRemoteIds) {
        if (!newIds.has(remId)) {
          await deleteDoc(doc(db, 'members', remId));
        }
      }

      // Upsert new/updated members
      for (const m of membersList) {
        const payload = cleanData(m);
        await setDoc(doc(db, 'members', m.id), payload, { merge: true });
      }
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to syncAllMembers:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Listen to InvoiceRequests collection in realtime
  subscribeInvoiceRequests(callback: (requests: InvoiceRequest[]) => void) {
    try {
      const q = collection(db, 'invoiceRequests');
      return onSnapshot(
        q,
        (snapshot) => {
          const list: InvoiceRequest[] = snapshot.docs.map((docSnap) => docSnap.data() as InvoiceRequest);
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          callback(list);
          updateStatus({ isConnected: true, lastSyncedAt: new Date().toISOString(), error: null });
        },
        (err) => {
          console.warn('Firebase InvoiceRequests subscription warning:', err.message);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  // Save or update invoice request
  async saveInvoiceRequest(req: InvoiceRequest) {
    try {
      updateStatus({ isSyncing: true });
      const payload = cleanData(req);
      await setDoc(doc(db, 'invoiceRequests', req.id), payload, { merge: true });
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to save invoiceRequest to Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Delete invoice request
  async deleteInvoiceRequest(reqId: string) {
    try {
      updateStatus({ isSyncing: true });
      await deleteDoc(doc(db, 'invoiceRequests', reqId));
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to delete invoiceRequest from Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Subscribe to Security Settings
  subscribeSecuritySettings(callback: (settings: SecuritySettings) => void) {
    try {
      const docRef = doc(db, 'settings', 'security');
      return onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            callback(snap.data() as SecuritySettings);
          }
        },
        (err) => {
          console.warn('Firebase SecuritySettings subscription warning:', err.message);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  // Save Security Settings
  async saveSecuritySettings(settings: SecuritySettings) {
    try {
      updateStatus({ isSyncing: true });
      const payload = cleanData(settings);
      await setDoc(doc(db, 'settings', 'security'), payload, { merge: true });
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
    } catch (err: any) {
      console.warn('Failed to save security settings to Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
    }
  },

  // Initial Seed / Full Sync of existing local data into Firestore
  async seedAllDataToCloud(data: {
    members: BoardMember[];
    resolutions: Resolution[];
    invoices: Invoice[];
    meetings: Meeting[];
    invoiceRequests: InvoiceRequest[];
    securitySettings: SecuritySettings;
    folders?: InvoiceFolder[];
  }) {
    updateStatus({ isSyncing: true });
    try {
      // 1. Resolutions
      for (const res of data.resolutions) {
        await setDoc(doc(db, 'resolutions', res.id), cleanData(res), { merge: true });
      }
      // 2. Invoices
      for (const inv of data.invoices) {
        await setDoc(doc(db, 'invoices', inv.id), cleanData(inv), { merge: true });
      }
      // 3. Meetings
      for (const meet of data.meetings) {
        await setDoc(doc(db, 'meetings', meet.id), cleanData(meet), { merge: true });
      }
      // 4. Members
      for (const mem of data.members) {
        await setDoc(doc(db, 'members', mem.id), cleanData(mem), { merge: true });
      }
      // 5. Invoice Requests
      for (const req of data.invoiceRequests || []) {
        await setDoc(doc(db, 'invoiceRequests', req.id), cleanData(req), { merge: true });
      }
      // 6. Folders
      for (const folder of data.folders || []) {
        await setDoc(doc(db, 'invoiceFolders', folder.id), cleanData(folder), { merge: true });
      }
      // 7. Settings
      await setDoc(doc(db, 'settings', 'security'), cleanData(data.securitySettings), { merge: true });

      updateStatus({
        isConnected: true,
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        error: null,
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error seeding data to Firebase:', err);
      updateStatus({ isSyncing: false, error: err.message });
      return { success: false, error: err.message };
    }
  },

  // Subscribe to Meeting & Teams Settings
  subscribeMeetingSettings(callback: (settings: { defaultTeamsUrl?: string }) => void) {
    try {
      const docRef = doc(db, 'settings', 'meetingConfig');
      return onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            callback(snap.data() as { defaultTeamsUrl?: string });
          }
        },
        (err) => {
          console.warn('Firebase meetingConfig subscription warning:', err.message);
        }
      );
    } catch (e: any) {
      console.warn('Firebase meetingConfig sync error:', e);
      return () => {};
    }
  },

  // Save / Update Meeting & Teams Settings
  async saveMeetingSettings(settings: { defaultTeamsUrl?: string }) {
    try {
      updateStatus({ isSyncing: true });
      const docRef = doc(db, 'settings', 'meetingConfig');
      await setDoc(
        docRef,
        {
          ...settings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
      return { success: true };
    } catch (err: any) {
      console.warn('Failed to save meetingConfig to Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
      return { success: false, error: err.message };
    }
  },


  // ---------------------------------------------------------------------------
  // Push-Abos (ein Dokument pro Geraet). Liegen bewusst in einer eigenen
  // Sammlung, damit jedes Geraet die Abos aller anderen lesen und eine
  // Push-Nachricht ausloesen kann - auch wenn deren App geschlossen ist.
  // ---------------------------------------------------------------------------
  async savePushSubscription(entry: {
    id: string;
    memberId: string;
    memberName: string;
    subscription: any;
    userAgent?: string;
  }) {
    try {
      await setDoc(doc(db, 'pushSubscriptions', entry.id), cleanData({
        ...entry,
        updatedAt: new Date().toISOString(),
      }));
      return { success: true };
    } catch (err: any) {
      console.warn('Push-Abo konnte nicht gespeichert werden:', err?.message);
      return { success: false, error: err?.message };
    }
  },

  async deletePushSubscription(id: string) {
    try {
      await deleteDoc(doc(db, 'pushSubscriptions', id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  async fetchPushSubscriptions(): Promise<
    { id: string; memberId: string; memberName: string; subscription: any }[]
  > {
    try {
      const snap = await getDocs(collection(db, 'pushSubscriptions'));
      return snap.docs.map((d) => d.data() as any);
    } catch (err: any) {
      console.warn('Push-Abos konnten nicht geladen werden:', err?.message);
      return [];
    }
  },

  /** Entfernt Abos, die der Push-Dienst als abgelaufen gemeldet hat. */
  async removeExpiredPushSubscriptions(endpoints: string[]) {
    if (!endpoints || endpoints.length === 0) return;
    try {
      const all = await this.fetchPushSubscriptions();
      const stale = all.filter((s) => endpoints.includes(s.subscription?.endpoint));
      await Promise.all(stale.map((s) => deleteDoc(doc(db, 'pushSubscriptions', s.id))));
    } catch {
      /* stilles Aufraeumen */
    }
  },


  // ---------------------------------------------------------------------------
  // Freigabeliste (allowlist): steuert, welche Google-Konten ueberhaupt auf die
  // Datenbank zugreifen duerfen. Wird aus der Vorstandsliste abgeleitet.
  // ---------------------------------------------------------------------------
  /**
   * Traegt die E-Mail-Adressen aller Vorstandsmitglieder in die Freigabeliste ein.
   *
   * Bewusst NUR hinzufuegend: Eintraege werden hier niemals geloescht.
   * Frueher wurde alles entfernt, was zu keinem Mitglied passte - damit haette
   * der von Hand angelegte Erst-Eintrag des Administrators (der noch kein
   * Mitgliedsprofil hat) beim ersten Abgleich die eigene Aussperrung ausgeloest.
   * Entfernt wird eine Freigabe deshalb ausschliesslich beim gezielten Loeschen
   * eines Mitglieds (siehe removeFromAllowlist / deleteMember).
   */
  async syncAllowlist(membersList: BoardMember[]) {
    try {
      const wanted = membersList
        .map((m) => (m.email || '').toLowerCase().trim())
        .filter(Boolean);
      if (wanted.length === 0) return { success: true };

      const snap = await getDocs(collection(db, 'allowlist'));
      const existing = snap.docs.map((d) => d.id.toLowerCase().trim());

      const missing = wanted.filter((email) => !existing.includes(email));
      if (missing.length === 0) return { success: true };

      const batch = writeBatch(db);
      for (const email of missing) {
        batch.set(doc(db, 'allowlist', email), {
          aktiv: true,
          updatedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      return { success: true };
    } catch (err: any) {
      console.warn('Freigabeliste konnte nicht aktualisiert werden:', err?.message);
      return { success: false, error: err?.message };
    }
  },

  /** Einzelne Freigabe erteilen (z.B. direkt beim Anlegen eines Mitglieds). */
  async addToAllowlist(email: string) {
    const clean = (email || '').toLowerCase().trim();
    if (!clean) return { success: false, error: 'Keine E-Mail-Adresse' };
    try {
      await setDoc(doc(db, 'allowlist', clean), {
        aktiv: true,
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (err: any) {
      console.warn('Freigabe konnte nicht erteilt werden:', err?.message);
      return { success: false, error: err?.message };
    }
  },

  /** Freigabe gezielt entziehen - nur beim Entfernen eines Mitglieds. */
  async removeFromAllowlist(email: string) {
    const clean = (email || '').toLowerCase().trim();
    if (!clean) return { success: false };
    try {
      await deleteDoc(doc(db, 'allowlist', clean));
      return { success: true };
    } catch (err: any) {
      console.warn('Freigabe konnte nicht entzogen werden:', err?.message);
      return { success: false, error: err?.message };
    }
  },

  /**
   * Prueft die Freigabeliste in Firestore.
   *
   * 'allowed'      - E-Mail steht in der Liste
   * 'bootstrap'    - Liste ist noch leer (allererste Einrichtung)
   * 'not_allowed'  - Liste existiert, E-Mail steht nicht drin
   * 'unavailable'  - Liste nicht lesbar (offline, Datenbank fehlt, Regeln)
   *
   * Wichtig ist die Unterscheidung zwischen 'unavailable' und 'bootstrap':
   * Ein Lesefehler darf niemals zu einem Zugang fuehren, sonst kaeme jedes
   * beliebige Google-Konto herein, sobald die Datenbank nicht antwortet.
   */
  async getAllowlistState(
    email: string
  ): Promise<'allowed' | 'bootstrap' | 'not_allowed' | 'unavailable'> {
    try {
      const snap = await getDocs(collection(db, 'allowlist'));
      if (snap.empty) return 'bootstrap';
      const wanted = email.toLowerCase().trim();
      return snap.docs.some((d) => d.id.toLowerCase().trim() === wanted)
        ? 'allowed'
        : 'not_allowed';
    } catch (err: any) {
      console.warn('Freigabeliste nicht lesbar:', err?.message);
      return 'unavailable';
    }
  },

  /** Prueft, ob eine E-Mail in der Freigabeliste steht. */
  async isEmailAllowed(email: string): Promise<boolean> {
    const state = await this.getAllowlistState(email);
    return state === 'allowed' || state === 'bootstrap';
  },


  /**
   * Prueft konkret, ob Lesen UND Schreiben in Firestore moeglich ist.
   * Nur so faellt auf, wenn die Sicherheitsregeln alles blockieren - sonst
   * arbeitet die App still nur lokal weiter und nichts synchronisiert sich.
   */
  async checkConnection(): Promise<{ canRead: boolean; canWrite: boolean; error?: string }> {
    let canRead = false;
    try {
      await getDocs(collection(db, 'members'));
      canRead = true;
    } catch (err: any) {
      return { canRead: false, canWrite: false, error: err?.message || 'Lesen nicht moeglich' };
    }

    try {
      const probe = doc(db, 'diagnostics', 'connectionCheck');
      await setDoc(probe, { at: new Date().toISOString() }, { merge: true });
      return { canRead, canWrite: true };
    } catch (err: any) {
      return { canRead, canWrite: false, error: err?.message || 'Schreiben nicht moeglich' };
    }
  },

  // Subscribe to Version & Force-Update Config
  subscribeVersionConfig(callback: (config: AppVersionConfig) => void) {
    try {
      const docRef = doc(db, 'settings', 'versionConfig');
      return onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            callback(snap.data() as AppVersionConfig);
          }
        },
        (err) => {
          console.warn('Firebase version config subscription warning:', err.message);
        }
      );
    } catch (e: any) {
      console.warn('Firebase versionConfig sync error:', e);
      return () => {};
    }
  },

  // Save / Update Version & Force-Update Config in Cloud
  async saveVersionConfig(config: Partial<AppVersionConfig>) {
    try {
      updateStatus({ isSyncing: true });
      const docRef = doc(db, 'settings', 'versionConfig');
      await setDoc(
        docRef,
        {
          ...config,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      updateStatus({ isSyncing: false, lastSyncedAt: new Date().toISOString(), isConnected: true, error: null });
      return { success: true };
    } catch (err: any) {
      console.warn('Failed to save versionConfig to Firebase:', err.message);
      updateStatus({ isSyncing: false, error: err.message });
      return { success: false, error: err.message };
    }
  }
};

