import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Search,
  ShieldAlert,
} from 'lucide-react';
import {
  ALERT_CLASSIFICATION_SPECS,
  RESEARCH_DOMAINS,
} from '../engine/researchCatalog';
import {
  AlertSeverity,
  NavTab,
  ResearchDomainId,
  ResearchParameterRow,
  SystemId,
} from '../types/telemetry';

interface ResearchMatrixSectionProps {
  rows: ResearchParameterRow[];
  onInspectOrgan: (systemId: SystemId) => void;
  onOpenCheckIn: (preset?: SystemId) => void;
  onNavigateTab?: (tab: NavTab) => void;
}

type DomainFilter = ResearchDomainId | 'all' | 'classifications';
type StatusFilter = 'all' | 'flagged' | 'nasa';

const STATUS_DISPLAY: Record<AlertSeverity, { label: string; cls: string }> = {
  nominal: { label: '● Normal', cls: 'text-emerald-400' },
  caution: { label: '▲ Watch', cls: 'text-amber-400' },
  urgent: { label: '✖ Alert', cls: 'text-rose-400' },
  'data-quality': { label: '◌ Stale', cls: 'text-zinc-400' },
};

export const ResearchMatrixSection: React.FC<ResearchMatrixSectionProps> = ({
  rows,
  onInspectOrgan,
  onOpenCheckIn,
  onNavigateTab,
}) => {
  const [activeDomain, setActiveDomain] = useState<DomainFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [expandAll, setExpandAll] = useState(false);

  const flaggedTotal = rows.filter((r) => r.severity !== 'nominal').length;
  const nasaBackedTotal = rows.filter((r) => !!r.standardCitation).length;

  const flaggedByDomain = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.severity !== 'nominal') {
        counts[r.domainId] = (counts[r.domainId] ?? 0) + 1;
      }
    }
    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (activeDomain === 'classifications') return [];
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (activeDomain !== 'all' && row.domainId !== activeDomain) return false;
      if (statusFilter === 'flagged' && row.severity === 'nominal') return false;
      if (statusFilter === 'nasa' && !row.standardCitation) return false;
      if (!q) return true;
      return (
        row.monitorTopic.toLowerCase().includes(q) ||
        row.domainLabel.toLowerCase().includes(q) ||
        row.subSection.toLowerCase().includes(q) ||
        row.triggerClass.toLowerCase().includes(q) ||
        row.baselineTarget.toLowerCase().includes(q) ||
        row.whenAppAlerts.toLowerCase().includes(q) ||
        row.whatAppDoes.toLowerCase().includes(q) ||
        (row.standardCitation ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, activeDomain, statusFilter, searchQuery]);

  const toggleRow = (id: string) => {
    setExpandedRowIds((prev) => ({
      ...prev,
      [id]: !(expandAll ? prev[id] !== false : prev[id]),
    }));
  };

  const handleToggleExpandAll = () => {
    const next = !expandAll;
    setExpandAll(next);
    setExpandedRowIds({});
  };

  const activeDomainMeta = RESEARCH_DOMAINS.find((d) => d.id === activeDomain);

  return (
    <section className="reveal-up glass-3d rounded-3xl p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 tabular-nums">
            <span>Core 5 Hazards</span>
            <span aria-hidden="true">·</span>
            <span>{rows.length} Parameter Modules</span>
            <span aria-hidden="true">·</span>
            <span>{nasaBackedTotal} NASA-STD-3001</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Core 5 Spaceflight Hazards
          </h2>
        </div>

        {/* Status Filter Segmented Controls + Expand All */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="glass-3d-recessed flex items-center gap-1 rounded-xl p-1 text-xs sm:text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                if (activeDomain === 'classifications') setActiveDomain('all');
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'all' && activeDomain !== 'classifications'
                  ? 'bg-white text-zinc-950 font-bold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              All ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeDomain === 'classifications') setActiveDomain('all');
                setStatusFilter('flagged');
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'flagged' && activeDomain !== 'classifications'
                  ? 'bg-amber-400 text-zinc-950 font-bold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Flagged ({flaggedTotal})
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeDomain === 'classifications') setActiveDomain('all');
                setStatusFilter('nasa');
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'nasa' && activeDomain !== 'classifications'
                  ? 'bg-white text-zinc-950 font-bold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              NASA-STD
            </button>
          </div>

          {activeDomain !== 'classifications' && (
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="btn-mono-glass px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer"
            >
              {expandAll ? 'Collapse' : 'Expand All'}
            </button>
          )}
        </div>
      </div>

      {/* Domain Navigation Tabs + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveDomain('all')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
              activeDomain === 'all'
                ? 'bg-white border-white text-zinc-950 font-bold'
                : 'glass-3d-recessed text-zinc-300 hover:text-white hover:border-white/30'
            }`}
          >
            All 5 Hazards
          </button>
          {RESEARCH_DOMAINS.map((dom) => {
            const active = activeDomain === dom.id;
            const flagCount = flaggedByDomain[dom.id] ?? 0;
            return (
              <button
                key={dom.id}
                type="button"
                onClick={() => setActiveDomain(dom.id)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-white border-white text-zinc-950 font-bold'
                    : 'glass-3d-recessed text-zinc-300 hover:text-white hover:border-white/30'
                }`}
              >
                <span>{dom.number}. {dom.shortTitle}</span>
                {flagCount > 0 && (
                  <span
                    className={`tabular-nums text-xs font-bold ${
                      active ? 'text-amber-700' : 'text-amber-400'
                    }`}
                  >
                    ({flagCount})
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setActiveDomain('classifications')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
              activeDomain === 'classifications'
                ? 'bg-white border-white text-zinc-950 font-bold'
                : 'glass-3d-recessed text-zinc-300 hover:text-white hover:border-white/30'
            }`}
          >
            Alerts (9)
          </button>
        </div>

        {activeDomain !== 'classifications' && (
          <div className="relative min-w-[230px]">
            <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hazards or triggers..."
              aria-label="Search research parameters"
              className="glass-3d-recessed w-full rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:border-white/35"
            />
          </div>
        )}
      </div>

      {/* Active Domain Brief */}
      {activeDomainMeta && (
        <div className="glass-3d-recessed rounded-2xl px-4 py-3 text-sm text-zinc-300 flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong className="text-white">{activeDomainMeta.title}:</strong>{' '}
            {activeDomainMeta.summary}
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab(activeDomainMeta.targetTab)}
              className="text-xs font-semibold text-white hover:text-zinc-300 inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              Open Module <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* View Mode A: Alert & Trigger Classification Reference */}
      {activeDomain === 'classifications' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-400/35 bg-amber-500/12 p-4 flex items-start gap-3 text-sm text-amber-100">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Clinical Scope:</strong>{' '}
              Supports crew self-monitoring and escalation only; never diagnoses disease, estimates radiation dose from symptoms, issues independent all-clears, or grants EVA/duty clearance.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {ALERT_CLASSIFICATION_SPECS.map((spec) => (
              <div
                key={spec.id}
                className="glass-3d-sub glass-3d-interactive rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">{spec.label}</h3>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{spec.definition}</p>
                <div className="text-xs text-zinc-400 pt-1.5 border-t border-white/10">
                  {spec.authorityBoundary}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRows.length === 0 ? (
            <div className="glass-3d-recessed rounded-2xl p-6 text-center text-sm text-zinc-400">
              No matching parameters.
            </div>
          ) : (
            filteredRows.map((row) => {
              const statusMeta = STATUS_DISPLAY[row.severity];
              const isOpen = expandAll
                ? expandedRowIds[row.id] !== false
                : !!expandedRowIds[row.id];

              return (
                <article
                  key={row.id}
                  className="glass-3d-sub rounded-2xl overflow-hidden transition-colors hover:border-white/25"
                >
                  <button
                    type="button"
                    onClick={() => toggleRow(row.id)}
                    aria-expanded={isOpen}
                    className="w-full px-4 py-3.5 text-left flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-400">
                        <span className="text-zinc-200 font-semibold">{row.domainLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-zinc-300">{row.subSection}</span>
                        {row.standardCitation && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-zinc-300 font-medium">{row.standardCitation}</span>
                          </>
                        )}
                      </div>
                      <div className="text-base sm:text-lg font-semibold text-white">
                        {row.monitorTopic}
                      </div>
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap items-center gap-4 shrink-0">
                      <div className="text-left md:text-right">
                        <div className="text-base sm:text-lg font-bold tabular-nums text-white">
                          {row.currentReading}
                        </div>
                        <div className="text-xs text-zinc-400 tabular-nums">
                          Target: {row.baselineTarget}
                        </div>
                      </div>
                      <span className={`text-sm font-bold whitespace-nowrap ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-white shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="reveal-panel px-4 pb-4 pt-3 border-t border-white/10 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                        <span>
                          Alert Class: <strong className="text-zinc-200">{row.triggerClass}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div className="glass-3d-recessed rounded-xl p-3 space-y-1">
                          <div className="text-xs font-semibold text-white">Trigger</div>
                          <p className="text-zinc-300 leading-snug">{row.whenAppAlerts}</p>
                        </div>
                        <div className="glass-3d-recessed rounded-xl p-3 space-y-1">
                          <div className="text-xs font-semibold text-white">Meaning</div>
                          <p className="text-zinc-300 leading-snug">{row.whatAlertMayShow}</p>
                        </div>
                        <div className="glass-3d-recessed rounded-xl p-3 space-y-1">
                          <div className="text-xs font-semibold text-white">Action</div>
                          <p className="text-zinc-300 leading-snug">{row.whatAppDoes}</p>
                        </div>
                        <div className="glass-3d-recessed rounded-xl p-3 space-y-1">
                          <div className="text-xs font-semibold text-white">Cadence</div>
                          <p className="text-zinc-300 leading-snug">{row.dataSourceUpdate}</p>
                        </div>
                      </div>

                      {row.actionableSteps && (
                        <div className="glass-3d-recessed rounded-xl p-3.5 space-y-2">
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <ClipboardCheck className="h-4 w-4 text-zinc-300" />
                            Self-Care Steps
                          </div>
                          <ol className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-sm text-zinc-300">
                            {row.actionableSteps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="font-bold text-white tabular-nums">{i + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {(row.linkedSystemId || row.linkedTab) && (
                        <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                          {row.linkedTab && onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab(row.linkedTab!)}
                              className="text-sm font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                            >
                              Open Section <ArrowUpRight className="h-4 w-4" />
                            </button>
                          )}
                          {row.linkedSystemId && (
                            <>
                              <button
                                type="button"
                                onClick={() => onInspectOrgan(row.linkedSystemId!)}
                                className="text-sm font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                              >
                                Body HUD <ArrowUpRight className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenCheckIn(row.linkedSystemId)}
                                className="btn-mono-primary px-4 py-1.5 rounded-full text-sm font-semibold cursor-pointer"
                              >
                                Log Reading
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
    </section>
  );
};
