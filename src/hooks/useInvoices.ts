import { useEffect, useState } from 'react';
import {
  ActiveTab,
  BoardMember,
  BookkeepingStatus,
  EmailNotificationLog,
  Invoice,
  InvoiceFolder,
  InvoiceRecurrence,
  InvoiceRequest,
  InvoiceStatus,
  NotificationSettings,
  NotificationType,
  Resolution,
} from '../types';
import { AppStorage } from '../utils/storage';
import { FirebaseSync } from '../utils/firebaseSync';
import { formatDate } from '../utils/formatters';

/**
 * Kapselt den Belege-Bereich (Rechnungen, Ordner, Anforderungen), 1:1 aus
 * App.tsx herausgeloest - reine Verschiebung, keine Verhaltensaenderung.
 * Fuenfter Schritt der Monolith-Auflösung von App.tsx (siehe CLAUDE.md).
 *
 * handleCreateInvoice schreibt bei Verknuepfung mit einem Beschluss direkt
 * in resolutions (setResolutions als Parameter) - die einzige echte
 * Cross-Domain-Abhaengigkeit dieses Bereichs neben Members/Notifications.
 */

type SystemBanner = { type: 'success' | 'info' | 'error'; title: string; message: string } | null;

interface UseInvoicesParams {
  currentMember: BoardMember;
  setResolutions: (updater: (prev: Resolution[]) => Resolution[]) => void;
  addInAppAndPushNotification: (notif: {
    title: string;
    message: string;
    type: NotificationType;
    targetTab?: ActiveTab;
    targetId?: string;
    recipientMemberIds?: string[];
  }) => void;
  handleAddEmailLog: (log: Omit<EmailNotificationLog, 'id' | 'sentAt'>) => void;
  notificationSettings: NotificationSettings;
  setSystemBanner: (banner: SystemBanner) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export function useInvoices({
  currentMember,
  setResolutions,
  addInAppAndPushNotification,
  handleAddEmailLog,
  notificationSettings,
  setSystemBanner,
  setActiveTab,
}: UseInvoicesParams) {
  const [invoices, setInvoices] = useState<Invoice[]>(() => AppStorage.getInvoices());
  const [folders, setFolders] = useState<InvoiceFolder[]>(() => AppStorage.getInvoiceFolders());
  const [invoiceRequests, setInvoiceRequests] = useState<InvoiceRequest[]>(() =>
    AppStorage.getInvoiceRequests()
  );
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isInvoiceRequestModalOpen, setIsInvoiceRequestModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    AppStorage.saveInvoices(invoices);
  }, [invoices]);

  useEffect(() => {
    AppStorage.saveInvoiceFolders(folders);
  }, [folders]);

  useEffect(() => {
    AppStorage.saveInvoiceRequests(invoiceRequests);
  }, [invoiceRequests]);

  const handleCreateInvoice = (data: Omit<Invoice, 'id' | 'createdAt'>) => {
    const newInvId = `inv_${Date.now()}`;
    const newInvoice: Invoice = {
      ...data,
      id: newInvId,
      createdAt: new Date().toISOString(),
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    FirebaseSync.saveInvoice(newInvoice).catch(() => {});

    // If linked to a resolution, update that resolution's linkedInvoiceIds
    if (data.resolutionId) {
      setResolutions((prev) =>
        prev.map((res) => {
          if (res.id === data.resolutionId) {
            const updatedRes = {
              ...res,
              linkedInvoiceIds: [...res.linkedInvoiceIds, newInvId],
            };
            FirebaseSync.saveResolution(updatedRes).catch(() => {});
            return updatedRes;
          }
          return res;
        })
      );
    }

    // Check if there was an open invoice request for this title and mark as completed
    setInvoiceRequests((prev) =>
      prev.map((req) =>
        req.projectTitle.toLowerCase() === data.title.toLowerCase() ||
        (data.resolutionId && req.resolutionId === data.resolutionId)
          ? { ...req, status: 'erledigt' as const }
          : req
      )
    );

    // Add In-App notification
    addInAppAndPushNotification({
      title: `📥 Neuer Beleg eingereicht: ${newInvoice.invoiceNumber}`,
      message: `${newInvoice.submittedBy.name} hat Beleg für "${newInvoice.title}" (${newInvoice.amount.toFixed(2)} €) hochgeladen.`,
      type: 'invoice',
      targetTab: 'invoices',
      targetId: newInvoice.id,
    });

    setActiveTab('invoices');
  };

  const handleToggleBookkeepingRecorded = (invoiceId: string, isRecorded: boolean) => {
    handleUpdateInvoiceBookkeepingStatus(invoiceId, isRecorded ? 'bearbeitet' : 'nicht_bearbeitet');
  };

  // 3 Optionen: 'bearbeitet' | 'nicht_bearbeitet' | 'nicht_notwendig'
  const handleUpdateInvoiceBookkeepingStatus = (invoiceId: string, status: BookkeepingStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const isBearbeitet = status === 'bearbeitet';
        const updatedInv: Invoice = {
          ...inv,
          bookkeepingStatus: status,
          isBookkeepingRecorded: isBearbeitet,
          bookkeepingRecordedAt: isBearbeitet ? new Date().toISOString() : undefined,
          bookkeepingRecordedBy: isBearbeitet ? `${currentMember.name} (${currentMember.role})` : undefined,
        };
        FirebaseSync.saveInvoice(updatedInv).catch(() => {});
        return updatedInv;
      })
    );
  };

  const handleCreateFolder = (name: string, color?: string, icon?: string) => {
    const newFolder: InvoiceFolder = {
      id: `folder_${Date.now()}`,
      name,
      color: color || '#003594',
      icon: icon || 'folder',
      createdAt: new Date().toISOString(),
      createdBy: currentMember.id,
    };
    setFolders((prev) => [...prev, newFolder]);
    FirebaseSync.saveInvoiceFolder(newFolder).catch(() => {});
    return newFolder;
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    FirebaseSync.deleteInvoiceFolder(folderId).catch(() => {});
    // Unassign invoices in this folder
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.folderId === folderId) {
          const updated = { ...inv, folderId: undefined };
          FirebaseSync.saveInvoice(updated).catch(() => {});
          return updated;
        }
        return inv;
      })
    );
  };

  const handleUpdateInvoiceFolder = (invoiceId: string, folderId: string | undefined) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const updated = { ...inv, folderId };
        FirebaseSync.saveInvoice(updated).catch(() => {});
        return updated;
      })
    );
  };

  const handleUpdateInvoiceRecurrence = (invoiceId: string, recurrence: InvoiceRecurrence | undefined) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const updated = { ...inv, recurrence };
        FirebaseSync.saveInvoice(updated).catch(() => {});
        return updated;
      })
    );
  };

  const handleUpdateInvoiceStatus = (invoiceId: string, newStatus: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const updatedInv = {
          ...inv,
          status: newStatus,
          reviewedBy: `${currentMember.name} (${currentMember.role})`,
          paidAt: newStatus === 'ausgezahlt' ? new Date().toISOString() : inv.paidAt,
        };
        FirebaseSync.saveInvoice(updatedInv).catch(() => {});
        return updatedInv;
      })
    );
  };

  const handleCreateInvoiceRequest = (request: Omit<InvoiceRequest, 'id' | 'createdAt'>) => {
    const newReq: InvoiceRequest = {
      ...request,
      id: `req_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setInvoiceRequests((prev) => [newReq, ...prev]);
    FirebaseSync.saveInvoiceRequest(newReq).catch(() => {});

    // Log the email notification
    handleAddEmailLog({
      type: 'invoice_request',
      recipientName: request.recipientName,
      recipientEmail: request.recipientEmail,
      subject: `[WJ Offenbach Beleg-Anforderung] ${request.projectTitle}`,
      status: 'zugestellt',
      resolutionId: request.resolutionId,
      details: `Beleg angefordert bis ${formatDate(request.deadline)} von ${currentMember.name}`,
    });

    // Dispatch In-App & Push notification
    if (notificationSettings.notifyOnInvoiceRequest) {
      addInAppAndPushNotification({
        title: `📩 Beleg-Anforderung: ${request.projectTitle}`,
        message: `Anforderung zur Einreichung an ${request.recipientName} (${request.recipientEmail}) versendet.`,
        type: 'invoice',
        targetTab: 'invoices',
      });
    }

    setSystemBanner({
      type: 'success',
      title: 'Rechnungsanforderung gespeichert & versendet',
      message: `Anforderung für "${request.projectTitle}" an ${request.recipientName} (${request.recipientEmail}) versendet.`,
    });
  };

  return {
    invoices,
    setInvoices,
    folders,
    setFolders,
    invoiceRequests,
    setInvoiceRequests,
    isNewInvoiceOpen,
    setIsNewInvoiceOpen,
    isInvoiceRequestModalOpen,
    setIsInvoiceRequestModalOpen,
    selectedInvoiceId,
    setSelectedInvoiceId,
    handleCreateInvoice,
    handleToggleBookkeepingRecorded,
    handleUpdateInvoiceBookkeepingStatus,
    handleCreateFolder,
    handleDeleteFolder,
    handleUpdateInvoiceFolder,
    handleUpdateInvoiceRecurrence,
    handleUpdateInvoiceStatus,
    handleCreateInvoiceRequest,
  };
}
