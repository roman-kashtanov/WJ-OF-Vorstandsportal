import React, { useState } from 'react';
import { 
  BoardMember, 
  Meeting, 
  Resolution, 
  AgendaItem 
} from '../types';
import { 
  X, 
  Calendar, 
  Video, 
  Plus, 
  Trash2, 
  Clock, 
  MapPin, 
  FileText 
} from 'lucide-react';

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (meetingData: Omit<Meeting, 'id'>) => void;
  members: BoardMember[];
  resolutions: Resolution[];
  defaultTeamsUrl?: string;
}

export const NewMeetingModal: React.FC<NewMeetingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  members,
  resolutions,
  defaultTeamsUrl,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Meeting['type']>('Reguläre Vorstandssitzung');
  
  // Default date: Next Tuesday 19:00
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const [date, setDate] = useState(nextWeek.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [location, setLocation] = useState('Online (MS Teams)');
  const [teamsUrl, setTeamsUrl] = useState(defaultTeamsUrl || 'https://teams.microsoft.com');
  const [description, setDescription] = useState('Monatliche Vorstandssitzung der Wirtschaftsjunioren Offenbach am Main e.V.');

  React.useEffect(() => {
    if (isOpen && defaultTeamsUrl) {
      setTeamsUrl(defaultTeamsUrl);
    }
  }, [isOpen, defaultTeamsUrl]);

  const [agenda, setAgenda] = useState<{ id: string; topNumber: string; title: string; presenter: string; durationMin: number; resolutionId?: string }[]>([
    { id: '1', topNumber: 'TOP 1', title: 'Eröffnung & Beschlussfähigkeit', presenter: 'Kreissprecher', durationMin: 10 },
    { id: '2', topNumber: 'TOP 2', title: 'Ressortberichte (Bildung, Events, Mitglieder)', presenter: 'Vorstand', durationMin: 25 },
    { id: '3', topNumber: 'TOP 3', title: 'Finanzen & Kassenbericht', presenter: 'Schatzmeister', durationMin: 15 },
    { id: '4', topNumber: 'TOP 4', title: 'Verschiedenes', presenter: 'Alle', durationMin: 10 },
  ]);

  if (!isOpen) return null;

  const handleAddTop = () => {
    const nextTopNum = `TOP ${agenda.length + 1}`;
    setAgenda([
      ...agenda,
      {
        id: Date.now().toString(),
        topNumber: nextTopNum,
        title: '',
        presenter: 'Vorstand',
        durationMin: 15,
      },
    ]);
  };

  const handleRemoveTop = (idx: number) => {
    setAgenda(agenda.filter((_, i) => i !== idx));
  };

  const handleUpdateTop = (idx: number, field: string, value: any) => {
    const updated = [...agenda];
    (updated[idx] as any)[field] = value;
    setAgenda(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !teamsUrl.trim()) return;

    onSubmit({
      title: title.trim(),
      type,
      date,
      startTime,
      endTime,
      location: location.trim(),
      teamsUrl: teamsUrl.trim(),
      description: description.trim(),
      isUpcoming: true,
      agenda: agenda.map((item, idx) => ({
        ...item,
        id: item.id || `top_${idx + 1}`,
        topNumber: item.topNumber || `TOP ${idx + 1}`,
        title: item.title.trim() || `Tagesordnungspunkt ${idx + 1}`,
      })),
      attendees: members.map((m) => ({
        memberId: m.id,
        memberName: m.name,
        status: 'accepted',
        updatedAt: new Date().toISOString(),
      })),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#003594] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Calendar className="w-5 h-5 text-[#00A3E0]" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Neue Vorstandssitzung einberufen
              </h3>
              <p className="text-xs text-slate-200">
                Inkl. MS Teams Besprechungslink & automatischer Agenda
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Sitzungstitel *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Reguläre Vorstandssitzung 04/2025"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Sitzungstyp *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Meeting['type'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
              >
                <option value="Reguläre Vorstandssitzung">Reguläre Vorstandssitzung</option>
                <option value="Außerordentliche Sitzung">Außerordentliche Sitzung</option>
                <option value="Klausurtagung">Klausurtagung</option>
                <option value="Jour Fixe">Jour Fixe</option>
              </select>
            </div>
          </div>

          {/* Date & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Datum *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Beginn (Uhrzeit) *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ende (Uhrzeit) *
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
              />
            </div>
          </div>

          {/* Location & MS Teams Link */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ort / Raum
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="IHK Offenbach am Main / MS Teams Hybrid"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
              />
            </div>

            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
              <label className="block font-bold text-[#003594] mb-1 flex items-center space-x-1.5">
                <Video className="w-4 h-4 text-[#00A3E0]" />
                <span>Microsoft Teams Besprechungslink *</span>
              </label>
              <input
                type="url"
                required
                value={teamsUrl}
                onChange={(e) => setTeamsUrl(e.target.value)}
                placeholder="https://teams.microsoft.com/l/meetup-join/..."
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-slate-900 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#003594]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Beschreibung & Hinweise
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Information für die Vorstandsmitglieder..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
            />
          </div>

          {/* Agenda Items */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">
                Tagesordnungspunkte (TOPs)
              </span>
              <button
                type="button"
                onClick={handleAddTop}
                className="text-xs font-bold text-[#003594] hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>TOP hinzufügen</span>
              </button>
            </div>

            <div className="space-y-2">
              {agenda.map((top, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="font-mono font-bold text-[11px] text-[#003594] w-12 shrink-0">
                    {top.topNumber}
                  </span>
                  <input
                    type="text"
                    required
                    value={top.title}
                    onChange={(e) => handleUpdateTop(idx, 'title', e.target.value)}
                    placeholder="Titel des TOPs"
                    className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    value={top.presenter}
                    onChange={(e) => handleUpdateTop(idx, 'presenter', e.target.value)}
                    placeholder="Referent"
                    className="w-28 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-600"
                  />
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={top.durationMin}
                    onChange={(e) => handleUpdateTop(idx, 'durationMin', parseInt(e.target.value) || 10)}
                    placeholder="Min"
                    className="w-14 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-600"
                  />
                  <span className="text-[10px] text-slate-400">Min.</span>

                  {agenda.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTop(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#003594] hover:bg-[#00266B] font-bold text-white transition-colors shadow-xs"
            >
              Sitzung anlegen & Einladungen versenden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
